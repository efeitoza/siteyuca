import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GitCompareArrows } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFieldMappingSchema, type FieldMapping, type InsertFieldMapping } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function FieldMappings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const { toast } = useToast();

  const { data: mappings = [], isLoading } = useQuery<FieldMapping[]>({
    queryKey: ["/api/field-mappings"],
  });

  const form = useForm<InsertFieldMapping>({
    resolver: zodResolver(insertFieldMappingSchema),
    defaultValues: {
      entityType: "product",
      sourceField: "",
      targetField: "",
      mappingType: "direct",
      fixedValue: null,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFieldMapping) => {
      const res = await apiRequest("POST", "/api/field-mappings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-mappings"] });
      toast({
        title: "Mapeamento criado",
        description: "O mapeamento de campo foi criado com sucesso.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFieldMapping> }) => {
      const res = await apiRequest("PUT", `/api/field-mappings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-mappings"] });
      toast({
        title: "Mapeamento atualizado",
        description: "O mapeamento de campo foi atualizado com sucesso.",
      });
      setIsDialogOpen(false);
      setEditingMapping(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar mapeamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/field-mappings/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/field-mappings"] });
      toast({
        title: "Mapeamento excluído",
        description: "O mapeamento de campo foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir mapeamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertFieldMapping) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Generate name automatically from source and target fields
    const name = data.mappingType === "fixed" 
      ? `${data.entityType}_${data.targetField}_fixed`
      : `${data.entityType}_${data.sourceField}_to_${data.targetField}`;
    
    const mappingData = { ...data, name };
    console.log("Sending mapping data:", mappingData);
    
    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, data: mappingData });
    } else {
      createMutation.mutate(mappingData);
    }
  };

  const handleEdit = (mapping: FieldMapping) => {
    setEditingMapping(mapping);
    form.reset({
      entityType: mapping.entityType,
      sourceField: mapping.sourceField || undefined,
      targetField: mapping.targetField,
      mappingType: mapping.mappingType,
      fixedValue: mapping.fixedValue || undefined,
      isActive: mapping.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingMapping(null);
      form.reset();
    }
  };

  const filteredMappings = selectedTab === "all" 
    ? mappings 
    : mappings.filter(m => m.entityType === selectedTab);

  const mappingTypeLabels: Record<string, string> = {
    direct: "Direto",
    fixed: "Valor Fixo",
    multiply_100: "Multiplicar x100",
    multiply_1000: "Multiplicar x1000",
  };

  const entityTypeLabels: Record<string, string> = {
    product: "Produto",
    transaction: "Transação",
    payment: "Pagamento",
    validate: "Validação (Voucher)",
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GitCompareArrows className="h-8 w-8" />
              De-Para de Campos
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure o mapeamento entre campos do WebPosto e SwS API
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-mapping">
                <Plus className="h-4 w-4 mr-2" />
                Novo Mapeamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingMapping ? "Editar Mapeamento" : "Novo Mapeamento"}
                </DialogTitle>
                <DialogDescription>
                  Configure como os campos devem ser mapeados entre WebPosto e SwS
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                  console.log("Form validation errors:", errors);
                  toast({
                    title: "Erro de validação",
                    description: JSON.stringify(errors),
                    variant: "destructive",
                  });
                })} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="entityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Entidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">Produto</SelectItem>
                            <SelectItem value="transaction">Transação</SelectItem>
                            <SelectItem value="payment">Pagamento</SelectItem>
                            <SelectItem value="validate">Validação (Voucher)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mappingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Mapeamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mapping-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="direct">Direto (1:1)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo</SelectItem>
                            <SelectItem value="multiply_100">Multiplicar por 100</SelectItem>
                            <SelectItem value="multiply_1000">Multiplicar por 1000</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === "direct" && "Copia o valor diretamente"}
                          {field.value === "fixed" && "Define um valor fixo constante"}
                          {field.value === "multiply_100" && "Multiplica o valor por 100 (útil para converter moeda)"}
                          {field.value === "multiply_1000" && "Multiplica o valor por 1000 (útil para converter quantidade)"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("mappingType") !== "fixed" && (
                    <FormField
                      control={form.control}
                      name="sourceField"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campo de Origem (WebPosto)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="ex: nomeProduto"
                              data-testid="input-source-field"
                            />
                          </FormControl>
                          <FormDescription>
                            Nome do campo no JSON do WebPosto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch("mappingType") === "fixed" && (
                    <FormField
                      control={form.control}
                      name="fixedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Fixo</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""}
                              placeholder="ex: 643"
                              data-testid="input-fixed-value"
                            />
                          </FormControl>
                          <FormDescription>
                            Valor constante que será sempre enviado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="targetField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campo de Destino (SwS)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="ex: productName"
                            data-testid="input-target-field"
                          />
                        </FormControl>
                        <FormDescription>
                          Nome do campo no JSON do SwS API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Ativo</FormLabel>
                          <FormDescription>
                            Desative para ignorar este mapeamento temporariamente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-mapping"
                    >
                      {editingMapping ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">Todos</TabsTrigger>
            <TabsTrigger value="product" data-testid="tab-product">Produtos</TabsTrigger>
            <TabsTrigger value="transaction" data-testid="tab-transaction">Transações</TabsTrigger>
            <TabsTrigger value="payment" data-testid="tab-payment">Pagamentos</TabsTrigger>
            <TabsTrigger value="validate" data-testid="tab-validate">Validação</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Mapeamentos Configurados</CardTitle>
                <CardDescription>
                  {filteredMappings.length} mapeamento(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando mapeamentos...
                  </div>
                ) : filteredMappings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum mapeamento configurado ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Transformação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map((mapping) => (
                        <TableRow key={mapping.id} data-testid={`row-mapping-${mapping.id}`}>
                          <TableCell>
                            <Badge variant="outline">
                              {entityTypeLabels[mapping.entityType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {mapping.mappingType === "fixed" ? (
                              <span className="text-muted-foreground">FIXO</span>
                            ) : (
                              mapping.sourceField
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {mapping.targetField}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {mappingTypeLabels[mapping.mappingType]}
                            </Badge>
                            {mapping.fixedValue && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                = {mapping.fixedValue}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {mapping.isActive ? (
                              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(mapping)}
                                data-testid={`button-edit-${mapping.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(mapping.id)}
                                data-testid={`button-delete-${mapping.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
