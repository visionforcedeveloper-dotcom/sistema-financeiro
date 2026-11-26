const pool = require('./pool')

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('🚀 Rodando migrations...')

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        date DATE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
        payment_date DATE,
        recurring_id UUID,
        installment_group_id UUID,
        installment_number INTEGER,
        installment_total INTEGER,
        transfer_account_id UUID,
        observation TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly','monthly','annual')),
        due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
    `)

    console.log('✅ Migrations concluídas!')
  } catch (err) {
    console.error('❌ Erro na migration:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
