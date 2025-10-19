#!/bin/bash

# Script de teste para endpoints WebPosto
BASE_URL="http://localhost:5000"

echo "=== Testando Integração WebPosto-SwS ==="
echo ""

# 1. Autenticação
echo "1. Testando autenticação..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webposto/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "usuario_teste",
    "senha": "senha_teste",
    "codigoEmpresa": "123456"
  }')

echo "Resposta: $AUTH_RESPONSE"
BEARER_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"bearerToken":"[^"]*"' | cut -d'"' -f4)
echo "Token obtido: $BEARER_TOKEN"
echo ""

# 2. Validar voucher
echo "2. Validando voucher..."
VALIDATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webposto/venda/validar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d '{
    "codigoEmpresa": "123456",
    "codigoVoucher": "VOUCHER123",
    "horaVenda": "14:30:00",
    "dataVenda": "2024-10-14",
    "codigoVenda": "VENDA001",
    "produtos": [
      {
        "codigoSequencia": 1,
        "codigoColaborador": "COL001",
        "nomeColaborador": "João Silva",
        "codigoProduto": "PROD001",
        "nomeProduto": "Produto Teste",
        "valorVenda": 100.00,
        "quantidade": 2,
        "valorUnitario": 50.00
      }
    ]
  }')

echo "Resposta: $VALIDATE_RESPONSE"
ID_TRANSACAO=$(echo $VALIDATE_RESPONSE | grep -o '"idTransacao":"[^"]*"' | cut -d'"' -f4)
echo "ID Transação: $ID_TRANSACAO"
echo ""

# 3. Enviar venda
echo "3. Enviando venda para SwS..."
SEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/webposto/venda/enviar" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -d "{
    \"codigoEmpresa\": \"123456\",
    \"codigoVenda\": \"VENDA001\",
    \"idTransacao\": \"$ID_TRANSACAO\",
    \"produtos\": [
      {
        \"codigoSequencia\": 1,
        \"codigoColaborador\": \"COL001\",
        \"nomeColaborador\": \"João Silva\",
        \"codigoProduto\": \"PROD001\",
        \"nomeProduto\": \"Produto Teste\",
        \"valorVenda\": 100.00,
        \"quantidade\": 2,
        \"valorUnitario\": 50.00
      }
    ],
    \"prazos\": [
      {
        \"descricaoFormaPagamento\": \"Dinheiro\",
        \"tipoPagamento\": 1,
        \"valorPagamento\": 100.00,
        \"idFormaPagamentoAC\": \"FP001\"
      }
    ]
  }")

echo "Resposta: $SEND_RESPONSE"
echo ""

# 4. Testar analytics
echo "4. Testando endpoints de analytics..."
echo "   - Dashboard stats:"
curl -s "$BASE_URL/api/dashboard/stats" | head -c 200
echo ""
echo ""
echo "   - Taxa de sucesso:"
curl -s "$BASE_URL/api/analytics/success-rate?days=30"
echo ""
echo ""

echo "=== Testes concluídos ==="
echo ""
echo "⚠️  IMPORTANTE: Configure as credenciais corretas em /settings antes de testar com dados reais!"
