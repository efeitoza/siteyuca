import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Send, CheckCircle2, ArrowRight, ArrowRightLeft, GitBranch, ArrowDownToLine, ArrowUpFromLine, DollarSign, Info, AlertTriangle } from "lucide-react";

// Gera código de venda único para cada sessão
const getUniqueCodigoVenda = () => Math.floor(Math.random() * 900000 + 100000).toString();
const getTimestamp = () => new Date();

const createAuthExample = (config: any) => ({
  usuario: config?.webpostoUsuario || "demo_user",
  senha: config?.webpostoSenha || "demo123",
  codigoEmpresa: config?.webpostoCodigoEmpresa || "123456"
});

const createValidateExample = (config: any) => {
  const codigoVenda = getUniqueCodigoVenda();
  const now = getTimestamp();
  return {
    codigoEmpresa: config?.webpostoCodigoEmpresa || "123456",
    codigoVoucher: config?.swsClientId || "0Eed2992081af78066bd2e4f8026cf32c4124de1ca",
    horaVenda: now.toTimeString().slice(0, 8),
    dataVenda: now.toISOString().slice(0, 10),
    codigoVenda,
    produtos: [
      {
        codigoSequencia: 1,
        codigoColaborador: 2,
        nomeColaborador: "ANTONIO CARLOS ",
        codigoProduto: "00001",
        valorVenda: 50,
        quantidade: 10.225,
        valorUnitario: 4.89,
        nomeProduto: "GASOLINA COMUM"
      }
    ]
  };
};

const createSendExample = (config: any, codigoVenda: string) => ({
  codigoEmpresa: config?.webpostoCodigoEmpresa || "123456",
  codigoVenda,
  idTransacao: "19640141",
  produtos: [
    {
      codigoSequencia: 1,
      codigoColaborador: 2,
      nomeColaborador: "ANTONIO CARLOS ",
      codigoProduto: "00001",
      valorVenda: 50,
      quantidade: 10.225,
      valorUnitario: 4.89,
      nomeProduto: "GASOLINA COMUM"
    }
  ],
  prazos: [
    {
      descricaoFormaPagamento: "DINHEIRO",
      tipoPagamento: 1,
      idFormaPagamentoAC: "001",
      valorPagamento: 38.5,
      idTransacao: ""
    }
  ]
});

export default function PDVSimulator() {
  // Fetch configuration from settings
  const { data: config } = useQuery({
    queryKey: ['/api/configuration'],
  });

  // Step 1: Auth
  const [authJson, setAuthJson] = useState("");
  const [authResponse, setAuthResponse] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [bearerToken, setBearerToken] = useState("");

  // Step 2: Validate
  const [validateJson, setValidateJson] = useState("");
  const [validateResponse, setValidateResponse] = useState("");
  const [validateLoading, setValidateLoading] = useState(false);
  const [idTransacao, setIdTransacao] = useState("");
  const [swsValidateRequest, setSwsValidateRequest] = useState<any>(null);
  const [swsValidateResponse, setSwsValidateResponse] = useState<any>(null);

  // Step 3: Send
  const [sendJson, setSendJson] = useState("");
  const [sendResponse, setSendResponse] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [transformedJson, setTransformedJson] = useState("");
  const [swsSendRequest, setSwsSendRequest] = useState<any>(null);
  const [swsSendResponse, setSwsSendResponse] = useState<any>(null);

  const { toast } = useToast();

  // Update examples when configuration loads
  useEffect(() => {
    if (config) {
      // Update auth example
      const authExample = createAuthExample(config);
      setAuthJson(JSON.stringify(authExample, null, 2));

      // Update validate example
      const validateExample = createValidateExample(config);
      setValidateJson(JSON.stringify(validateExample, null, 2));

      // Update send example
      const sendExample = createSendExample(config, validateExample.codigoVenda);
      setSendJson(JSON.stringify(sendExample, null, 2));
    }
  }, [config]);

  const handleAuth = async () => {
    try {
      setAuthLoading(true);
      setAuthResponse("");
      
      const data = JSON.parse(authJson);
      
      const res = await fetch('/api/webposto/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      setAuthResponse(JSON.stringify(result, null, 2));

      if (res.ok && result.bearerToken) {
        setBearerToken(result.bearerToken);
        toast({
          title: "Autenticação bem-sucedida!",
          description: "Token obtido com sucesso",
        });
      } else {
        toast({
          title: "Erro na autenticação",
          description: result.message || "Verifique as credenciais",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setAuthResponse(`Erro: ${error.message}`);
      toast({
        title: "Erro",
        description: error.message || "JSON inválido",
        variant: "destructive",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!bearerToken) {
      toast({
        title: "Token não encontrado",
        description: "Execute o Passo 1 primeiro para obter o token",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidateLoading(true);
      setValidateResponse("");
      
      const data = JSON.parse(validateJson);
      
      const res = await fetch('/api/webposto/venda/validar?debug=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      setValidateResponse(JSON.stringify(result, null, 2));

      // Armazenar request/response SwS separadamente se existir
      if (result.swsRequest) {
        setSwsValidateRequest(result.swsRequest);
      }
      if (result.swsResponse) {
        setSwsValidateResponse(result.swsResponse);
      }

      if (res.ok && result.idTransacao) {
        setIdTransacao(result.idTransacao);
        
        // Atualizar automaticamente o JSON do passo 3
        const currentSendData = JSON.parse(sendJson);
        currentSendData.idTransacao = result.idTransacao;
        setSendJson(JSON.stringify(currentSendData, null, 2));
        
        toast({
          title: "Validação bem-sucedida!",
          description: "ID da transação obtido com sucesso",
        });
      } else {
        toast({
          title: "Erro na validação",
          description: result.message || "Ocorreu um erro ao validar",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setValidateResponse(`Erro: ${error.message}`);
      toast({
        title: "Erro",
        description: error.message || "JSON inválido",
        variant: "destructive",
      });
    } finally {
      setValidateLoading(false);
    }
  };

  const handlePreviewTransform = async () => {
    try {
      const data = JSON.parse(sendJson);
      
      const res = await fetch('/api/transform-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta não é JSON");
      }

      const result = await res.json();
      setTransformedJson(JSON.stringify(result, null, 2));

      toast({
        title: "Transformação gerada!",
        description: "Veja o JSON transformado com os mapeamentos De-Para",
      });
    } catch (error: any) {
      console.error("Transform preview error:", error);
      toast({
        title: "Erro ao transformar",
        description: error.message || "JSON inválido",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!bearerToken) {
      toast({
        title: "Token não encontrado",
        description: "Execute o Passo 1 primeiro para obter o token",
        variant: "destructive",
      });
      return;
    }

    if (!idTransacao) {
      toast({
        title: "ID da transação não encontrado",
        description: "Execute o Passo 2 primeiro para validar a venda",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendLoading(true);
      setSendResponse("");
      
      const data = JSON.parse(sendJson);
      
      // IMPORTANTE: Sempre usar o idTransacao da validação (passo 2)
      data.idTransacao = idTransacao;
      
      const res = await fetch('/api/webposto/venda/enviar?debug=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`
        },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      setSendResponse(JSON.stringify(result, null, 2));

      // Armazenar request/response SwS separadamente se existir
      if (result.swsRequest) {
        setSwsSendRequest(result.swsRequest);
      }
      if (result.swsResponse) {
        setSwsSendResponse(result.swsResponse);
      }

      if (res.ok) {
        toast({
          title: "Venda enviada com sucesso!",
          description: "A transação foi processada pelo SwS",
        });
      } else {
        toast({
          title: "Erro ao enviar venda",
          description: result.message || "Ocorreu um erro ao processar a venda",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setSendResponse(`Erro: ${error.message}`);
      toast({
        title: "Erro",
        description: error.message || "JSON inválido",
        variant: "destructive",
      });
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground" data-testid="text-pdv-title">
          Simulador PDV - Fluxo Completo
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Teste o fluxo completo de integração WebPosto em 3 passos
        </p>
      </div>

      {/* Configuration Status */}
      {config && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Configuração carregada de /settings
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Usuário: <span className="font-mono">{(config as any).webpostoUsuario}</span> | 
                  Empresa: <span className="font-mono">{(config as any).webpostoCodigoEmpresa}</span> | 
                  Voucher: <span className="font-mono">{(config as any).swsClientId?.substring(0, 20)}...</span>
                </p>
                <a href="/settings" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Alterar configurações →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passo 1: Autenticação */}
      <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div className="flex-1">
                <CardTitle>Autenticação WebPosto</CardTitle>
                <CardDescription>Configure as credenciais em /settings antes de testar</CardDescription>
              </div>
              {bearerToken && <CheckCircle2 className="h-5 w-5 text-chart-2" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">JSON de Entrada</label>
                <Textarea
                  value={authJson}
                  onChange={(e) => setAuthJson(e.target.value)}
                  className="font-mono text-sm min-h-[150px]"
                  data-testid="textarea-auth-json"
                />
                <Button
                  onClick={handleAuth}
                  disabled={authLoading}
                  className="w-full"
                  data-testid="button-auth"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {authLoading ? "Autenticando..." : "1. Autenticar"}
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Resposta</label>
                {authResponse ? (
                  <pre className="bg-muted p-3 rounded-md overflow-auto text-sm font-mono min-h-[150px] max-h-[150px]" data-testid="text-auth-response">
                    {authResponse}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center min-h-[150px] border-2 border-dashed border-border rounded-md">
                    <p className="text-sm text-muted-foreground">Aguardando resposta...</p>
                  </div>
                )}
              </div>
            </div>
            {bearerToken && (
              <div className="p-3 bg-chart-2/10 border border-chart-2/20 rounded-md">
                <p className="text-sm text-foreground">
                  <strong>Token obtido:</strong> <code className="text-xs bg-background px-1 py-0.5 rounded">{bearerToken.substring(0, 30)}...</code>
                </p>
              </div>
            )}
          </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Passo 2: Validação */}
      <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div className="flex-1">
                <CardTitle>Validar Voucher</CardTitle>
                <CardDescription>Valida a venda e retorna o ID da transação</CardDescription>
              </div>
              {idTransacao && <CheckCircle2 className="h-5 w-5 text-chart-2" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">JSON de Entrada</label>
                <Textarea
                  value={validateJson}
                  onChange={(e) => setValidateJson(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                  data-testid="textarea-validate-json"
                />
                <Button
                  onClick={handleValidate}
                  disabled={validateLoading || !bearerToken}
                  className="w-full"
                  data-testid="button-validate"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {validateLoading ? "Validando..." : "2. Validar Voucher"}
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Resposta</label>
                {validateResponse ? (
                  <pre className="bg-muted p-3 rounded-md overflow-auto text-sm font-mono min-h-[200px] max-h-[200px]" data-testid="text-validate-response">
                    {validateResponse}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center min-h-[200px] border-2 border-dashed border-border rounded-md">
                    <p className="text-sm text-muted-foreground">Aguardando resposta...</p>
                  </div>
                )}
              </div>
            </div>
            {idTransacao && (
              <div className="p-3 bg-chart-2/10 border border-chart-2/20 rounded-md">
                <p className="text-sm text-foreground">
                  <strong>ID Transação:</strong> <code className="text-xs bg-background px-1 py-0.5 rounded">{idTransacao}</code>
                </p>
              </div>
            )}

            {/* Visualização Didática do Fluxo Completo - Passo 2 */}
            {validateResponse && (
              <div className="border-t pt-6 mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Fluxo Completo - Passo 2 (Validar Voucher)
                </h3>
                
                <div className="grid gap-4">
                  {/* 1. JSON vindo do PDV */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        1. PDV → FlowBridge
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON recebido do PDV</h4>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                      <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-pdv-validate-input">
                        {validateJson}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 2. JSON enviado para SwS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowUpFromLine className="h-3 w-3" />
                        2. FlowBridge → SwS
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON enviado para SwitchSales</h4>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4 rounded-md">
                      {swsValidateRequest ? (
                        <pre className="text-xs font-mono overflow-auto max-h-[250px]" data-testid="text-sws-validate-request">
                          {JSON.stringify(swsValidateRequest, null, 2)}
                        </pre>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertTriangle className="h-4 w-4" />
                          <p>Request não disponível - ative modo debug e configure credenciais SwS válidas</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 3. Resposta da SwS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`${!swsValidateResponse || (swsValidateResponse as any)?.error ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1`}>
                        <ArrowDownToLine className="h-3 w-3" />
                        3. SwS → FlowBridge
                      </span>
                      <h4 className="text-sm font-medium text-foreground">Resposta da SwitchSales</h4>
                    </div>
                    {swsValidateResponse ? (
                      <div className={`${(swsValidateResponse as any)?.error ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'} border p-4 rounded-md`}>
                        {(swsValidateResponse as any)?.error ? (
                          <>
                            <div className="flex items-start gap-2 mb-3">
                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Erro na chamada SwS</p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{(swsValidateResponse as any).errorMessage}</p>
                                <p className="text-xs text-muted-foreground mt-2">{(swsValidateResponse as any).errorDetails}</p>
                              </div>
                            </div>
                            <pre className="text-xs font-mono overflow-auto max-h-[150px] bg-background/50 p-2 rounded" data-testid="text-sws-validate-response">
                              {JSON.stringify(swsValidateResponse, null, 2)}
                            </pre>
                          </>
                        ) : (
                          <>
                            <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-sws-validate-response">
                              {JSON.stringify(swsValidateResponse, null, 2)}
                            </pre>
                            {/* Destacar saldo se existir */}
                            {(swsValidateResponse as any).additionalData?.balance !== undefined && (
                              <div className="mt-3 p-2 bg-chart-2/10 border border-chart-2/20 rounded-md">
                                <p className="text-sm text-foreground flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  <strong>Saldo/Desconto:</strong> <code className="text-xs bg-background px-1 py-0.5 rounded">{(swsValidateResponse as any).additionalData.balance}</code>
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          SwS não respondeu ou ocorreu erro na comunicação
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 4. JSON enviado ao PDV */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowUpFromLine className="h-3 w-3" />
                        4. FlowBridge → PDV
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON enviado ao PDV</h4>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-md">
                      <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-pdv-validate-output">
                        {(() => {
                          try {
                            const parsed = JSON.parse(validateResponse);
                            // Mostrar apenas os campos que o PDV realmente recebe (sem swsRequest/swsResponse)
                            const pdvResponse = {
                              idTransacao: parsed.idTransacao,
                              tipoCodigo: parsed.tipoCodigo,
                              valorCashBack: parsed.valorCashBack,
                              produtos: parsed.produtos,
                              tipoPagamento: parsed.tipoPagamento
                            };
                            return JSON.stringify(pdvResponse, null, 2);
                          } catch {
                            return validateResponse;
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
      </Card>

      <div className="flex justify-center">
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Passo 3: Envio */}
      <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div className="flex-1">
                <CardTitle>Enviar Venda para SwS</CardTitle>
                <CardDescription>Processa a venda no sistema SwS</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">JSON de Entrada</label>
                <Textarea
                  value={sendJson}
                  onChange={(e) => setSendJson(e.target.value)}
                  className="font-mono text-sm min-h-[250px]"
                  data-testid="textarea-send-json"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviewTransform}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-preview-transform"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Ver Transformação De-Para
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sendLoading || !bearerToken || !idTransacao}
                    className="flex-1"
                    data-testid="button-send"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendLoading ? "Enviando..." : "3. Enviar para SwS"}
                  </Button>
                </div>
                {idTransacao && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      O campo <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">idTransacao</code> será automaticamente definido como <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">{idTransacao}</code> do Passo 2
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Resposta</label>
                {sendResponse ? (
                  <pre className="bg-muted p-3 rounded-md overflow-auto text-sm font-mono min-h-[250px] max-h-[250px]" data-testid="text-send-response">
                    {sendResponse}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center min-h-[250px] border-2 border-dashed border-border rounded-md">
                    <p className="text-sm text-muted-foreground">Aguardando resposta...</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Visualização Didática do Fluxo Completo - Passo 3 */}
            {swsSendRequest && (
              <div className="border-t pt-6 mt-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Fluxo Completo - Passo 3 (Enviar Venda)
                </h3>
                
                <div className="grid gap-4">
                  {/* 1. JSON vindo do PDV */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        1. PDV → FlowBridge
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON recebido do PDV</h4>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-md">
                      <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-pdv-send-input">
                        {sendJson}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 2. JSON enviado para SwS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowUpFromLine className="h-3 w-3" />
                        2. FlowBridge → SwS
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON enviado para SwitchSales</h4>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4 rounded-md">
                      <pre className="text-xs font-mono overflow-auto max-h-[250px]" data-testid="text-sws-send-request">
                        {JSON.stringify(swsSendRequest, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 3. Resposta da SwS */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        3. SwS → FlowBridge
                      </span>
                      <h4 className="text-sm font-medium text-foreground">Resposta da SwitchSales</h4>
                    </div>
                    {swsSendResponse ? (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-md">
                        <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-sws-send-response">
                          {JSON.stringify(swsSendResponse, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-md">
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          SwS não respondeu ou ocorreu erro na comunicação
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* 4. JSON enviado ao PDV */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <ArrowUpFromLine className="h-3 w-3" />
                        4. FlowBridge → PDV
                      </span>
                      <h4 className="text-sm font-medium text-foreground">JSON enviado ao PDV</h4>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-md">
                      <pre className="text-xs font-mono overflow-auto max-h-[200px]" data-testid="text-pdv-send-output">
                        {(() => {
                          try {
                            const parsed = JSON.parse(sendResponse);
                            // Mostrar apenas os 3 campos que o PDV realmente recebe
                            const pdvResponse = {
                              codigoEmpresa: parsed.codigoEmpresa,
                              codigoVenda: parsed.codigoVenda,
                              idTransacao: parsed.idTransacao
                            };
                            return JSON.stringify(pdvResponse, null, 2);
                          } catch {
                            return sendResponse;
                          }
                        })()}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Visualização da Transformação */}
            {transformedJson && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <span className="bg-chart-2 text-white px-2 py-1 rounded text-xs">SwS API</span>
                    JSON que será enviado para o SwS
                  </h3>
                  <div className="bg-chart-2/10 border border-chart-2/30 p-4 rounded-md">
                    <pre className="text-xs font-mono overflow-auto max-h-[300px]">
                      {(() => {
                        try {
                          const parsed = JSON.parse(transformedJson);
                          return JSON.stringify(parsed.transformed, null, 2);
                        } catch {
                          return transformedJson;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
                
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <GitBranch className="h-3 w-3" />
                    Ver mapeamentos aplicados
                  </summary>
                  <div className="mt-2 bg-muted/30 p-3 rounded-md">
                    <pre className="text-xs font-mono overflow-auto max-h-[200px]">
                      {(() => {
                        try {
                          const parsed = JSON.parse(transformedJson);
                          return JSON.stringify({
                            productMappings: parsed.productMappings,
                            transactionMappings: parsed.transactionMappings
                          }, null, 2);
                        } catch {
                          return "Erro ao processar mapeamentos";
                        }
                      })()}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
      </Card>

      {/* Informações */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <p className="text-sm text-foreground font-medium">Configure as credenciais</p>
                  <p className="text-sm text-muted-foreground">Vá em /settings e configure WebPosto e SwS antes de testar</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <p className="text-sm text-foreground font-medium">Execute os passos em ordem</p>
                  <p className="text-sm text-muted-foreground">Autentique primeiro, depois valide, e por fim envie a venda</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div>
                  <p className="text-sm text-foreground font-medium">O fluxo é automático</p>
                  <p className="text-sm text-muted-foreground">O token e ID da transação são passados automaticamente entre os passos</p>
                </div>
              </div>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
