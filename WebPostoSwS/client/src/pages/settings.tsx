import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Save, TestTube } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Configuration } from "@shared/schema";

const configurationSchema = z.object({
  name: z.string().default("default"),
  webpostoUsuario: z.string().min(1, "Usuário é obrigatório"),
  webpostoSenha: z.string().min(1, "Senha é obrigatória"),
  webpostoCodigoEmpresa: z.string().min(1, "Código da empresa é obrigatório"),
  swsHost: z.string().url("URL inválida").min(1, "Host é obrigatório"),
  swsTerminalId: z.string().min(1, "Terminal ID é obrigatório"),
  swsAcquirerId: z.string().min(1, "Acquirer ID é obrigatório"),
  swsClientId: z.string().min(1, "Client ID é obrigatório"),
  swsPassword: z.string().min(1, "Senha é obrigatória"),
  swsCurrency: z.string().default("643"),
  isActive: z.boolean().default(true),
});

type ConfigurationFormData = z.infer<typeof configurationSchema>;

export default function Settings() {
  const { toast } = useToast();
  
  const { data: config, isLoading } = useQuery<Configuration>({
    queryKey: ["/api/configuration"],
  });

  const form = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationSchema),
    defaultValues: {
      name: "default",
      webpostoUsuario: "",
      webpostoSenha: "",
      webpostoCodigoEmpresa: "",
      swsHost: "",
      swsTerminalId: "",
      swsAcquirerId: "",
      swsClientId: "",
      swsPassword: "",
      swsCurrency: "643",
      isActive: true,
    },
  });

  // Reset form when config data loads
  useEffect(() => {
    if (config) {
      form.reset({
        name: config.name,
        webpostoUsuario: config.webpostoUsuario || "",
        webpostoSenha: config.webpostoSenha || "",
        webpostoCodigoEmpresa: config.webpostoCodigoEmpresa || "",
        swsHost: config.swsHost || "",
        swsTerminalId: config.swsTerminalId || "",
        swsAcquirerId: config.swsAcquirerId || "",
        swsClientId: config.swsClientId || "",
        swsPassword: config.swsPassword || "",
        swsCurrency: config.swsCurrency || "643",
        isActive: config.isActive,
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ConfigurationFormData) => {
      return await apiRequest("POST", "/api/configuration", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
      toast({
        title: "Configuração salva",
        description: "As configurações foram atualizadas com sucesso.",
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

  const testConnectionMutation = useMutation({
    mutationFn: async (type: "webposto" | "sws") => {
      return await apiRequest("POST", `/api/configuration/test/${type}`, {});
    },
    onSuccess: (_, type) => {
      toast({
        title: "Conexão bem-sucedida",
        description: `A conexão com ${type === "webposto" ? "WebPosto" : "SwS"} foi testada com sucesso.`,
      });
    },
    onError: (error: Error, type) => {
      toast({
        title: "Falha na conexão",
        description: `Erro ao conectar com ${type === "webposto" ? "WebPosto" : "SwS"}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfigurationFormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded mb-8" />
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground" data-testid="text-settings-title">Configurações</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure as credenciais para WebPosto e API SwS
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Credenciais WebPosto</CardTitle>
                  <CardDescription>
                    Configurações para receber dados do WebPosto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="webpostoUsuario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="usuario_webposto"
                            {...field}
                            data-testid="input-webposto-usuario"
                          />
                        </FormControl>
                        <FormDescription>
                          Usuário fornecido pelo WebPosto para autenticação
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webpostoSenha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-webposto-senha"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webpostoCodigoEmpresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da Empresa (CNPJ)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="10.353.336/0001-91"
                            {...field}
                            data-testid="input-webposto-codigo-empresa"
                          />
                        </FormControl>
                        <FormDescription>
                          CNPJ com máscara (Ex: 10.353.336/0001-91)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => testConnectionMutation.mutate("webposto")}
                      disabled={testConnectionMutation.isPending}
                      data-testid="button-test-webposto"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testConnectionMutation.isPending ? "Testando..." : "Testar Conexão"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credenciais API SwS</CardTitle>
                  <CardDescription>
                    Configurações para enviar dados para a API SwS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="swsHost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://api.sws.com"
                            {...field}
                            data-testid="input-sws-host"
                          />
                        </FormControl>
                        <FormDescription>
                          URL base da API SwS
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="swsTerminalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terminal ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="TERM123"
                              {...field}
                              data-testid="input-sws-terminal-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="swsAcquirerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Acquirer ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ACQ456"
                              {...field}
                              data-testid="input-sws-acquirer-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="swsClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="CLIENT789"
                            {...field}
                            data-testid="input-sws-client-id"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="swsPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha (AID Password)</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-sws-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="swsCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código da Moeda</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="643"
                            {...field}
                            data-testid="input-sws-currency"
                          />
                        </FormControl>
                        <FormDescription>
                          Código ISO 4217 da moeda (643 = RUB)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => testConnectionMutation.mutate("sws")}
                      disabled={testConnectionMutation.isPending}
                      data-testid="button-test-sws"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testConnectionMutation.isPending ? "Testando..." : "Testar Conexão"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-4 border-t border-border">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending || !form.formState.isDirty}
                  data-testid="button-save-configuration"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
