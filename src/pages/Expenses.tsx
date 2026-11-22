import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import {
  formatCurrency, formatDate, todayISO,
  getCurrentMonth, isSameMonth, cn,
} from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import {
  TrendingDown, Pencil, Trash2, Plus, Repeat, Check, RotateCcw,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import type { Transaction, TransactionStatus, RecurringPeriod } from '../types'

type SortField = 'description' | 'amount' | 'date' | 'status'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ArrowUpDown size={13} className="ml-1 opacity-30 inline" />
  return dir === 'asc'
    ? <ArrowUp size={13} className="ml-1 text-brand-500 inline" />
    : <ArrowDown size={13} className="ml-1 text-brand-500 inline" />
}

export default function Expenses() {
  const {
    transactions,
    recurringTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    markAsPaid,
    markAsUnpaid,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    getCategoryName,
  } = useData()

  const [addOpen, setAddOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const statusOrder = { overdue: 0, pending: 1, paid: 2 }

  const expenseTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .slice()
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'description') {
          cmp = a.description.localeCompare(b.description, 'pt-BR')
        } else if (sortField === 'amount') {
          cmp = a.amount - b.amount
        } else if (sortField === 'date') {
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
        } else if (sortField === 'status') {
          cmp = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [transactions, sortField, sortDir])

  const { month, year } = getCurrentMonth()
  const totalExpenses = expenseTransactions
    .filter((t) => isSameMonth(t.date, month, year))
    .reduce((sum, t) => sum + t.amount, 0)
  const paid = expenseTransactions.filter((t) => t.status === 'paid').length
  const pending = expenseTransactions.filter((t) => t.status !== 'paid').length

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">Pago</span>
    if (status === 'pending') return <span className="badge-warning">Pendente</span>
    return <span className="badge-danger">Vencido</span>
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
        <button onClick={() => setAddOpen(true)} className="btn-danger text-sm">
          <Plus size={16} /> Nova despesa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total do mês</span>
          <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pagas</span>
          <span className="stat-value text-green-600 dark:text-green-400">{paid}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pendentes</span>
          <span className="stat-value text-yellow-600 dark:text-yellow-400">{pending}</span>
        </div>
      </div>

      {/* Tabela */}
      {expenseTransactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<TrendingDown size={32} />}
            title="Nenhuma despesa"
            message="Adicione suas despesas aqui."
            action={<button onClick={() => setAddOpen(true)} className="btn-danger"><Plus size={16} /> Nova despesa</button>}
          />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <th
                  className="text-left font-medium px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('description')}
                >
                  Descrição <SortIcon field="description" current={sortField} dir={sortDir} />
                </th>
                <th
                  className="text-right font-medium px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('amount')}
                >
                  Valor <SortIcon field="amount" current={sortField} dir={sortDir} />
                </th>
                <th
                  className="text-left font-medium px-4 py-3 hidden sm:table-cell cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('date')}
                >
                  Vencimento <SortIcon field="date" current={sortField} dir={sortDir} />
                </th>
                <th
                  className="text-center font-medium px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" current={sortField} dir={sortDir} />
                </th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {expenseTransactions.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    <div>
                      {t.description}
                      {t.installment_total && (
                        <span className="text-xs text-gray-400 ml-1">({t.installment_number}/{t.installment_total})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {t.status !== 'paid' ? (
                        <button
                          onClick={() => markAsPaid(t.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all flex items-center gap-1"
                          title="Marcar como paga"
                        >
                          <Check size={13} /> Pagar
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsUnpaid(t.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all flex items-center gap-1"
                          title="Marcar como pendente"
                        >
                          <RotateCcw size={13} /> Reverter
                        </button>
                      )}
                      <button onClick={() => setEditTransaction(t)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <ExpenseFormModal
          recurringTransactions={recurringTransactions}
          onClose={() => setAddOpen(false)}
          onSave={async (data, recurringData) => {
            // Cria o recorrente primeiro para obter o ID
            let recurringId: string | null = null
            if (recurringData) {
              const rec = await addRecurring(recurringData)
              recurringId = rec?.id ?? null
            }
            // Linka a transação com o recorrente criado
            await addTransaction({ ...data, type: 'expense', recurring_id: recurringId })
            setAddOpen(false)
          }}
        />
      )}

      {/* Edit Modal */}
      {editTransaction && (
        <ExpenseFormModal
          transaction={editTransaction}
          recurringTransactions={recurringTransactions}
          onClose={() => setEditTransaction(null)}
          onSave={async (data, recurringData, existingRecurringId) => {
            await updateTransaction(editTransaction.id, data)
            if (recurringData) {
              if (existingRecurringId) {
                // atualiza o recorrente existente
                await updateRecurring(existingRecurringId, recurringData)
              } else {
                // cria novo recorrente
                await addRecurring(recurringData)
              }
            }
            setEditTransaction(null)
          }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return
          // Busca a transação para verificar se tem recorrente vinculado
          const tx = transactions.find((t) => t.id === deleteId)
          if (tx) {
            // Remove o recorrente vinculado (por recurring_id ou por descrição+valor)
            const linked = tx.recurring_id
              ? recurringTransactions.find((r) => r.id === tx.recurring_id)
              : recurringTransactions.find(
                  (r) => r.type === tx.type && r.description === tx.description && r.amount === tx.amount,
                )
            if (linked) deleteRecurring(linked.id)
          }
          deleteTransaction(deleteId)
        }}
        title="Excluir despesa"
        message="Tem certeza que deseja excluir esta despesa? Se for recorrente, será removida permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}

// ── Modal de despesa simplificado ─────────────────────────────────────────
interface FormProps {
  transaction?: Transaction
  recurringTransactions?: import('../types').RecurringTransaction[]
  onClose: () => void
  onSave: (
    data: Partial<Transaction>,
    recurringData?: Partial<import('../types').RecurringTransaction>,
    existingRecurringId?: string,
  ) => Promise<void>
}

function ExpenseFormModal({ transaction, recurringTransactions = [], onClose, onSave }: FormProps) {
  // Recorrente vinculado a esta transação (pelo recurring_id ou por descrição+valor)
  const linkedRecurring = transaction
    ? (transaction.recurring_id
        ? recurringTransactions.find((r) => r.id === transaction.recurring_id)
        : recurringTransactions.find(
            (r) =>
              r.type === 'expense' &&
              r.description === transaction.description &&
              r.amount === transaction.amount,
          ))
    : undefined

  const [description, setDescription] = useState(transaction?.description || '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction?.date || todayISO())
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status || 'pending')

  // Recorrência — pré-preenche se existir recorrente vinculado
  const [isRecurring, setIsRecurring] = useState(!!linkedRecurring)
  const [recurringPeriod, setRecurringPeriod] = useState<RecurringPeriod>(
    (linkedRecurring?.period as RecurringPeriod) || 'monthly',
  )
  const [recurringEndDate, setRecurringEndDate] = useState(linkedRecurring?.end_date || '')

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      const txData: Partial<Transaction> = {
        description,
        amount: parseFloat(amount),
        date,
        category_id: null,
        account_id: null,
        credit_card_id: null,
        payment_method: null,
        status,
        payment_date: status === 'paid' ? todayISO() : null,
        observation: null,
      }

      const recurringData: Partial<import('../types').RecurringTransaction> | undefined = isRecurring ? {
        description,
        amount: parseFloat(amount),
        type: 'expense',
        period: recurringPeriod,
        due_day: new Date(date).getDate(),
        start_date: linkedRecurring?.start_date || date,
        end_date: recurringEndDate || null,
        category_id: null,
        account_id: null,
      } : undefined

      await onSave(txData, recurringData, linkedRecurring?.id)
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={transaction ? 'Editar Despesa' : 'Nova Despesa'} size="md">
      <div className="space-y-4">

        <div>
          <label className="label">Descrição</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Aluguel" className="input" autoFocus />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input" />
          </div>
          <div>
            <label className="label">Data de início</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>

        {/* ── Toggle Recorrente ── */}
        <div className={cn(
          'rounded-xl border-2 transition-all overflow-hidden',
          isRecurring
            ? 'border-purple-300 dark:border-purple-700'
            : 'border-gray-200 dark:border-gray-700',
        )}>
          <button
            type="button"
            onClick={() => setIsRecurring(!isRecurring)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                isRecurring
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
              )}>
                <Repeat size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Repetir automaticamente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isRecurring ? 'Esta despesa vai se repetir' : 'Lançamento único'}
                </p>
              </div>
            </div>
            <div className={cn(
              'relative w-11 h-6 rounded-full transition-colors shrink-0',
              isRecurring ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600',
            )}>
              <div className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                isRecurring ? 'translate-x-6' : 'translate-x-1',
              )} />
            </div>
          </button>

          {isRecurring && (
            <div className="px-4 pb-4 pt-1 space-y-3 bg-purple-50/50 dark:bg-purple-900/10 border-t border-purple-200 dark:border-purple-800">
              <div>
                <label className="label">Periodicidade</label>
                <select value={recurringPeriod} onChange={(e) => setRecurringPeriod(e.target.value as RecurringPeriod)} className="input">
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
              <div>
                <label className="label">
                  Data final <span className="text-xs text-gray-400 font-normal">(opcional — quando a despesa deixa de se repetir)</span>
                </label>
                <input type="date" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} className="input" />
                {recurringEndDate && (
                  <button type="button" onClick={() => setRecurringEndDate('')} className="text-xs text-gray-400 hover:text-red-500 mt-1">
                    Remover data final
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)} className="input">
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !description || !amount} className="btn-danger flex-1">
            {saving ? 'Salvando...' : isRecurring ? (linkedRecurring ? 'Salvar alterações' : 'Salvar e repetir') : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
