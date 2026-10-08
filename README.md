# FinancePro - Gestão Financeira Pessoal

Sistema completo de controle financeiro pessoal com dashboard, gráficos, orçamento, metas, cartões de crédito, contas recorrentes, parcelamentos e relatórios.

## Deploy na Vercel + Supabase

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (grátis)
2. Clique em **New Project** e dê um nome
3. Aguarde o projeto ser criado (1-2 minutos)

### 2. Criar as tabelas no banco

1. No painel do Supabase, vá em **SQL Editor** (menu lateral esquerdo)
2. Clique em **New query**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Copie todo o conteúdo e cole no SQL Editor
5. Clique em **Run** (ctrl+enter)
6. Deve aparecer "Success. No rows returned"

### 3. Pegar as credenciais da API

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem no menu inferior)
2. Clique em **API**
3. Copie:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (chave longa que começa com `eyJ...`)

### 4. Fazer deploy na Vercel

1. Faça push do código para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e faça login
3. Clique em **Add New** → **Project**
4. Importe o repositório do GitHub
5. Configure o projeto:
   - **Framework Preset:** Vite
   - **Root Directory:** `financepro` (se o repositório tiver a pasta)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua anon key do Supabase
7. Clique em **Deploy**
8. Pronto! O sistema estará no ar

### 5. Rodar localmente (opcional)

```bash
cd financepro
npm install
```

Crie um arquivo `.env` na pasta `financepro`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

```bash
npm run dev
```

## Funcionalidades

- Dashboard com saldo, receitas, despesas, contas a pagar, economia e comprometimento de renda
- Gráficos: receita x despesa (barras), despesas por categoria (pizza), evolução do saldo (linha)
- Lançamentos com busca, filtros, editar, excluir e duplicar
- Receitas e Despesas separadas
- Contas a pagar com marcar como paga
- Cartões de crédito com limite, fatura atual/próxima e compras parceladas
- Contas bancárias com saldo automático e transferências
- Orçamento mensal por categoria com alertas
- Metas financeiras com barra de progresso
- Calendário financeiro
- Relatórios com filtros de período e exportação CSV
- Contas recorrentes (gera lançamentos automaticamente)
- Categorias e subcategorias com cores
- Importar/exportar CSV
- Light Mode e Dark Mode
- Design responsivo (desktop e mobile)
