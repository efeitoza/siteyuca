# Fluxo de Validação de Voucher

## Visão Geral

O fluxo de validação de voucher conecta o PDV WebPosto com a API SwS para validar o voucher do cliente e obter o saldo/desconto disponível.

## Fluxo Completo

### 1. PDV Envia Validação
```json
{
  "codigoEmpresa": "10.333.333/0001-00",
  "codigoVoucher": "VOUCHER123",
  "horaVenda": "14:30:00",
  "dataVenda": "2024-10-14",
  "codigoVenda": "6978",
  "idTransacao": "19640141",
  "produtos": [
    {
      "codigoSequencia": 1,
      "codigoColaborador": 2,
      "nomeColaborador": "ANTONIO CARLOS",
      "codigoProduto": "00001",
      "valorVenda": 50,
      "quantidade": 10.225,
      "valorUnitario": 4.89,
      "nomeProduto": "GASOLINA COMUM"
    }
  ]
}
```

### 2. Sistema Transforma para SwS (usando De-Para)
```json
{
  "actionType": "3",
  "terminalID": "barto02",
  "acquirerID": "Colibri",
  "created": "2025-10-14T23:47:00.000Z",
  "clientID": "0Eed2992081af78066bd2e4f8026cf32c4124de1ca"
}
```

**Mapeamentos De-Para aplicados:**
- `actionType`: Valor fixo "3" (validação de voucher)
- `terminalID`: Da configuração SwS
- `acquirerID`: Da configuração SwS
- `created`: Timestamp gerado automaticamente
- `clientID`: Da configuração SwS

### 3. SwS API Responde
```json
{
  "resultCode": "00",
  "toPrint": "--------------------------------\nSWITCHSALES\n14.10.2025                 20:47\nTERMINAL                 BARTO02\n\nOPERATION TYPE      ACCOUNTSTATE\n\nBALANCE 0\n\n",
  "additionalData": {
    "clientId": {
      "dlsId": 0,
      "isPersonalized": true
    },
    "balance": "0"
  }
}
```

**Campo importante:**
- `additionalData.balance`: Saldo/desconto do cliente (em string)

### 4. Sistema Retorna ao PDV
```json
{
  "idTransacao": "19640141",
  "tipoCodigo": "P",
  "valorCashBack": 0,
  "produtos": [...],
  "tipoPagamento": [0]
}
```

**Campos:**
- `idTransacao`: ID da transação (do WebPosto ou gerado)
- `tipoCodigo`: "P" (acúmulo de pontos)
- `valorCashBack`: Balance do SwS convertido para número
- `produtos`: Lista de produtos da validação
- `tipoPagamento`: [0] aceita todos os tipos

## Configuração De-Para

### Mapeamento para Validação

Para configurar o De-Para da validação, acesse `/field-mappings` e crie:

**Tipo de Entidade:** Validação (Voucher)

| Campo Destino (SwS) | Tipo | Valor |
|---------------------|------|-------|
| actionType | Fixo | "3" |

Os demais campos (`terminalID`, `acquirerID`, `clientID`, `created`) são preenchidos automaticamente da configuração SwS.

## Endpoint API

### POST `/api/webposto/venda/validar`

**Request Body:**
```json
{
  "codigoEmpresa": "string",
  "codigoVoucher": "string",
  "horaVenda": "string",
  "dataVenda": "string",
  "codigoVenda": "string",
  "idTransacao": "string (opcional)",
  "produtos": [...]
}
```

**Response:**
```json
{
  "idTransacao": "string",
  "tipoCodigo": "string",
  "valorCashBack": number,
  "produtos": [...],
  "tipoPagamento": [number]
}
```

## Comportamento

1. **Cria transação** no banco de dados com status "validated"
2. **Gera/usa idTransacao**: Usa o idTransacao do WebPosto se vier, senão gera um novo
3. **Chama SwS API** com actionType: "3" para validar voucher
4. **Extrai balance** da resposta SwS
5. **Retorna valorCashBack** ao PDV com o balance como desconto

## Tratamento de Erros

- Se SwS falhar, continua a validação mas com `valorCashBack: 0`
- Erros são logados no sistema de logs
- PDV sempre recebe uma resposta válida

## Logs

Todos os eventos são registrados:
- Recebimento da validação do PDV
- Transformação De-Para aplicada
- Chamada à SwS API
- Resposta da SwS
- Retorno ao PDV

## Próximos Passos

Após a validação bem-sucedida, o PDV deve:
1. Exibir o desconto (`valorCashBack`) ao operador
2. Processar o pagamento
3. Enviar a confirmação da venda via `/api/webposto/venda/enviar`
