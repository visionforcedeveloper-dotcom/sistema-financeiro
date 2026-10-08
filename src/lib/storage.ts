// =====================================================
// Persistência local via localStorage
// Substitui Supabase — nenhum backend necessário
// =====================================================

const KEYS = {
  accounts: 'fp_accounts',
  categories: 'fp_categories',
  transactions: 'fp_transactions',
  creditCards: 'fp_credit_cards',
  recurringTransactions: 'fp_recurring',
  budgets: 'fp_budgets',
  financialGoals: 'fp_goals',
  notifications: 'fp_notifications',
}

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function newId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

// =====================================================
// Generic CRUD helpers
// =====================================================

export function getAll<T>(key: string): T[] {
  return load<T>(key)
}

export function insert<T extends { id?: string; created_at?: string }>(
  key: string,
  data: Omit<T, 'id' | 'created_at'>,
): T {
  const items = load<T>(key)
  const newItem = { ...data, id: newId(), created_at: now() } as T
  items.push(newItem)
  save(key, items)
  return newItem
}

export function insertMany<T extends { id?: string; created_at?: string }>(
  key: string,
  rows: Omit<T, 'id' | 'created_at'>[],
): T[] {
  const items = load<T>(key)
  const newItems = rows.map((r) => ({ ...r, id: newId(), created_at: now() } as T))
  newItems.forEach((item) => items.push(item))
  save(key, items)
  return newItems
}

export function update<T extends { id: string }>(
  key: string,
  id: string,
  data: Partial<T>,
): void {
  const items = load<T>(key)
  const idx = items.findIndex((i) => i.id === id)
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data }
    save(key, items)
  }
}

export function remove(key: string, id: string): void {
  const items = load<{ id: string }>(key)
  save(
    key,
    items.filter((i) => i.id !== id),
  )
}

// =====================================================
// Seed de categorias padrão (só na primeira vez)
// =====================================================
export function seedDefaultCategories(): void {
  const existing = load('fp_categories')
  if (existing.length > 0) return

  const cats = [
    // Despesas
    { name: 'Alimentação', icon: 'utensils', color: '#f97316', type: 'expense', parent_id: null },
    { name: 'Moradia', icon: 'home', color: '#3b82f6', type: 'expense', parent_id: null },
    { name: 'Transporte', icon: 'car', color: '#06b6d4', type: 'expense', parent_id: null },
    { name: 'Saúde', icon: 'heart-pulse', color: '#ec4899', type: 'expense', parent_id: null },
    { name: 'Educação', icon: 'graduation-cap', color: '#8b5cf6', type: 'expense', parent_id: null },
    { name: 'Lazer', icon: 'gamepad-2', color: '#14b8a6', type: 'expense', parent_id: null },
    { name: 'Compras', icon: 'shopping-bag', color: '#f59e0b', type: 'expense', parent_id: null },
    { name: 'Assinaturas', icon: 'repeat', color: '#6366f1', type: 'expense', parent_id: null },
    { name: 'Contas', icon: 'receipt', color: '#64748b', type: 'expense', parent_id: null },
    { name: 'Impostos', icon: 'file-text', color: '#78716c', type: 'expense', parent_id: null },
    { name: 'Outros', icon: 'more-horizontal', color: '#94a3b8', type: 'expense', parent_id: null },
    // Receitas
    { name: 'Salário', icon: 'briefcase', color: '#16a34a', type: 'income', parent_id: null },
    { name: 'Freelance', icon: 'laptop', color: '#22c55e', type: 'income', parent_id: null },
    { name: 'Venda', icon: 'tag', color: '#4ade80', type: 'income', parent_id: null },
    { name: 'Investimento', icon: 'trending-up', color: '#16a34a', type: 'income', parent_id: null },
    { name: 'Reembolso', icon: 'rotate-ccw', color: '#22c55e', type: 'income', parent_id: null },
    { name: 'Outros', icon: 'more-horizontal', color: '#94a3b8', type: 'income', parent_id: null },
  ]

  const saved: { id: string; name: string }[] = []
  for (const cat of cats) {
    const item = insert('fp_categories', cat)
    saved.push(item as { id: string; name: string })
  }

  // Subcategorias
  const alimentacao = saved.find((c) => c.name === 'Alimentação')
  const transporte = saved.find((c) => c.name === 'Transporte')

  const subs = [
    { name: 'Mercado', icon: 'shopping-cart', color: '#f97316', type: 'expense', parent_id: alimentacao?.id ?? null },
    { name: 'Restaurante', icon: 'utensils', color: '#f97316', type: 'expense', parent_id: alimentacao?.id ?? null },
    { name: 'Delivery', icon: 'bike', color: '#f97316', type: 'expense', parent_id: alimentacao?.id ?? null },
    { name: 'Combustível', icon: 'fuel', color: '#06b6d4', type: 'expense', parent_id: transporte?.id ?? null },
    { name: 'Uber', icon: 'car', color: '#06b6d4', type: 'expense', parent_id: transporte?.id ?? null },
    { name: 'Manutenção', icon: 'wrench', color: '#06b6d4', type: 'expense', parent_id: transporte?.id ?? null },
  ]
  for (const sub of subs) {
    insert('fp_categories', sub)
  }
}

export { KEYS }
