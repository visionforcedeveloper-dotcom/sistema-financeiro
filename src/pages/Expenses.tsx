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
  TrendingDown, Pencil, Trash2, Plus,
  Repeat, AlertTriangle, Clock, Settings2,
} from 'lucide-react'
import type { Transaction, TransactionStatus, RecurringPeriod } from '../types'
import { differenceInDays, parseISO } from 'date-fns'

const paymentMethods = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência']

function daysUntilDue(dueDate: string): number {
  return differenceInDays(parseISO(dueDate), new Date())
}

function DueDateBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null
  const days = daysUntilDue(dueDate)
  if (days < 0)
    return <span className="badge-danger text-xs flex items-center gap-1"><AlertTriangle size={11} /> Prazo encerrado há {Math.abs(days)}d</span>
  if (days === 0)
    return <span className="badge-danger text-xs flex items-center gap-1"><AlertTriangle size={11} /> Encerra hoje</span>
  if (days <= 3)
    return <span className="badge-warning text-xs flex items-center gap-1"><Clock size={11} /> Encerra em {days}d</span>
  return <span className="badge-info text-xs flex items-center gap-1"><Clock size={11} /> Encerra {formatDate(dueDate)}</span>
}

export default function Expenses() {
  const {
    transactions,
    categories,
    accounts,
    creditCards,
    recurringTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    getCategoryName,
  } = useData()

  const [filterCategory, setFilterCategory] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [recurringModalOpen, setRecurringModalOpen] = useState(false)
  const [editRecurring, setEditRecurring] = useState<typeof recurringTransactions[0] | null>(null)
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null)

  // Apenas recorrentes de despesa
  const recurringExpenses = recurringTransactions.filter((r) => r.type === 'expense')

  const expenseTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .filter((t) => !filterCategory || t.category_id === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCategory])

  const { month, year } = getCurrentMonth()
  const totalExpenses = expenseTransactions
    .filter((t) => isSameMonth(t.date, month, year) && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)
  const paid = expenseTransactions.filter((t) => t.status === 'paid').length
  const pending = expenseTransactions.filter((t) => t.status === 'pending').length
  const overdue = expenseTransactions.filter((t) => t.status === 'overdue').length
  const nearDeadline = expenseTransactions.filter(
    (t) => t.due_date && t.status !== 'paid' && daysUntilDue(t.due_date) <= 3,
  ).length

  const totalRecurring = recurringExpenses.reduce((s, r) => s + r.amount, 0)

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">Pago</span>
    if (status === 'pending') return <span className="badge-warning">Pendente</span>
    return <span className="badge-danger">Vencido</span>
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parent_id)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditRecurring(null); setRecurringModalOpen(true) }}
            className="btn-secondary text-sm"
          >
            <Repeat size={16} /> Nova recorrente
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-danger text-sm">
            <Plus size={16} /> Nova despesa
          </button>
        </div>
      </div>

      {/* Alerta prazos próximos */}
      {nearDeadline > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            <span className="font-semibold">{nearDeadline} despesa{nearDeadline > 1 ? 's' : ''}</span> com prazo de encerramento próximo ou vencido.
          </p>
        </div>
      )}

      {/* ── Despesas recorrentes ── */}
      {recurringExpenses.length > 0 ? (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Repeat size={15} /> Despesas recorrentes ativas
            </p>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              -{formatCurrency(totalRecurring)}/mês
            </span>
          </div>
          <div className="space-y-2">
            {recurringExpenses.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400">
                    <Repeat size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{rec.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Todo dia {rec.due_day} •{' '}
                      {rec.period === 'monthly' ? 'Mensal' : rec.period === 'annual' ? 'Anual' : 'Semanal'}
                      {rec.end_date && ` • até ${formatDate(rec.end_date)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(rec.amount)}
                  </span>
                  <button
                    onClick={() => { setEditRecurring(rec); setRecurringModalOpen(true) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                    title="Editar"
                  >
                    <Settings2 size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteRecurringId(rec.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Banner quando não há recorrentes */
        <button
          onClick={() => { setEditRecurring(null); setRecurringModalOpen(true) }}
          className="w-full flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0">
            <Repeat size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Adicionar despesa recorrente
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aluguel, internet, Netflix, academia... lançados automaticamente todo mês.
            </p>
          </div>
        </button>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="stat-card">
          <span className="stat-label">Vencidas</span>
          <span className="stat-value text-red-600 dark:text-red-400">{overdue}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
          <option value="">Todas as categorias</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {expenseTransactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<TrendingDown size={32} />}
            title="Nenhuma despesa"
            message="Adicione despesas avulsas ou configure recorrentes."
            action={
              <div className="flex gap-2">
                <button onClick={() => { setEditRecurring(null); setRecurringModalOpen(true) }} className="btn-secondary">
                  <Repeat size={16} /> Recorrente
                </button>
                <button onClick={() => setAddOpen(true)} className="btn-danger">
                  <Plus size={16} /> Nova despesa
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <th className="text-left font-medium px-4 py-3">Descrição</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right font-medium px-4 py-3">Valor</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Vencimento</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Prazo</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Pagamento</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {expenseTransactions.map((t) => {
                const dueSoon = t.due_date && t.status !== 'paid' && daysUntilDue(t.due_date) <= 3
                return (
                  <tr
                    key={t.id}
                    className={cn('table-row', dueSoon && 'bg-yellow-50/50 dark:bg-yellow-900/10')}
                  >
                    <td className="px-4 py-3 font-medium">
                      <div>
                        {t.description}
                        {t.installment_total && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({t.installment_number}/{t.installment_total})
                          </span>
                        )}
                        {t.recurring_id && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded-full">
                            <Repeat size={9} /> recorrente
                          </span>
                        )}
                        {t.due_date && (
                          <div className="mt-1 lg:hidden">
                            <DueDateBadge dueDate={t.due_date} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                      {getCategoryName(t.category_id)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {t.due_date ? <DueDateBadge dueDate={t.due_date} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                      {t.payment_date ? formatDate(t.payment_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTransaction(t)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal recorrente */}
      {recurringModalOpen && (
        <RecurringExpenseModal
          categories={expenseCategories}
          accounts={accounts}
          existing={editRecurring ?? undefined}
          onClose={() => { setRecurringModalOpen(false); setEditRecurring(null) }}
          onSave={(data) => {
            if (editRecurring) {
              updateRecurring(editRecurring.id, data)
            } else {
              addRecurring(data)
            }
            setRecurringModalOpen(false)
            setEditRecurring(null)
          }}
          onDelete={
            editRecurring
              ? () => { deleteRecurring(editRecurring.id); setRecurringModalOpen(false); setEditRecurring(null) }
              : undefined
          }
        />
      )}

      {/* Modal nova/editar despesa */}
      {addOpen && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => setAddOpen(false)}
          onSave={async (data) => { await addTransaction({ ...data, type: 'expense' }); setAddOpen(false) }}
        />
      )}
      {editTransaction && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          transaction={editTransaction}
          onClose={() => setEditTransaction(null)}
          onSave={async (data) => { await updateTransaction(editTransaction.id, data); setEditTransaction(null) }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Excluir despesa"
        message="Tem certeza que deseja excluir esta despesa?"
        confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={deleteRecurringId !== null}
        onClose={() => setDeleteRecurringId(null)}
        onConfirm={() => deleteRecurringId && deleteRecurring(deleteRecurringId)}
        title="Remover despesa recorrente"
        message="A recorrente será removida. Os lançamentos já gerados não serão apagados."
        confirmLabel="Remover"
      />
    </div>
  )
}

// ── Modal despesa recorrente ───────────────────────────────────────────────
interface RecurringModalProps {
  categories: { id: string; name: string }[]
  accounts: { id: string; name: string; bank: string | null }[]
  existing?: {
    id: string; description: string; amount: number
    due_day: number; account_id: string | null
    category_id: string | null; period: string
    start_date: string; end_date: string | null
  }
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  onDelete?: () => void
}

const quickExpenses = [
  { label: 'Aluguel', icon: '🏠' },
  { label: 'Internet', icon: '📡' },
  { label: 'Energia', icon: '⚡' },
  { label: 'Água', icon: '💧' },
  { label: 'Netflix', icon: '🎬' },
  { label: 'Spotify', icon: '🎵' },
  { label: 'Academia', icon: '🏋️' },
  { label: 'Telefone', icon: '📱' },
]

function RecurringExpenseModal({ categories, accounts, existing, onClose, onSave, onDelete }: RecurringModalProps) {
  const [description, setDescription] = useState(existing?.description || '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [dueDay, setDueDay] = useState(String(existing?.due_day || 1))
  const [accountId, setAccountId] = useState(existing?.account_id || '')
  const [categoryId, setCategoryId] = useState(existing?.category_id || '')
  const [period, setPeriod] = useState<RecurringPeriod>((existing?.period as RecurringPeriod) || 'monthly')
  const [startDate, setStartDate] = useState(existing?.start_date || todayISO())
  const [endDate, setEndDate] = useState(existing?.end_date || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    if (!description || !amount) return
    setSaving(true)
    onSave({
      description,
      amount: parseFloat(amount),
      type: 'expense',
      period,
      due_day: parseInt(dueDay),
      start_date: startDate,
      end_date: endDate || null,
      category_id: categoryId || null,
      account_id: accountId || null,
    })
  }

  return (
    <Modal open={true} onClose={onClose} title={existing ? 'Editar Recorrente' : 'Nova Despesa Recorrente'} size="md">
      <div className="space-y-4">

        {/* Info */}
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <Repeat size={18} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            O lançamento será criado automaticamente todo mês no dia configurado.
          </p>
        </div>

        {/* Atalhos rápidos */}
        {!existing && (
          <div>
            <label className="label">Atalhos comuns</label>
            <div className="flex gap-2 flex-wrap">
              {quickExpenses.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setDescription(q.label)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm border transition-all',
                    description === q.label
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  {q.icon} {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Aluguel"
            className="input"
            autoFocus={!!existing}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="input"
            />
          </div>
          <div>
            <label className="label">Dia de vencimento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Todo dia {dueDay} do mês</p>
          </div>
        </div>

        <div>
          <label className="label">Periodicidade</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as RecurringPeriod)} className="input">
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="annual">Anual</option>
          </select>
        </div>

        <div>
          <label className="label">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Conta de débito</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Data inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Data final (opcional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
            {endDate && (
              <button type="button" onClick={() => setEndDate('')} className="text-xs text-gray-400 hover:text-red-500 mt-1">
                Remover data final
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onDelete && (
            <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
              <Trash2 size={15} /> Remover
            </button>
          )}
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !description || !amount}
            className="btn-danger flex-1"
          >
            {saving ? 'Salvando...' : existing ? 'Atualizar' : 'Criar recorrente'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => onDelete?.()}
        title="Remover despesa recorrente"
        message="A recorrente será removida. Os lançamentos já gerados não serão apagados."
        confirmLabel="Remover"
      />
    </Modal>
  )
}

// ── Modal despesa avulsa ───────────────────────────────────────────────────
interface FormProps {
  categories: { id: string; name: string }[]
  accounts: { id: string; name: string; bank: string | null }[]
  creditCards: { id: string; name: string }[]
  transaction?: Transaction
  onClose: () => void
  onSave: (data: Partial<Transaction>) => Promise<void>
}

function ExpenseFormModal({ categories, accounts, creditCards, transaction, onClose, onSave }: FormProps) {
  const [description, setDescription] = useState(transaction?.description || '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction?.date || todayISO())
  const [dueDate, setDueDate] = useState(transaction?.due_date || '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [accountId, setAccountId] = useState(transaction?.account_id || '')
  const [creditCardId, setCreditCardId] = useState(transaction?.credit_card_id || '')
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || '')
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status || 'pending')
  const [observation, setObservation] = useState(transaction?.observation || '')
  const [saving, setSaving] = useState(false)

  const dueDays = dueDate ? daysUntilDue(dueDate) : null

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      await onSave({
        description,
        amount: parseFloat(amount),
        date,
        due_date: dueDate || null,
        category_id: categoryId || null,
        account_id: accountId || null,
        credit_card_id: creditCardId || null,
        payment_method: paymentMethod || null,
        status,
        payment_date: status === 'paid' ? todayISO() : null,
        observation: observation || null,
      })
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
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input" />
          </div>
          <div>
            <label className="label">Vencimento</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>
        {/* Prazo de encerramento */}
        <div>
          <label className="label">
            Prazo de encerramento
            <span className="text-xs text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={cn(
              'input',
              dueDate && dueDays !== null && dueDays < 0 && 'border-red-400 focus:ring-red-500',
              dueDate && dueDays !== null && dueDays >= 0 && dueDays <= 3 && 'border-yellow-400 focus:ring-yellow-500',
            )}
          />
          {dueDate && dueDays !== null && (
            <p className={cn(
              'text-xs mt-1.5 flex items-center gap-1',
              dueDays < 0 ? 'text-red-600 dark:text-red-400'
                : dueDays <= 3 ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400',
            )}>
              {dueDays < 0 && <><AlertTriangle size={12} /> Prazo encerrado há {Math.abs(dueDays)} dia{Math.abs(dueDays) !== 1 ? 's' : ''}</>}
              {dueDays === 0 && <><AlertTriangle size={12} /> O prazo encerra hoje</>}
              {dueDays > 0 && <><Clock size={12} /> Encerra em {dueDays} dia{dueDays !== 1 ? 's' : ''}</>}
            </p>
          )}
          {dueDate && (
            <button type="button" onClick={() => setDueDate('')} className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors">
              Remover prazo
            </button>
          )}
        </div>
        <div>
          <label className="label">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Conta</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cartão de crédito</label>
          <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="input">
            <option value="">Nenhum</option>
            {creditCards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Forma de pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)} className="input">
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </select>
        </div>
        <div>
          <label className="label">Observação (opcional)</label>
          <textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="input resize-none" rows={2} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !description || !amount} className="btn-danger flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
