# 🚀 Como Subir o FlowBridge no GitHub

## Passo a Passo Completo

### 1️⃣ Crie um Repositório no GitHub

1. Acesse [github.com](https://github.com)
2. Clique no **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Configure:
   - **Nome**: `flowbridge` (ou o nome que preferir)
   - **Descrição**: "Middleware de integração WebPosto x SwS"
   - **Visibilidade**: 
     - ✅ **Private** (se quiser manter privado)
     - ⬜ **Public** (se quiser compartilhar)
   - ⚠️ **NÃO** marque "Add a README" (já temos um!)
5. Clique em **"Create repository"**

---

### 2️⃣ Prepare o Projeto no Replit

Abra o **Shell** do Replit e execute:

```bash
# Inicialize o Git (se ainda não estiver)
git init

# Adicione todos os arquivos
git add .

# Faça o primeiro commit
git commit -m "Initial commit - FlowBridge v1.0"
```

---

### 3️⃣ Conecte ao GitHub

O GitHub vai mostrar comandos na tela. Use estes:

```bash
# Conecte ao seu repositório (MUDE para seu link!)
git remote add origin https://github.com/SEU-USUARIO/flowbridge.git

# Renomeie a branch para main
git branch -M main

# Envie o código
git push -u origin main
```

**⚠️ IMPORTANTE:** Troque `SEU-USUARIO` pelo seu usuário do GitHub!

---

### 4️⃣ Autenticação

Quando pedir credenciais:

- **Username**: Seu usuário do GitHub
- **Password**: Use um **Personal Access Token** (não sua senha!)

#### Como criar um Token:

1. GitHub → Ícone do perfil → **Settings**
2. **Developer settings** (no final da página)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token (classic)**
5. Marque: `repo` (acesso total aos repositórios)
6. **Generate token**
7. **Copie o token** (você só verá ele uma vez!)
8. Use esse token como "password" no git push

---

### 5️⃣ Pronto! ✅

Seu código agora está no GitHub! Acesse:

```
https://github.com/SEU-USUARIO/flowbridge
```

---

## 📦 Arquivos Importantes Criados

✅ **`.gitignore`** - Ignora arquivos sensíveis (node_modules, .env)  
✅ **`.env.example`** - Template de variáveis de ambiente  
✅ **`README.md`** - Documentação completa do projeto  

---

## ⚠️ Segurança

### ❌ O que NÃO vai pro GitHub (já configurado):

- ✅ `.env` (suas senhas e credenciais)
- ✅ `node_modules` (dependências)
- ✅ Arquivos temporários

### ✅ O que VAI pro GitHub:

- ✅ Todo o código fonte
- ✅ Documentação
- ✅ `.env.example` (template sem senhas)

---

## 🔄 Atualizações Futuras

Quando fizer mudanças no código:

```bash
# Adicione as mudanças
git add .

# Faça o commit
git commit -m "Descrição do que mudou"

# Envie para o GitHub
git push
```

---

## 🌐 Opções de Deploy

Depois que estiver no GitHub, você pode fazer deploy em:

- **Heroku** (PostgreSQL incluso)
- **Railway** (fácil e rápido)
- **Vercel** (frontend + serverless)
- **DigitalOcean** (servidor próprio)
- **AWS / Azure / GCP** (produção enterprise)

Todos conectam direto com o GitHub! 🚀

---

## 💡 Dica

Se quiser manter 100% privado:
1. Use repositório **Private** no GitHub
2. Só compartilhe com pessoas específicas
3. Faça deploy em servidor próprio (não use serviços públicos)

---

**Dúvidas?** Consulte a [documentação oficial do GitHub](https://docs.github.com/)
