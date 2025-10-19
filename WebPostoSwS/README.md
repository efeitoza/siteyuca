# FlowBridge - WebPosto to SwS Integration Platform

<div align="center">

**Middleware de integração entre sistemas PDV WebPosto e API SwS para processamento de transações de fidelidade**

[Documentação](#-documentação) • [Instalação](#-instalação) • [Configuração](#️-configuração) • [Uso](#-uso)

</div>

---

## 📋 Sobre o Projeto

FlowBridge é uma plataforma de integração que conecta o sistema de PDV WebPosto com a API SwS para processar transações de fidelidade e cashback. O sistema atua como ponte (middleware) entre esses dois sistemas, gerenciando:

- ✅ Validação de vouchers de clientes
- ✅ Processamento de transações de venda
- ✅ Transformação de dados entre formatos (De-Para configurável)
- ✅ Armazenamento de transações e logs
- ✅ Dashboard web para monitoramento
- ✅ Sistema de retry automático para falhas
- ✅ Notificações configuráveis

---

## 🏗️ Tecnologias

**Backend:**
- Node.js + TypeScript
- Express.js
- PostgreSQL (Neon Serverless)
- Drizzle ORM

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS + Shadcn UI
- TanStack Query (React Query)

---

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **npm** ou **yarn**

---

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/flowbridge.git
cd flowbridge
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/flowbridge
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=sua_senha
PGDATABASE=flowbridge

# Session
SESSION_SECRET=gere-uma-chave-aleatoria-segura

# Server
PORT=5000
NODE_ENV=development
```

### 4. Configure o banco de dados

```bash
# Sincronizar schema do banco
npm run db:push
```

### 5. Inicie o servidor

```bash
npm run dev
```

A aplicação estará rodando em: **http://localhost:5000**

---

## ⚙️ Configuração

### Primeira Configuração

1. Acesse **http://localhost:5000/settings**
2. Configure as credenciais do **WebPosto**:
   - Usuário
   - Senha
   - Código da Empresa

3. Configure as credenciais da **API SwS**:
   - Host (ex: `api.switchsales.com`)
   - Terminal ID
   - Acquirer ID
   - Client ID
   - Password

### Sistema De-Para (Field Mappings)

O sistema possui um módulo de transformação de dados configurável:

1. Acesse **/de-para** no menu
2. Configure os mapeamentos de campos entre WebPosto e SwS
3. Tipos de mapeamento disponíveis:
   - **Direct**: Copia valor diretamente
   - **Fixed**: Define valor fixo
   - **Multiply 100**: Multiplica por 100 (ex: R$ 10.50 → "1050")
   - **Multiply 1000**: Multiplica por 1000 (ex: 1.5kg → "1500")

---

## 📖 Documentação

A documentação completa está organizada em arquivos na raiz do projeto:

- **`replit.md`** - Arquitetura técnica completa
- **`VALIDACAO_VOUCHER_FLOW.md`** - Fluxo de validação de voucher
- **`WEBPOSTO_JSON_FORMAT.md`** - Formato JSON do WebPosto
- **`DEPARA_USAGE.md`** - Guia do sistema De-Para

---

## 🔧 Uso

### Testar Integração

Use o **Simulador PDV** para testar o fluxo completo:

1. Acesse **/pdv-simulator**
2. Siga os 3 passos:
   - **Passo 1**: Autenticação WebPosto
   - **Passo 2**: Validação de Voucher
   - **Passo 3**: Envio de Venda para SwS

### Endpoints da API

#### Autenticação WebPosto
```http
POST /api/webposto/autenticar
Content-Type: application/json

{
  "usuario": "demo_user",
  "senha": "demo123",
  "codigoEmpresa": "123456"
}
```

#### Validação de Voucher
```http
POST /api/webposto/venda/validar
Content-Type: application/json

{
  "codigoEmpresa": "123456",
  "codigoVoucher": "0Eed2992081af78066bd...",
  "codigoVenda": "628775",
  "produtos": [...]
}
```

#### Envio de Venda
```http
POST /api/webposto/venda/enviar
Content-Type: application/json

{
  "codigoEmpresa": "123456",
  "codigoVenda": "628775",
  "idTransacao": "TXN-...",
  "produtos": [...],
  "prazos": [...]
}
```

---

## 📊 Estrutura do Projeto

```
flowbridge/
├── client/               # Frontend React
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas da aplicação
│   │   └── lib/          # Utilitários
├── server/               # Backend Express
│   ├── routes.ts         # Rotas da API
│   ├── storage.ts        # Camada de dados
│   └── services/         # Lógica de negócio
├── shared/               # Código compartilhado
│   └── schema.ts         # Schema do banco (Drizzle)
└── db/                   # Migrations do banco
```

---

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verifique se o PostgreSQL está rodando
sudo service postgresql status

# Verifique as credenciais no .env
cat .env
```

### Porta 5000 já em uso
```bash
# Mude a porta no .env
PORT=3000
```

### Erro ao sincronizar schema
```bash
# Force a sincronização
npm run db:push -- --force
```

---

## 🔒 Segurança

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` no Git!

- Use `.env.example` como template
- Gere uma chave forte para `SESSION_SECRET`
- Em produção, use `NODE_ENV=production`
- Configure HTTPS em produção

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📝 Licença

Este projeto é proprietário e confidencial.

---

## 👨‍💻 Suporte

Para dúvidas ou problemas:

- 📧 Email: suporte@suaempresa.com.br
- 📱 WhatsApp: (00) 00000-0000

---

<div align="center">

**Desenvolvido com ❤️ para otimizar integrações de fidelidade**

</div>
