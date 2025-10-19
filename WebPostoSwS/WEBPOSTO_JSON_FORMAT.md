# Formato JSON WebPosto

## Exemplo Completo

```json
{
  "codigoEmpresa": "10.333.333/0001-00",
  "codigoVenda": "6978",
  "idTransacao": "19640141",
  "produtos": [
    {
      "codigoSequencia": 1,
      "codigoColaborador": 2,
      "nomeColaborador": "ANTONIO CARLOS ",
      "codigoProduto": "00001",
      "valorVenda": 50,
      "quantidade": 10.225,
      "valorUnitario": 4.89,
      "nomeProduto": "GASOLINA COMUM"
    }
  ],
  "prazos": [
    {
      "descricaoFormaPagamento": "DINHEIRO",
      "tipoPagamento": 1,
      "idFormaPagamentoAC": "001",
      "valorPagamento": 38.5,
      "idTransacao": ""
    }
  ]
}
```

## Campos Disponíveis

### Nível Raiz (Transação)
- `codigoEmpresa`: CNPJ da empresa (string)
- `codigoVenda`: Código único da venda (string)
- `idTransacao`: ID da transação (string)

### Produtos (Array)
- `codigoSequencia`: Número sequencial do item (number)
- `codigoColaborador`: ID do colaborador (number)
- `nomeColaborador`: Nome do colaborador (string)
- `codigoProduto`: Código do produto (string)
- `valorVenda`: Valor total da linha (number)
- `quantidade`: Quantidade (pode ser decimal, ex: 10.225)
- `valorUnitario`: Valor por unidade (number)
- `nomeProduto`: Nome do produto (string)

### Prazos/Pagamentos (Array)
- `descricaoFormaPagamento`: Nome da forma de pagamento (string)
- `tipoPagamento`: Tipo numérico de pagamento (number)
- `idFormaPagamentoAC`: ID da forma de pagamento (string)
- `valorPagamento`: Valor pago (number)
- `idTransacao`: ID da transação do pagamento (string, pode ser vazio)

## Transformação para SwS

O sistema De-Para transforma este JSON WebPosto no formato esperado pela API SwS:

```json
{
  "actionType": "4",
  "terminalID": "barto02",
  "acquirerID": "Colibri",
  "created": "2025-10-14T23:24:31.382Z",
  "clientID": "0Eed2992081af78066bd2e4f8026cf32c4124de1ca",
  "rrn": "1760484271382",
  "totalAmount": "5000",
  "additionalData": {
    "products": [
      {
        "name": "GASOLINA COMUM",
        "productId": "00001",
        "pCost": "4890",
        "price": "489",
        "quantity": "10225",
        "markupDiscount": "0",
        "tax": "0",
        "barcode": "00001",
        "group": "combustivel",
        "flag": ""
      }
    ],
    "totalPcost": "5000"
  },
  "currency": "986",
  "authCode": "ABC123"
}
```

## Mapeamentos Sugeridos

### Produtos
| Campo WebPosto | Campo SwS | Tipo | Observação |
|----------------|-----------|------|------------|
| nomeProduto | name | direct | Nome do produto |
| codigoProduto | productId | direct | ID do produto |
| codigoProduto | barcode | direct | Código de barras |
| valorUnitario | price | multiply_100 | R$4.89 → "489" |
| valorUnitario | pCost | multiply_100 | Custo = preço |
| quantidade | quantity | multiply_1000 | 10.225 → "10225" |
| - | flag | fixed: "" | Campo vazio |
| - | tax | fixed: "0" | Sem imposto |
| - | markupDiscount | fixed: "0" | Sem desconto |
| - | group | fixed: "default" | Grupo padrão |

### Transação
| Campo WebPosto | Campo SwS | Tipo | Observação |
|----------------|-----------|------|------------|
| - | currency | fixed: "986" | Moeda BRL |
| - | actionType | fixed: "4" | Tipo de ação |

## Notas Importantes

1. **Valores Numéricos como String**: SwS API exige todos os valores como strings
2. **Multiplicação por 100**: Valores monetários são multiplicados por 100 (R$4.89 → "489")
3. **Multiplicação por 1000**: Quantidades são multiplicadas por 1000 (10.225 → "10225")
4. **Campos Calculados**: `totalAmount` e `totalPcost` são calculados automaticamente
5. **Campos Dinâmicos**: `rrn`, `created`, `authCode` são gerados pelo sistema
