-- =====================================================
-- FinancePro - Supabase PostgreSQL Schema
-- =====================================================
-- Run this in your Supabase SQL Editor to create all tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ACCOUNTS (Contas bancárias)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bank TEXT,
  type TEXT NOT NULL DEFAULT 'checking' CHECK (type IN ('checking', 'savings', 'wallet', 'cash', 'investment', 'other')),
  initial_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CATEGORIES (Categorias)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- CREDIT_CARDS (Cartões de crédito)
-- =====================================================
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bank TEXT,
  limit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL DEFAULT 1 CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
  color TEXT DEFAULT '#6366f1',
  last_four_digits TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TRANSACTIONS (Lançamentos)
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  payment_date DATE,
  observation TEXT,
  installment_group_id UUID,
  installment_number INTEGER,
  installment_total INTEGER,
  transfer_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  recurring_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON transactions(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id);

-- =====================================================
-- RECURRING_TRANSACTIONS (Contas recorrentes)
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'annual')),
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- BUDGETS (Orçamento mensal)
-- =====================================================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, month, year)
);

-- =====================================================
-- FINANCIAL_GOALS (Metas financeiras)
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL,
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- NOTIFICATIONS (Alertas)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- DEFAULT CATEGORIES
-- =====================================================
INSERT INTO categories (name, icon, color, type) VALUES
  ('Alimentação', 'utensils', '#f97316', 'expense'),
  ('Moradia', 'home', '#3b82f6', 'expense'),
  ('Transporte', 'car', '#06b6d4', 'expense'),
  ('Saúde', 'heart-pulse', '#ec4899', 'expense'),
  ('Educação', 'graduation-cap', '#8b5cf6', 'expense'),
  ('Lazer', 'gamepad-2', '#14b8a6', 'expense'),
  ('Compras', 'shopping-bag', '#f59e0b', 'expense'),
  ('Assinaturas', 'repeat', '#6366f1', 'expense'),
  ('Contas', 'receipt', '#64748b', 'expense'),
  ('Impostos', 'file-text', '#78716c', 'expense'),
  ('Outros', 'more-horizontal', '#94a3b8', 'expense')
ON CONFLICT DO NOTHING;

-- Income categories
INSERT INTO categories (name, icon, color, type) VALUES
  ('Salário', 'briefcase', '#16a34a', 'income'),
  ('Freelance', 'laptop', '#22c55e', 'income'),
  ('Venda', 'tag', '#4ade80', 'income'),
  ('Investimento', 'trending-up', '#16a34a', 'income'),
  ('Reembolso', 'rotate-ccw', '#22c55e', 'income'),
  ('Outros', 'more-horizontal', '#94a3b8', 'income')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUBCATEGORIES (using parent_id)
-- =====================================================
INSERT INTO categories (name, icon, color, parent_id, type)
SELECT 'Mercado', 'shopping-cart', '#f97316', c.id, 'expense' FROM categories c WHERE c.name = 'Alimentação' AND c.parent_id IS NULL
UNION
SELECT 'Restaurante', 'utensils', '#f97316', c.id, 'expense' FROM categories c WHERE c.name = 'Alimentação' AND c.parent_id IS NULL
UNION
SELECT 'Delivery', 'bike', '#f97316', c.id, 'expense' FROM categories c WHERE c.name = 'Alimentação' AND c.parent_id IS NULL
UNION
SELECT 'Combustível', 'fuel', '#06b6d4', c.id, 'expense' FROM categories c WHERE c.name = 'Transporte' AND c.parent_id IS NULL
UNION
SELECT 'Uber', 'car', '#06b6d4', c.id, 'expense' FROM categories c WHERE c.name = 'Transporte' AND c.parent_id IS NULL
UNION
SELECT 'Manutenção', 'wrench', '#06b6d4', c.id, 'expense' FROM categories c WHERE c.name = 'Transporte' AND c.parent_id IS NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (disabled - single user app)
-- =====================================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single user, no auth needed)
CREATE POLICY "allow_all_accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_credit_cards" ON credit_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recurring" ON recurring_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_goals" ON financial_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
