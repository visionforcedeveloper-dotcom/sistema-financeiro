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
  Repeat, AlertTriangle, Clock,
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
  if (days < 0) return <span className="badge-danger text-xs flex items-center gap-1"><AlertTriangle size={11} /> Prazo encerrado há {Math.abs(days)}d</span>
  if (days === 0) return <span className="badge-danger text-xs flex items-center gap-1"><AlertTriangle size={11} /> Encerra hoje</span>
  if (days <= 3) return <span className="badge-warning text-xs flex items-center gap-1"><Clock size={11} /> Encerra em {days}d</span>
  return <span className="badge-info text-xs flex items-center gap-1"><Clock size={11} /> Encerra {formatDate(dueDate)}</span>
}

export default function Expenses() {
  const {
    transactions,
    categories,
    accounts,
    creditCards,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurring,
    getCategoryName,
  } = useData()

  const [filterCategory, setFilterCategory] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const expenseTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .filter((t) => !filterCategory || t.category_id === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCategory])

  const { month, year } = getCurrentMonth()
  const totalExpenses = expenseTransactions
    .filter((t) => isSameMonth(t.date, month, year))
    .reduce((sum, t) => sum + t.amount, 0)
  const paid = expenseTransactions.filter((t) => t.status === 'paid').length
  const pending = expenseTransactions.filter((t) => t.status === 'pending').length
  const overdue = expenseTransactions.filter((t) => t.status === 'overdue').length
  const nearDeadline = expenseTransactions.filter(
    (t) => t.due_date && t.status !== 'paid' && daysUntilDue(t.due_date) <= 3,
  ).length

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">Pago</span>
    if (status === 'pending') return <span className="badge-warning">Pendente</span>
    return <span className="badge-danger">Vencido</span>
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parent_id)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
        <button onClick={() => setAddOpen(true)} className="btn-danger text-sm">
          <Plus size={16} /> Nova despesa
        </button>
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

      {/* Filtro */}
      <div className="card">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
          <option value="">Todas as categorias</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      {expenseTransactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<TrendingDown size={32} />}
            title="Nenhuma despesa"
            message="Adicione suas despesas. Marque como recorrente para repetir todo mês."
            action={<button onClick={() => setAddOpen(true)} className="btn-danger"><Plus size={16} /> Nova despesa</button>}
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
                  <tr key={t.id} className={cn('table-row', dueSoon && 'bg-yellow-50/50 dark:bg-yellow-900/10')}>
                    <td className="px-4 py-3 font-medium">
                      <div>
                        {t.description}
                        {t.installment_total && (
                          <span className="text-xs text-gray-400 ml-1">({t.installment_number}/{t.installment_total})</span>
                        )}
                        {t.recurring_id && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded-full">
                            <Repeat size={9} /> recorrente
                          </span>
                        )}
                        {t.due_date && (
                          <div className="mt-1 lg:hidden"><DueDateBadge dueDate={t.due_date} /></div>
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
                        <button onClick={() => setEditTransaction(t)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Excluir">
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

      {addOpen && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => setAddOpen(false)}
          onSave={async (data, recurringData) => {
            await addTransaction({ ...data, type: 'expense' })
            if (recurringData) await addRecurring(recurringData)
            setAddOpen(false)
          }}
        />
      )}
      {editTransaction && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          transaction={editTransaction}
          onClose={() => setEditTransaction(null)}
          onSave={async (data, recurringData) => {
            await updateTransaction(editTransaction.id, data)
            if (recurringData) await addRecurring(recurringData)
            setEditTransaction(null)
          }}
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
    </div>
  )
}

// ── Modal de despesa (com opção de recorrência integrada) ─────────────────
interface FormProps {
  categories: { id: string; name: string }[]
  accounts: { id: string; name: string; bank: string | null }[]
  creditCards: { id: string; name: string }[]
  transaction?: Transaction
  onClose: () => void
  onSave: (data: Partial<Transaction>, recurringData?: Partial<import('../types').RecurringTransaction>) => Promise<void>
}

const quickExpenses = [
  '🏠 Aluguel', '📡 Internet', '⚡ Energia', '💧 Água',
  '🎬 Netflix', '🎵 Spotify', '🏋️ Academia', '📱 Telefone',
]

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

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPeriod, setRecurringPeriod] = useState<RecurringPeriod>('monthly')
  const [recurringDueDay, setRecurringDueDay] = useState(new Date().getDate().toString())
  const [recurringEndDate, setRecurringEndDate] = useState('')

  const [saving, setSaving] = useState(false)

  const dueDays = dueDate ? differenceInDays(parseISO(dueDate), new Date()) : null

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      const txData: Partial<Transaction> = {
        description,
        amount: parseFloat(amount),
        date,
        due_date: !isRecurring ? (dueDate || null) : null,
        category_id: categoryId || null,
        account_id: accountId || null,
        credit_card_id: creditCardId || null,
        payment_method: paymentMethod || null,
        status,
        payment_date: status === 'paid' ? todayISO() : null,
        observation: observation || null,
      }

      const recurringData: Partial<import('../types').RecurringTransaction> | undefined = isRecurring ? {
        description,
        amount: parseFloat(amount),
        type: 'expense',
        period: recurringPeriod,
        due_day: parseInt(recurringDueDay) || new Date().getDate(),
        start_date: date,
        end_date: recurringEndDate || null,
        category_id: categoryId || null,
        account_id: accountId || null,
      } : undefined

      await onSave(txData, recurringData)
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={transaction ? 'Editar Despesa' : 'Nova Despesa'} size="md">
      <div className="space-y-4">

        {/* Atalhos rápidos (só no modo criação) */}
        {!transaction && (
          <div className="flex gap-1.5 flex-wrap">
            {quickExpenses.map((q) => {
              const label = q.split(' ').slice(1).join(' ')
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDescription(label)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-all',
                    description === label
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                  )}
                >
                  {q}
                </button>
              )
            })}
          </div>
        )}

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
            <label className="label">Vencimento</label>
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
                  {isRecurring ? 'Esta despesa vai se repetir todo mês' : 'Lançamento único'}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
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

          {/* Configurações da recorrência */}
          {isRecurring && (
            <div className="px-4 pb-4 pt-1 space-y-3 bg-purple-50/50 dark:bg-purple-900/10 border-t border-purple-200 dark:border-purple-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Periodicidade</label>
                  <select value={recurringPeriod} onChange={(e) => setRecurringPeriod(e.target.value as RecurringPeriod)} className="input">
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Dia do vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recurringDueDay}
                    onChange={(e) => setRecurringDueDay(e.target.value)}
                    className="input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Todo dia {recurringDueDay}</p>
                </div>
              </div>
              <div>
                <label className="label">
                  Data final <span className="text-xs text-gray-400 font-normal">(opcional — quando encerrar)</span>
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

        {/* Prazo de encerramento — apenas para lançamentos únicos */}
        {!isRecurring && (
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
              <p className={cn('text-xs mt-1.5 flex items-center gap-1',
                dueDays < 0 ? 'text-red-600 dark:text-red-400'
                  : dueDays <= 3 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400',
              )}>
                {dueDays < 0 && <><AlertTriangle size={12} /> Prazo encerrado há {Math.abs(dueDays)} dia{Math.abs(dueDays) !== 1 ? 's' : ''}</>}
                {dueDays === 0 && <><AlertTriangle size={12} /> O prazo encerra hoje</>}
                {dueDays > 0 && <><Clock size={12} /> Encerra em {dueDays} dia{dueDays !== 1 ? 's' : ''}</>}
              </p>
            )}
            {dueDate && <button type="button" onClick={() => setDueDate('')} className="text-xs text-gray-400 hover:text-red-500 mt-1">Remover prazo</button>}
          </div>
        )}

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
            {saving ? 'Salvando...' : isRecurring ? 'Salvar e repetir' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
