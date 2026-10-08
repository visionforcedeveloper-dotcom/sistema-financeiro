// ===== Types for FinancePro =====

export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'paid' | 'pending' | 'overdue'
export type AccountType = 'checking' | 'savings' | 'wallet' | 'cash' | 'investment' | 'other'
export type RecurringPeriod = 'weekly' | 'monthly' | 'annual'

export interface Account {
  id: string
  name: string
  bank: string | null
  type: AccountType
  initial_balance: number
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  parent_id: string | null
  type: 'income' | 'expense' | null
  created_at: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  date: string // data de vencimento ou data da transação
  due_date: string | null // prazo de encerramento (deadline)
  type: TransactionType
  category_id: string | null
  account_id: string | null
  credit_card_id: string | null
  payment_method: string | null
  status: TransactionStatus
  payment_date: string | null
  observation: string | null
  installment_group_id: string | null
  installment_number: number | null
  installment_total: number | null
  transfer_account_id: string | null
  recurring_id: string | null
  created_at: string
}

export interface CreditCard {
  id: string
  name: string
  bank: string | null
  limit_amount: number
  closing_day: number
  due_day: number
  color: string | null
  last_four_digits: string | null
  created_at: string
}

export interface RecurringTransaction {
  id: string
  description: string
  amount: number
  category_id: string | null
  account_id: string | null
  type: TransactionType
  period: RecurringPeriod
  due_day: number
  start_date: string
  end_date: string | null
  created_at: string
}

export interface Budget {
  id: string
  category_id: string
  amount: number
  month: number // 1-12
  year: number
  created_at: string
}

export interface FinancialGoal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  description: string | null
  created_at: string
}

export interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

// Derived types for UI
export interface DashboardStats {
  balance: number
  monthIncome: number
  monthExpense: number
  billsToPay: number
  overdueBills: number
  monthSavings: number
  incomeCommitment: number
}

export interface BudgetProgress {
  category: Category
  budget: number
  spent: number
  available: number
  percentage: number
}

export interface CreditCardUsage {
  card: CreditCard
  usedLimit: number
  availableLimit: number
  currentInvoice: number
  nextInvoice: number
  usagePercentage: number
}

export interface InstallmentGroup {
  groupId: string
  description: string
  totalAmount: number
  installmentTotal: number
  paidInstallments: number
  remainingInstallments: number
  remainingAmount: number
  cardId: string | null
  categoryId: string | null
}
