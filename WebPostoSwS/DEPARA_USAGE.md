# Sistema De-Para (Field Mappings) - Guia de Uso

## Visão Geral

O sistema De-Para permite configurar a transformação de dados do formato WebPosto para o formato SwS API sem necessidade de alterar código. Todos os mapeamentos são configuráveis via interface web.

## Como Funciona

### 1. Formato de Entrada (WebPosto)

Exemplo de produto vindo do WebPosto:
```json
{
  "nomeProduto": "Picanha BT",
  "codigoProduto": "12345abc",
  "valorUnitario": 99.50,
  "quantidade": 1
}
```

### 2. Mapeamentos Configurados

Os seguintes mapeamentos transformam os dados:

| DE (WebPosto) | PARA (SwS) | Tipo | Descrição |
|---------------|------------|------|-----------|
| nomeProduto | name | direct | Copia o valor diretamente |
| codigoProduto | productId | direct | Copia o valor diretamente |
| codigoProduto | barcode | direct | Mesmo código usado para barcode |
| valorUnitario | price | multiply_100 | Converte R$99.50 para "9950" |
| quantidade | quantity | multiply_1000 | Converte 1 para "1000" |
| *(fixo)* | flag | fixed | Define valor fixo "" |
| *(fixo)* | currency | fixed | Define valor fixo "986" |

### 3. Formato de Saída (SwS API)

Resultado final após aplicar os mapeamentos:
```json
{
  "actionType": "4",
  "terminalID": "{{terminalID}}",
  "acquirerID": "{{acquirerID}}",
  "created": "2024-10-14T23:00:00.000Z",
  "clientID": "{{clientID}}",
  "rrn": "1697324400000",
  "totalAmount": "9950",
  "additionalData": {
    "products": [
      {
        "name": "Picanha BT",
        "productId": "12345abc",
        "price": "9950",
        "quantity": "1000",
        "barcode": "12345abc",
        "flag": ""
      }
    ],
    "totalPcost": "9950"
  },
  "currency": "986",
  "authCode": "ABC123"
}
```

## Tipos de Mapeamento

### 1. Direct (Direto)
Copia o valor sem transformação.
```json
{
  "sourceField": "nomeProduto",
  "targetField": "name",
  "mappingType": "direct"
}
```
Resultado: `"Picanha BT"` → `"Picanha BT"`

### 2. Fixed (Valor Fixo)
Define um valor constante, independente da entrada.
```json
{
  "targetField": "currency",
  "mappingType": "fixed",
  "fixedValue": "986"
}
```
Resultado: sempre `"986"`

### 3. Multiply_100 (Multiplicar por 100)
Usado para converter valores monetários em centavos.
```json
{
  "sourceField": "valorUnitario",
  "targetField": "price",
  "mappingType": "multiply_100"
}
```
Resultado: `99.50` → `"9950"`

### 4. Multiply_1000 (Multiplicar por 1000)
Usado para converter quantidades com 3 casas decimais.
```json
{
  "sourceField": "quantidade",
  "targetField": "quantity",
  "mappingType": "multiply_1000"
}
```
Resultado: `1.5` → `"1500"`

## Tipos de Entidade

### Product (Produto)
Mapeamentos aplicados a cada produto no array `products[]`:
- name
- productId
- price
- quantity
- barcode
- flag
- pCost
- markupDiscount
- tax
- group

### Transaction (Transação)
Mapeamentos aplicados ao nível raiz do JSON:
- currency
- actionType
- totalAmount
- authCode
- rrn

### Payment (Pagamento)
Mapeamentos aplicados a métodos de pagamento (futuro).

## Como Configurar

### Via Interface Web
1. Acesse `/field-mappings`
2. Clique em "+ Novo Mapeamento"
3. Preencha os campos:
   - **Tipo de Entidade**: product, transaction ou payment
   - **Campo DE** (origem): campo do WebPosto (vazio para mapeamentos fixos)
   - **Campo PARA** (destino): campo do SwS
   - **Tipo de Mapeamento**: direct, fixed, multiply_100 ou multiply_1000
   - **Valor Fixo**: apenas para tipo "fixed"
   - **Ativo**: marque para aplicar o mapeamento

### Via API
```bash
curl -X POST http://localhost:5000/api/field-mappings \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "product",
    "sourceField": "nomeProduto",
    "targetField": "name",
    "mappingType": "direct",
    "isActive": true
  }'
```

## Importante

1. **Todos os valores são convertidos para string** no JSON final, conforme especificação SwS
2. **Mapeamentos inativos** não são aplicados
3. **Ordem de aplicação**: produtos → transação → pagamento
4. **Fallback**: Se nenhum mapeamento está configurado, usa mapeamento padrão
5. **Valores nulos**: Se campo de origem não existe, usa `defaultValue` ou string vazia

## Exemplo Completo

### Entrada WebPosto
```json
{
  "codigoVenda": "VENDA001",
  "produtos": [
    {
      "nomeProduto": "Picanha BT",
      "codigoProduto": "12345abc",
      "valorUnitario": 99.50,
      "quantidade": 1
    }
  ]
}
```

### Mapeamentos Ativos
- product: name ← nomeProduto (direct)
- product: productId ← codigoProduto (direct)
- product: price ← valorUnitario (multiply_100)
- product: quantity ← quantidade (multiply_1000)
- product: flag ← "" (fixed)
- transaction: currency ← "986" (fixed)

### Saída SwS
```json
{
  "actionType": "4",
  "totalAmount": "9950",
  "additionalData": {
    "products": [
      {
        "name": "Picanha BT",
        "productId": "12345abc",
        "price": "9950",
        "quantity": "1000",
        "flag": ""
      }
    ]
  },
  "currency": "986"
}
```

## Troubleshooting

### Mapeamento não está sendo aplicado
- Verifique se o mapeamento está **ativo**
- Confirme que o **campo DE** existe nos dados de entrada
- Verifique o **tipo de entidade** (product, transaction, payment)

### Valor incorreto no JSON final
- Confirme o **tipo de mapeamento** (direct, fixed, multiply_100, multiply_1000)
- Para valores fixos, verifique o campo **fixedValue**
- Todos os valores são convertidos para string automaticamente

### JSON não corresponde ao formato SwS
- Verifique os **campos PARA** (targetField) nos mapeamentos
- Confira se todos os campos obrigatórios do SwS estão mapeados
- Use mapeamentos **fixed** para campos que sempre têm o mesmo valor
