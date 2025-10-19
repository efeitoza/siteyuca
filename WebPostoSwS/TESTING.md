# 🧪 Guia de Testes - WebPosto-SwS Integration

## 📋 Pré-requisitos

1. Aplicação rodando em `http://localhost:5000`
2. Banco de dados PostgreSQL configurado
3. (Opcional) Credenciais reais do WebPosto e SwS API

## 🎯 Cenários de Teste

### 1️⃣ Teste Manual via Interface Web

#### A. Configurar o Sistema
1. Acesse `http://localhost:5000/settings`
2. Preencha as credenciais:
   - **WebPosto**: usuário, senha, código da empresa
   - **SwS API**: host, terminal ID, acquirer ID, client ID, password
3. Clique em "Salvar Configuração"
4. ✅ Verifique que aparece mensagem de sucesso

#### B. Ver Dashboard
1. Acesse `http://localhost:5000/`
2. ✅ Verifique os 4 cards de estatísticas
3. ✅ Verifique a lista de transações recentes

#### C. Testar Relatórios Analíticos
1. Acesse `http://localhost:5000/reports`
2. Teste os seletores:
   - Altere o período (7, 30, 90, 365 dias)
   - Altere a granularidade (hora, dia, semana, mês)
3. ✅ Verifique que os gráficos atualizam
4. Navegue pelas abas:
   - Transações
   - Produtos
   - Status

#### D. Configurar Notificações
1. Acesse `http://localhost:5000/notifications`
2. Configure webhook:
   - URL: `https://webhook.site/your-unique-url` (para teste)
   - Habilite webhook
3. Selecione eventos para notificar
4. Clique em "Salvar Configurações"
5. ✅ Verifique histórico de notificações

#### E. Verificar Logs
1. Acesse `http://localhost:5000/logs`
2. ✅ Veja todos os eventos do sistema
3. Filtre por nível (info, warning, error)
4. Filtre por origem (webposto, sws, system)

---

### 2️⃣ Teste Automatizado via Script

Execute o script de teste:

```bash
./test-webposto.sh
```

Este script testa:
- ✅ Autenticação WebPosto
- ✅ Validação de voucher
- ✅ Envio de venda para SwS
- ✅ Endpoints de analytics

---

### 3️⃣ Teste Manual via curl/Postman

#### A. Autenticação WebPosto

```bash
curl -X POST http://localhost:5000/api/webposto/auth \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "SEU_USUARIO",
    "senha": "SUA_SENHA",
    "codigoEmpresa": "SEU_CODIGO_EMPRESA"
  }'
```

**Resposta esperada:**
```json
{
  "bearerToken": "abc123..."
}
```

#### B. Validar Voucher

```bash
curl -X POST http://localhost:5000/api/webposto/venda/validar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
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
  }'
```

**Resposta esperada:**
```json
{
  "idTransacao": "uuid-gerado",
  "tipoCodigo": "1",
  "valorCashBack": 10.50,
  "produtos": [...]
}
```

#### C. Enviar Venda

```bash
curl -X POST http://localhost:5000/api/webposto/venda/enviar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "codigoEmpresa": "123456",
    "codigoVenda": "VENDA001",
    "idTransacao": "ID_OBTIDO_NA_VALIDACAO",
    "produtos": [...],
    "prazos": [
      {
        "descricaoFormaPagamento": "Dinheiro",
        "tipoPagamento": 1,
        "valorPagamento": 100.00,
        "idFormaPagamentoAC": "FP001"
      }
    ]
  }'
```

#### D. Cancelar Venda

```bash
curl -X POST http://localhost:5000/api/webposto/venda/cancelar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "codigoEmpresa": "123456",
    "codigoVenda": "VENDA001",
    "idTransacao": "ID_DA_TRANSACAO"
  }'
```

---

### 4️⃣ Testar Endpoints de Analytics

```bash
# Taxa de sucesso
curl http://localhost:5000/api/analytics/success-rate?days=30

# Receita
curl http://localhost:5000/api/analytics/revenue-summary?days=30

# Top produtos
curl http://localhost:5000/api/analytics/top-products?limit=10&days=30

# Transações por período
curl "http://localhost:5000/api/analytics/transactions-by-period?period=day&days=30"
```

---

### 5️⃣ Testar Notificações

#### A. Configurar Webhook de Teste

1. Vá para https://webhook.site
2. Copie a URL única gerada
3. Configure no sistema em `/notifications`

#### B. Simular Falha que Gera Notificação

1. Configure credenciais SwS **inválidas** em `/settings`
2. Envie uma transação (ela vai falhar)
3. Aguarde 3 tentativas de retry (com delays: 30s, 1min, 5min)
4. ✅ Verifique que o webhook recebeu a notificação em webhook.site

---

### 6️⃣ Testar Fluxo Completo (E2E)

#### Cenário: Venda com Sucesso

1. **Setup:**
   - Configure credenciais corretas em `/settings`
   - Configure webhook em `/notifications`

2. **Executar fluxo:**
   ```bash
   # 1. Autenticar
   TOKEN=$(curl -s -X POST http://localhost:5000/api/webposto/auth \
     -H "Content-Type: application/json" \
     -d '{"usuario":"USER","senha":"PASS","codigoEmpresa":"123"}' \
     | grep -o '"bearerToken":"[^"]*"' | cut -d'"' -f4)
   
   # 2. Validar voucher
   ID_TRANS=$(curl -s -X POST http://localhost:5000/api/webposto/venda/validar \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{...}' \
     | grep -o '"idTransacao":"[^"]*"' | cut -d'"' -f4)
   
   # 3. Enviar venda
   curl -X POST http://localhost:5000/api/webposto/venda/enviar \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d "{...}"
   ```

3. **Verificar:**
   - ✅ Dashboard mostra +1 transação
   - ✅ Logs mostram toda a sequência
   - ✅ Relatórios atualizados
   - ✅ Transação aparece na lista

---

## 🔍 Verificação de Dados

### Verificar via Interface
- Dashboard: `/`
- Transações: `/transactions`
- Logs: `/logs`
- Relatórios: `/reports`

### Verificar via API
```bash
# Ver todas transações
curl http://localhost:5000/api/transactions

# Ver estatísticas
curl http://localhost:5000/api/dashboard/stats

# Ver logs
curl http://localhost:5000/api/logs
```

### Verificar diretamente no Banco
```bash
# Acessar console do Replit Database
# Ou usar psql:
psql $DATABASE_URL -c "SELECT * FROM transactions LIMIT 5;"
```

---

## 🐛 Problemas Comuns

### Erro 401 - Unauthorized
- **Causa**: Token inválido ou expirado
- **Solução**: Gere novo token via `/api/webposto/auth`

### Erro 500 - Internal Server Error
- **Causa**: Credenciais SwS inválidas
- **Solução**: Verifique configuração em `/settings`

### Transação fica "pending"
- **Causa**: Erro na comunicação com SwS
- **Solução**: Veja logs em `/logs` para detalhes

### Notificações não chegam
- **Causa**: Webhook URL incorreta
- **Solução**: Teste URL com curl antes

---

## ✅ Checklist de Testes

- [ ] Configuração salva com sucesso
- [ ] Autenticação WebPosto funciona
- [ ] Validação de voucher funciona
- [ ] Envio para SwS funciona
- [ ] Cancelamento funciona
- [ ] Dashboard mostra dados corretos
- [ ] Relatórios carregam sem erros
- [ ] Gráficos atualizam ao mudar período
- [ ] Logs registram todas operações
- [ ] Notificações são enviadas em falhas
- [ ] Retry queue processa falhas
- [ ] Transações aparecem na lista

---

## 📚 Recursos Adicionais

- **Logs em tempo real**: Acesse `/logs` e deixe a página aberta
- **Webhook de teste**: https://webhook.site
- **Postman Collection**: Importe os endpoints para testar facilmente
- **Database Viewer**: Use o painel do Replit para ver dados

---

## 🚀 Pronto para Produção?

Antes de publicar:
1. ✅ Todos os testes acima passam
2. ✅ Credenciais de produção configuradas
3. ✅ Webhook de notificações configurado
4. ✅ Backup do banco de dados feito
5. ✅ Monitoramento configurado

**Então pode fazer o deploy!** 🎉
