import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Bell, Save, Clock, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationSettings, NotificationHistory } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const notificationSettingsSchema = z.object({
  webhookUrl: z.string().optional(),
  webhookEnabled: z.boolean().default(false),
  emailRecipients: z.string().optional(),
  emailEnabled: z.boolean().default(false),
  notifyOnRetryFailed: z.boolean().default(true),
  notifyOnSwsError: z.boolean().default(false),
  notifyOnWebpostoError: z.boolean().default(false),
}).refine((data) => {
  if (data.webhookEnabled && !data.webhookUrl) {
    return false;
  }
  return true;
}, {
  message: "Webhook URL é obrigatória quando webhook está habilitado",
  path: ["webhookUrl"],
}).refine((data) => {
  if (data.emailEnabled && !data.emailRecipients) {
    return false;
  }
  return true;
}, {
  message: "Destinatários são obrigatórios quando email está habilitado",
  path: ["emailRecipients"],
});

type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

export default function Notifications() {
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/notifications/settings"],
  });

  const { data: history } = useQuery<NotificationHistory[]>({
    queryKey: ["/api/notifications/history"],
  });

  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      webhookUrl: "",
      webhookEnabled: false,
      emailRecipients: "",
      emailEnabled: false,
      notifyOnRetryFailed: true,
      notifyOnSwsError: false,
      notifyOnWebpostoError: false,
    },
  });

  // Reset form when settings data loads
  useEffect(() => {
    if (settings) {
      form.reset({
        webhookUrl: settings.webhookUrl || "",
        webhookEnabled: settings.webhookEnabled || false,
        emailRecipients: settings.emailRecipients || "",
        emailEnabled: settings.emailEnabled || false,
        notifyOnRetryFailed: settings.notifyOnRetryFailed ?? true,
        notifyOnSwsError: settings.notifyOnSwsError || false,
        notifyOnWebpostoError: settings.notifyOnWebpostoError || false,
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: NotificationSettingsFormData) => {
      return await apiRequest("POST", "/api/notifications/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/settings"] });
      toast({
        title: "Configuração salva",
        description: "As configurações de notificação foram atualizadas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationSettingsFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-5xl">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded mb-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Notificações</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Configure alertas para falhas críticas de integração
        </p>

        <div className="grid gap-6">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificação</CardTitle>
              <CardDescription>
                Configure como e quando você deseja receber alertas sobre problemas de integração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Webhook Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Webhook</h3>
                        <p className="text-sm text-muted-foreground">
                          Envie notificações HTTP POST para um endpoint
                        </p>
                      </div>
                      <FormField
                        control={form.control}
                        name="webhookEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-webhook-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Webhook</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://exemplo.com/webhook"
                              disabled={!form.watch("webhookEnabled")}
                              data-testid="input-webhook-url"
                            />
                          </FormControl>
                          <FormDescription>
                            Notificações serão enviadas via POST com JSON
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Email Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="text-sm text-muted-foreground">
                          Envie notificações por email
                        </p>
                      </div>
                      <FormField
                        control={form.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="emailRecipients"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destinatários</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="email1@exemplo.com, email2@exemplo.com"
                              disabled={!form.watch("emailEnabled")}
                              data-testid="input-email-recipients"
                            />
                          </FormControl>
                          <FormDescription>
                            Separe múltiplos emails com vírgula
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Event Types */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Eventos para Notificar</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Selecione quais tipos de eventos devem gerar notificações
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="notifyOnRetryFailed"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Falha de Retry</FormLabel>
                            <FormDescription>
                              Notificar quando uma transação falha após 3 tentativas
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-notify-retry-failed"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifyOnSwsError"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Erro SwS</FormLabel>
                            <FormDescription>
                              Notificar imediatamente em erros da API SwS
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-notify-sws-error"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifyOnWebpostoError"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Erro WebPosto</FormLabel>
                            <FormDescription>
                              Notificar em erros de integração com WebPosto
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-notify-webposto-error"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending || !form.formState.isDirty}
                      data-testid="button-save-notifications"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Notificações</CardTitle>
              <CardDescription>
                Últimas notificações enviadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação enviada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-4 rounded-lg border hover-elevate"
                      data-testid={`notification-history-${item.id}`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {item.status === "sent" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs" data-testid={`badge-type-${item.type}`}>
                            {item.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-event-${item.event}`}>
                            {item.event}
                          </Badge>
                          <Badge 
                            variant={item.status === "sent" ? "default" : "destructive"}
                            className="text-xs"
                            data-testid={`badge-status-${item.status}`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1" data-testid="text-notification-message">
                          {item.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm:ss")}
                          </span>
                          <span>→ {item.recipient}</span>
                        </div>
                        {item.errorMessage && (
                          <p className="text-xs text-destructive mt-2">
                            Erro: {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
