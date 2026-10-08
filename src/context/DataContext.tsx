import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import {
  getAll,
  insert,
  insertMany,
  update,
  remove,
  seedDefaultCategories,
  KEYS,
} from '../lib/storage'
import { isOverdue, isSameMonth, getCurrentMonth, todayISO } from '../lib/utils'
import type {
  Account,
  Category,
  Transaction,
  CreditCard,
  RecurringTransaction,
  Budget,
  FinancialGoal,
  Notification,
  TransactionType,
  TransactionStatus,
  AccountType,
  RecurringPeriod,
  DashboardStats,
  BudgetProgress,
  CreditCardUsage,
  InstallmentGroup,
} from '../types'

interface DataContextValue {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  creditCards: CreditCard[]
  recurringTransactions: RecurringTransaction[]
  budgets: Budget[]
  financialGoals: FinancialGoal[]
  notifications: Notification[]
  loading: boolean
  error: string | null
  isConfigured: boolean

  addAccount: (data: Partial<Account>) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  deleteAccount: (id: string) => void
  getAccountBalance: (accountId: string) => number

  addCategory: (data: Partial<Category>) => void
  updateCategory: (id: string, data: Partial<Category>) => void
  deleteCategory: (id: string) => void
  getCategoryName: (id: string | null) => string
  getCategoryById: (id: string | null) => Category | undefined

  addTransaction: (data: Partial<Transaction>) => Transaction | null
  updateTransaction: (id: string, data: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  duplicateTransaction: (id: string) => void
  markAsPaid: (id: string) => void
  markAsUnpaid: (id: string) => void

  transferMoney: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string,
  ) => void

  createInstallmentPurchase: (
    description: string,
    totalAmount: number,
    installments: number,
    date: string,
    creditCardId: string,
    categoryId: string | null,
    accountId: string | null,
  ) => void

  addCreditCard: (data: Partial<CreditCard>) => void
  updateCreditCard: (id: string, data: Partial<CreditCard>) => void
  deleteCreditCard: (id: string) => void
  getCreditCardUsage: (cardId: string) => CreditCardUsage | null

  addRecurring: (data: Partial<RecurringTransaction>) => void
  updateRecurring: (id: string, data: Partial<RecurringTransaction>) => void
  deleteRecurring: (id: string) => void
  generateRecurringTransactions: () => void

  addBudget: (data: Partial<Budget>) => void
  updateBudget: (id: string, data: Partial<Budget>) => void
  deleteBudget: (id: string) => void
  getBudgetProgress: () => BudgetProgress[]

  addGoal: (data: Partial<FinancialGoal>) => void
  updateGoal: (id: string, data: Partial<FinancialGoal>) => void
  deleteGoal: (id: string) => void

  getDashboardStats: () => DashboardStats
  getMonthlyComparison: (months: number) => { month: string; income: number; expense: number }[]
  getCategorySpending: (month?: number, year?: number) => { category: string; amount: number; color: string }[]
  getBalanceEvolution: (months: number) => { month: string; balance: number }[]
  getInstallmentGroups: () => InstallmentGroup[]
  refresh: () => void
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

// ── helpers ───────────────────────────────────────────────
function getMonthNameShort(month: number): string {
  return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][month - 1] ?? ''
}

// ── Provider ──────────────────────────────────────────────
export function DataProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Load everything from localStorage
  const loadAll = useCallback(() => {
    seedDefaultCategories()
    setAccounts(getAll<Account>(KEYS.accounts))
    setCategories(getAll<Category>(KEYS.categories))
    setTransactions(
      getAll<Transaction>(KEYS.transactions).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    )
    setCreditCards(getAll<CreditCard>(KEYS.creditCards))
    setRecurringTransactions(getAll<RecurringTransaction>(KEYS.recurringTransactions))
    setBudgets(getAll<Budget>(KEYS.budgets))
    setFinancialGoals(getAll<FinancialGoal>(KEYS.financialGoals))
    setNotifications(getAll<Notification>(KEYS.notifications))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const refresh = useCallback(() => loadAll(), [loadAll])

  // Auto-update overdue status
  useEffect(() => {
    if (loading) return
    const toUpdate = transactions.filter(
      (t) => t.status === 'pending' && isOverdue(t.date, 'pending'),
    )
    if (toUpdate.length > 0) {
      toUpdate.forEach((t) => update<Transaction>(KEYS.transactions, t.id, { status: 'overdue' }))
      loadAll()
    }
  }, [transactions, loading, loadAll])

  // ── Account balance ──────────────────────────────────────
  const getAccountBalance = useCallback(
    (accountId: string): number => {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) return 0
      let balance = account.initial_balance
      for (const t of transactions) {
        if (t.status !== 'paid') continue
        if (t.type === 'income' && t.account_id === accountId) balance += t.amount
        else if (t.type === 'expense' && t.account_id === accountId) balance -= t.amount
        else if (t.type === 'transfer') {
          if (t.account_id === accountId) balance -= t.amount
          if (t.transfer_account_id === accountId) balance += t.amount
        }
      }
      return balance
    },
    [accounts, transactions],
  )

  // ── Account CRUD ─────────────────────────────────────────
  const addAccount = useCallback((data: Partial<Account>) => {
    insert<Account>(KEYS.accounts, {
      name: data.name ?? '',
      bank: data.bank ?? null,
      type: (data.type as AccountType) ?? 'checking',
      initial_balance: data.initial_balance ?? 0,
    })
    loadAll()
  }, [loadAll])

  const updateAccount = useCallback((id: string, data: Partial<Account>) => {
    update<Account>(KEYS.accounts, id, data)
    loadAll()
  }, [loadAll])

  const deleteAccount = useCallback((id: string) => {
    remove(KEYS.accounts, id)
    loadAll()
  }, [loadAll])

  // ── Category CRUD ────────────────────────────────────────
  const addCategory = useCallback((data: Partial<Category>) => {
    insert<Category>(KEYS.categories, {
      name: data.name ?? '',
      icon: data.icon ?? null,
      color: data.color ?? '#6366f1',
      parent_id: data.parent_id ?? null,
      type: data.type ?? null,
    })
    loadAll()
  }, [loadAll])

  const updateCategory = useCallback((id: string, data: Partial<Category>) => {
    update<Category>(KEYS.categories, id, data)
    loadAll()
  }, [loadAll])

  const deleteCategory = useCallback((id: string) => {
    remove(KEYS.categories, id)
    loadAll()
  }, [loadAll])

  const getCategoryById = useCallback(
    (id: string | null) => (id ? categories.find((c) => c.id === id) : undefined),
    [categories],
  )

  const getCategoryName = useCallback(
    (id: string | null) => {
      if (!id) return 'Sem categoria'
      return categories.find((c) => c.id === id)?.name ?? 'Sem categoria'
    },
    [categories],
  )

  // ── Transaction CRUD ─────────────────────────────────────
  const addTransaction = useCallback((data: Partial<Transaction>): Transaction | null => {
    const t = insert<Transaction>(KEYS.transactions, {
      description: data.description ?? '',
      amount: data.amount ?? 0,
      date: data.date ?? todayISO(),
      due_date: data.due_date ?? null,
      type: (data.type as TransactionType) ?? 'expense',
      category_id: data.category_id ?? null,
      account_id: data.account_id ?? null,
      credit_card_id: data.credit_card_id ?? null,
      payment_method: data.payment_method ?? null,
      status: (data.status as TransactionStatus) ?? 'pending',
      payment_date: data.payment_date ?? (data.status === 'paid' ? todayISO() : null),
      observation: data.observation ?? null,
      installment_group_id: data.installment_group_id ?? null,
      installment_number: data.installment_number ?? null,
      installment_total: data.installment_total ?? null,
      transfer_account_id: data.transfer_account_id ?? null,
      recurring_id: data.recurring_id ?? null,
    })
    loadAll()
    return t
  }, [loadAll])

  const updateTransaction = useCallback((id: string, data: Partial<Transaction>) => {
    update<Transaction>(KEYS.transactions, id, data)
    loadAll()
  }, [loadAll])

  const deleteTransaction = useCallback((id: string) => {
    remove(KEYS.transactions, id)
    loadAll()
  }, [loadAll])

  const duplicateTransaction = useCallback((id: string) => {
    const t = transactions.find((tx) => tx.id === id)
    if (!t) return
    insert<Transaction>(KEYS.transactions, {
      description: t.description + ' (cópia)',
      amount: t.amount,
      date: todayISO(),
      due_date: t.due_date ?? null,
      type: t.type,
      category_id: t.category_id,
      account_id: t.account_id,
      credit_card_id: t.credit_card_id,
      payment_method: t.payment_method,
      status: 'pending',
      observation: t.observation,
      installment_group_id: null,
      installment_number: null,
      installment_total: null,
      transfer_account_id: null,
      recurring_id: null,
      payment_date: null,
    })
    loadAll()
  }, [transactions, loadAll])

  const markAsPaid = useCallback((id: string) => {
    update<Transaction>(KEYS.transactions, id, { status: 'paid', payment_date: todayISO() })
    loadAll()
  }, [loadAll])

  const markAsUnpaid = useCallback((id: string) => {
    update<Transaction>(KEYS.transactions, id, { status: 'pending', payment_date: null })
    loadAll()
  }, [loadAll])

  // ── Transfer ─────────────────────────────────────────────
  const transferMoney = useCallback((
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string,
  ) => {
    insert<Transaction>(KEYS.transactions, {
      description: description || 'Transferência',
      amount,
      date,
      due_date: null,
      type: 'transfer',
      account_id: fromAccountId,
      transfer_account_id: toAccountId,
      status: 'paid',
      payment_date: date,
      category_id: null,
      credit_card_id: null,
      payment_method: null,
      observation: null,
      installment_group_id: null,
      installment_number: null,
      installment_total: null,
      recurring_id: null,
    })
    loadAll()
  }, [loadAll])

  // ── Installment purchase ─────────────────────────────────
  const createInstallmentPurchase = useCallback((
    description: string,
    totalAmount: number,
    installments: number,
    date: string,
    creditCardId: string,
    categoryId: string | null,
    accountId: string | null,
  ) => {
    const groupId = crypto.randomUUID()
    const installmentAmount = Math.round((totalAmount / installments) * 100) / 100
    const startDate = new Date(date)

    const rows = Array.from({ length: installments }, (_, i) => {
      const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
      return {
        description: `${description} (${i + 1}/${installments})`,
        amount: installmentAmount,
        date: dueDate.toISOString().split('T')[0],
        due_date: null,
        type: 'expense' as TransactionType,
        category_id: categoryId,
        account_id: accountId,
        credit_card_id: creditCardId,
        status: 'pending' as TransactionStatus,
        installment_group_id: groupId,
        installment_number: i + 1,
        installment_total: installments,
        payment_method: 'credit_card',
        observation: null,
        transfer_account_id: null,
        recurring_id: null,
        payment_date: null,
      }
    })

    insertMany<Transaction>(KEYS.transactions, rows)
    loadAll()
  }, [loadAll])

  // ── Credit Card CRUD ─────────────────────────────────────
  const addCreditCard = useCallback((data: Partial<CreditCard>) => {
    insert<CreditCard>(KEYS.creditCards, {
      name: data.name ?? '',
      bank: data.bank ?? null,
      limit_amount: data.limit_amount ?? 0,
      closing_day: data.closing_day ?? 1,
      due_day: data.due_day ?? 10,
      color: data.color ?? '#6366f1',
      last_four_digits: data.last_four_digits ?? null,
    })
    loadAll()
  }, [loadAll])

  const updateCreditCard = useCallback((id: string, data: Partial<CreditCard>) => {
    update<CreditCard>(KEYS.creditCards, id, data)
    loadAll()
  }, [loadAll])

  const deleteCreditCard = useCallback((id: string) => {
    remove(KEYS.creditCards, id)
    loadAll()
  }, [loadAll])

  const getCreditCardUsage = useCallback((cardId: string): CreditCardUsage | null => {
    const card = creditCards.find((c) => c.id === cardId)
    if (!card) return null
    const now = new Date()
    const m = now.getMonth() + 1
    const y = now.getFullYear()
    const cardTx = transactions.filter((t) => t.credit_card_id === cardId && t.type === 'expense')
    const currentInvoice = cardTx.filter((t) => isSameMonth(t.date, m, y)).reduce((s, t) => s + t.amount, 0)
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    const nextInvoice = cardTx.filter((t) => isSameMonth(t.date, nm, ny)).reduce((s, t) => s + t.amount, 0)
    const usedLimit = cardTx.filter((t) => t.status !== 'paid').reduce((s, t) => s + t.amount, 0)
    const availableLimit = card.limit_amount - usedLimit
    const usagePercentage = card.limit_amount > 0 ? (usedLimit / card.limit_amount) * 100 : 0
    return { card, usedLimit, availableLimit, currentInvoice, nextInvoice, usagePercentage }
  }, [creditCards, transactions])

  // ── Recurring CRUD ───────────────────────────────────────
  const addRecurring = useCallback((data: Partial<RecurringTransaction>) => {
    insert<RecurringTransaction>(KEYS.recurringTransactions, {
      description: data.description ?? '',
      amount: data.amount ?? 0,
      category_id: data.category_id ?? null,
      account_id: data.account_id ?? null,
      type: (data.type as TransactionType) ?? 'expense',
      period: (data.period as RecurringPeriod) ?? 'monthly',
      due_day: data.due_day ?? 1,
      start_date: data.start_date ?? todayISO(),
      end_date: data.end_date ?? null,
    })
    loadAll()
  }, [loadAll])

  const updateRecurring = useCallback((id: string, data: Partial<RecurringTransaction>) => {
    update<RecurringTransaction>(KEYS.recurringTransactions, id, data)
    loadAll()
  }, [loadAll])

  const deleteRecurring = useCallback((id: string) => {
    remove(KEYS.recurringTransactions, id)
    loadAll()
  }, [loadAll])

  const generateRecurringTransactions = useCallback(() => {
    const today = new Date()
    for (const rec of recurringTransactions) {
      if (rec.end_date && rec.end_date < todayISO()) continue
      const alreadyThisMonth = transactions.find(
        (t) =>
          t.recurring_id === rec.id &&
          isSameMonth(t.date, today.getMonth() + 1, today.getFullYear()),
      )
      if (alreadyThisMonth) continue
      const dueDate = new Date(today.getFullYear(), today.getMonth(), rec.due_day)
        .toISOString()
        .split('T')[0]
      if (dueDate < rec.start_date) continue
      insert<Transaction>(KEYS.transactions, {
        description: rec.description,
        amount: rec.amount,
        date: dueDate,
        due_date: null,
        type: rec.type,
        category_id: rec.category_id,
        account_id: rec.account_id,
        status: 'pending',
        recurring_id: rec.id,
        credit_card_id: null,
        payment_method: null,
        observation: null,
        installment_group_id: null,
        installment_number: null,
        installment_total: null,
        transfer_account_id: null,
        payment_date: null,
      })
    }
    loadAll()
  }, [recurringTransactions, transactions, loadAll])

  useEffect(() => {
    if (!loading && recurringTransactions.length > 0) {
      generateRecurringTransactions()
    }
  }, [loading]) // eslint-disable-line

  // ── Budget CRUD ──────────────────────────────────────────
  const addBudget = useCallback((data: Partial<Budget>) => {
    const { month, year } = getCurrentMonth()
    insert<Budget>(KEYS.budgets, {
      category_id: data.category_id ?? '',
      amount: data.amount ?? 0,
      month: data.month ?? month,
      year: data.year ?? year,
    })
    loadAll()
  }, [loadAll])

  const updateBudget = useCallback((id: string, data: Partial<Budget>) => {
    update<Budget>(KEYS.budgets, id, data)
    loadAll()
  }, [loadAll])

  const deleteBudget = useCallback((id: string) => {
    remove(KEYS.budgets, id)
    loadAll()
  }, [loadAll])

  const getBudgetProgress = useCallback((): BudgetProgress[] => {
    const { month, year } = getCurrentMonth()
    return budgets
      .filter((b) => b.month === month && b.year === year)
      .map((b) => {
        const category = categories.find((c) => c.id === b.category_id)
        if (!category) return null
        const spent = transactions
          .filter(
            (t) =>
              t.type === 'expense' &&
              t.category_id === b.category_id &&
              isSameMonth(t.date, month, year) &&
              t.status === 'paid',
          )
          .reduce((s, t) => s + t.amount, 0)
        const available = b.amount - spent
        const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0
        return { category, budget: b.amount, spent, available, percentage }
      })
      .filter((x): x is BudgetProgress => x !== null)
  }, [budgets, categories, transactions])

  // ── Goal CRUD ────────────────────────────────────────────
  const addGoal = useCallback((data: Partial<FinancialGoal>) => {
    insert<FinancialGoal>(KEYS.financialGoals, {
      name: data.name ?? '',
      target_amount: data.target_amount ?? 0,
      current_amount: data.current_amount ?? 0,
      deadline: data.deadline ?? null,
      description: data.description ?? null,
    })
    loadAll()
  }, [loadAll])

  const updateGoal = useCallback((id: string, data: Partial<FinancialGoal>) => {
    update<FinancialGoal>(KEYS.financialGoals, id, data)
    loadAll()
  }, [loadAll])

  const deleteGoal = useCallback((id: string) => {
    remove(KEYS.financialGoals, id)
    loadAll()
  }, [loadAll])

  // ── Dashboard stats ──────────────────────────────────────
  const getDashboardStats = useCallback((): DashboardStats => {
    const { month, year } = getCurrentMonth()
    const balance = accounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0)
    const monthIncome = transactions
      .filter((t) => t.type === 'income' && isSameMonth(t.date, month, year) && t.status === 'paid')
      .reduce((s, t) => s + t.amount, 0)
    const monthExpense = transactions
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, month, year) && t.status === 'paid')
      .reduce((s, t) => s + t.amount, 0)
    const billsToPay = transactions
      .filter((t) => t.type === 'expense' && t.status === 'pending')
      .reduce((s, t) => s + t.amount, 0)
    const overdueBills = transactions
      .filter((t) => t.type === 'expense' && t.status === 'overdue')
      .reduce((s, t) => s + t.amount, 0)
    const monthSavings = monthIncome - monthExpense
    const incomeCommitment =
      monthIncome > 0
        ? ((monthExpense + billsToPay + overdueBills) / monthIncome) * 100
        : 0
    return { balance, monthIncome, monthExpense, billsToPay, overdueBills, monthSavings, incomeCommitment }
  }, [accounts, transactions, getAccountBalance])

  // ── Monthly comparison ───────────────────────────────────
  const getMonthlyComparison = useCallback((months: number) => {
    return Array.from({ length: months }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (months - 1 - i))
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const income = transactions
        .filter((t) => t.type === 'income' && isSameMonth(t.date, m, y) && t.status === 'paid')
        .reduce((s, t) => s + t.amount, 0)
      const expense = transactions
        .filter((t) => t.type === 'expense' && isSameMonth(t.date, m, y) && t.status === 'paid')
        .reduce((s, t) => s + t.amount, 0)
      return { month: getMonthNameShort(m), income, expense }
    })
  }, [transactions])

  // ── Category spending ────────────────────────────────────
  const getCategorySpending = useCallback((month?: number, year?: number) => {
    const m = month ?? getCurrentMonth().month
    const y = year ?? getCurrentMonth().year
    const spending: Record<string, { amount: number; color: string }> = {}
    transactions
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, m, y) && t.status === 'paid')
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id)
        const name = cat?.name ?? 'Outros'
        const color = cat?.color ?? '#94a3b8'
        if (!spending[name]) spending[name] = { amount: 0, color }
        spending[name].amount += t.amount
      })
    return Object.entries(spending)
      .map(([category, d]) => ({ category, amount: d.amount, color: d.color }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, categories])

  // ── Balance evolution ────────────────────────────────────
  const getBalanceEvolution = useCallback((months: number) => {
    return Array.from({ length: months }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (months - 1 - i))
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      let balance = accounts.reduce((s, acc) => s + acc.initial_balance, 0)
      const endOfMonth = new Date(y, m, 0)
      for (const t of transactions) {
        if (t.status !== 'paid') continue
        if (new Date(t.date) > endOfMonth) continue
        if (t.type === 'income') balance += t.amount
        else if (t.type === 'expense') balance -= t.amount
      }
      return { month: getMonthNameShort(m), balance }
    })
  }, [accounts, transactions])

  // ── Installment groups ───────────────────────────────────
  const getInstallmentGroups = useCallback((): InstallmentGroup[] => {
    const groupIds = new Set<string>()
    transactions.forEach((t) => { if (t.installment_group_id) groupIds.add(t.installment_group_id) })
    return Array.from(groupIds).map((groupId) => {
      const group = transactions.filter((t) => t.installment_group_id === groupId)
      const first = group[0]
      const paidInstallments = group.filter((t) => t.status === 'paid').length
      const remainingInstallments = group.length - paidInstallments
      const remainingAmount = group
        .filter((t) => t.status !== 'paid')
        .reduce((s, t) => s + t.amount, 0)
      return {
        groupId,
        description: first?.description?.replace(/\s*\(\d+\/\d+\)\s*$/, '') ?? 'Compra parcelada',
        totalAmount: (first?.installment_total ?? 0) * (first?.amount ?? 0),
        installmentTotal: first?.installment_total ?? 0,
        paidInstallments,
        remainingInstallments,
        remainingAmount,
        cardId: first?.credit_card_id ?? null,
        categoryId: first?.category_id ?? null,
      }
    })
  }, [transactions])

  const value: DataContextValue = {
    accounts, categories, transactions, creditCards, recurringTransactions,
    budgets, financialGoals, notifications, loading, error: null, isConfigured: true,
    addAccount, updateAccount, deleteAccount, getAccountBalance,
    addCategory, updateCategory, deleteCategory, getCategoryName, getCategoryById,
    addTransaction, updateTransaction, deleteTransaction, duplicateTransaction,
    markAsPaid, markAsUnpaid, transferMoney, createInstallmentPurchase,
    addCreditCard, updateCreditCard, deleteCreditCard, getCreditCardUsage,
    addRecurring, updateRecurring, deleteRecurring, generateRecurringTransactions,
    addBudget, updateBudget, deleteBudget, getBudgetProgress,
    addGoal, updateGoal, deleteGoal,
    getDashboardStats, getMonthlyComparison, getCategorySpending,
    getBalanceEvolution, getInstallmentGroups, refresh,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
