import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, todayISO, getCurrentMonth, isSameMonth } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { TrendingDown, Pencil, Trash2, Plus } from 'lucide-react'
import type { Transaction, TransactionStatus } from '../types'

const paymentMethods = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência']

export default function Expenses() {
  const {
    transactions,
    categories,
    accounts,
    creditCards,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCategoryName,
    loading,
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
    .filter((t) => isSameMonth(t.date, month, year) && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)
  const paid = expenseTransactions.filter((t) => t.status === 'paid').length
  const pending = expenseTransactions.filter((t) => t.status === 'pending').length
  const overdue = expenseTransactions.filter((t) => t.status === 'overdue').length

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
            message="Adicione suas despesas para acompanhar seus gastos."
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
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Pagamento</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {expenseTransactions.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 font-medium">
                    {t.description}
                    {t.installment_total && (
                      <span className="text-xs text-gray-400 ml-1">({t.installment_number}/{t.installment_total})</span>
                    )}
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
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                    {t.payment_date ? formatDate(t.payment_date) : '-'}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => setAddOpen(false)}
          onSave={async (data) => {
            await addTransaction({ ...data, type: 'expense' })
            setAddOpen(false)
          }}
        />
      )}

      {/* Edit Modal */}
      {editTransaction && (
        <ExpenseFormModal
          categories={expenseCategories}
          accounts={accounts}
          creditCards={creditCards}
          transaction={editTransaction}
          onClose={() => setEditTransaction(null)}
          onSave={async (data) => {
            await updateTransaction(editTransaction.id, data)
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
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [accountId, setAccountId] = useState(transaction?.account_id || '')
  const [creditCardId, setCreditCardId] = useState(transaction?.credit_card_id || '')
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || '')
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status || 'pending')
  const [observation, setObservation] = useState(transaction?.observation || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      await onSave({
        description,
        amount: parseFloat(amount),
        date,
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
          <label className="label">Conta</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cartão de crédito</label>
          <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="input">
            <option value="">Nenhum</option>
            {creditCards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Forma de pagamento</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
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
