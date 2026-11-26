/**
 * ApiContext — integração com Node.js + PostgreSQL
 * Gerencia transactions e recurring_transactions via API REST.
 * O restante (categorias, contas, etc.) continua no DataContext/localStorage
 * até migração completa.
 */
import {
  createContext, useContext, useEffect, useState,
  useCallback, ReactNode,
} from 'react'
import { api } from '../lib/api'
import { isOverdue, isSameMonth, getCurrentMonth, todayISO } from '../lib/utils'
import type { Transaction, RecurringTransaction, TransactionStatus, RecurringPeriod } from '../types'

interface ApiContextValue {
  transactions: Transaction[]
  recurringTransactions: RecurringTransaction[]
  loading: boolean
  error: string | null

  addTransaction: (data: Partial<Transaction>) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  markAsPaid: (id: string) => Promise<void>
  markAsUnpaid: (id: string) => Promise<void>

  addRecurring: (data: Partial<RecurringTransaction>) => Promise<RecurringTransaction>
  updateRecurring: (id: string, data: Partial<RecurringTransaction>) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>

  refresh: () => void
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined)

export function ApiProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [txs, recs] = await Promise.all([
        api.transactions.list(),
        api.recurring.list(),
      ])
      setTransactions(
        txs.sort((a: Transaction, b: Transaction) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      )
      setRecurringTransactions(recs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const refresh = useCallback(() => { loadAll() }, [loadAll])

  // ── Auto-update overdue ──────────────────────────────────
  useEffect(() => {
    if (loading) return
    const toUpdate = transactions.filter(
      (t) => t.status === 'pending' && isOverdue(t.date, 'pending')
    )
    toUpdate.forEach((t) => api.transactions.update(t.id, { status: 'overdue' }))
    if (toUpdate.length > 0) loadAll()
  }, [transactions, loading, loadAll])

  // ── Reset recorrentes no início do mês ───────────────────
  useEffect(() => {
    if (loading || recurringTransactions.length === 0) return
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    recurringTransactions.forEach(async (rec) => {
      if (rec.end_date && rec.end_date < todayISO()) return
      const dueDate = new Date(currentYear, today.getMonth(), rec.due_day)
        .toISOString().split('T')[0]
      if (dueDate < rec.start_date) return

      const existing = transactions.find(
        (t) => t.recurring_id === rec.id ||
          (!t.recurring_id && t.description === rec.description &&
           t.amount === rec.amount && t.type === rec.type)
      )

      if (!existing) {
        await api.transactions.create({
          description: rec.description,
          amount: rec.amount,
          date: dueDate,
          type: rec.type,
          status: 'pending',
          recurring_id: rec.id,
        })
        loadAll()
      } else {
        const existingMonth = new Date(existing.date).getMonth() + 1
        const existingYear = new Date(existing.date).getFullYear()
        if (existingMonth !== currentMonth || existingYear !== currentYear) {
          await api.transactions.update(existing.id, {
            date: dueDate,
            status: 'pending',
            payment_date: null,
            recurring_id: rec.id,
          })
          loadAll()
        }
      }
    })
  }, [loading, recurringTransactions.length]) // eslint-disable-line

  // ── CRUD ─────────────────────────────────────────────────
  const addTransaction = useCallback(async (data: Partial<Transaction>): Promise<Transaction> => {
    const tx = await api.transactions.create({
      ...data,
      date: data.date ?? todayISO(),
      status: data.status ?? 'pending',
      payment_date: data.status === 'paid' ? todayISO() : null,
    })
    await loadAll()
    return tx
  }, [loadAll])

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    await api.transactions.update(id, data)
    await loadAll()
  }, [loadAll])

  const deleteTransaction = useCallback(async (id: string) => {
    await api.transactions.remove(id)
    await loadAll()
  }, [loadAll])

  const markAsPaid = useCallback(async (id: string) => {
    await api.transactions.update(id, { status: 'paid', payment_date: todayISO() })
    await loadAll()
  }, [loadAll])

  const markAsUnpaid = useCallback(async (id: string) => {
    await api.transactions.update(id, { status: 'pending', payment_date: null })
    await loadAll()
  }, [loadAll])

  const addRecurring = useCallback(async (data: Partial<RecurringTransaction>): Promise<RecurringTransaction> => {
    const rec = await api.recurring.create({
      description: data.description ?? '',
      amount: data.amount ?? 0,
      type: data.type ?? 'expense',
      period: data.period ?? 'monthly',
      due_day: data.due_day ?? 1,
      start_date: data.start_date ?? todayISO(),
      end_date: data.end_date ?? null,
    })
    await loadAll()
    return rec
  }, [loadAll])

  const updateRecurring = useCallback(async (id: string, data: Partial<RecurringTransaction>) => {
    await api.recurring.update(id, data)
    await loadAll()
  }, [loadAll])

  const deleteRecurring = useCallback(async (id: string) => {
    await api.recurring.remove(id)
    await loadAll()
  }, [loadAll])

  return (
    <ApiContext.Provider value={{
      transactions, recurringTransactions, loading, error,
      addTransaction, updateTransaction, deleteTransaction,
      markAsPaid, markAsUnpaid,
      addRecurring, updateRecurring, deleteRecurring,
      refresh,
    }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi deve ser usado dentro de ApiProvider')
  return ctx
}
