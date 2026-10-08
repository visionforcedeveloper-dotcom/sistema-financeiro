import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, todayISO, getCurrentMonth, isSameMonth } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { TrendingUp, Pencil, Trash2, Plus } from 'lucide-react'
import type { Transaction, TransactionStatus } from '../types'

const paymentMethods = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência']

export default function Income() {
  const {
    transactions,
    categories,
    accounts,
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

  const incomeTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income')
      .filter((t) => !filterCategory || t.category_id === filterCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filterCategory])

  const { month, year } = getCurrentMonth()
  const totalIncome = incomeTransactions
    .filter((t) => isSameMonth(t.date, month, year) && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)
  const received = incomeTransactions.filter((t) => t.status === 'paid').length
  const pending = incomeTransactions.filter((t) => t.status === 'pending').length

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">Recebido</span>
    if (status === 'pending') return <span className="badge-warning">Pendente</span>
    return <span className="badge-danger">Vencido</span>
  }

  const incomeCategories = categories.filter((c) => c.type === 'income' && !c.parent_id)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
        <button onClick={() => setAddOpen(true)} className="btn-success text-sm">
          <Plus size={16} /> Nova receita
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total do mês</span>
          <span className="stat-value text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Recebidas</span>
          <span className="stat-value">{received}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pendentes</span>
          <span className="stat-value text-yellow-600 dark:text-yellow-400">{pending}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
          <option value="">Todas as categorias</option>
          {incomeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {incomeTransactions.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<TrendingUp size={32} />}
            title="Nenhuma receita"
            message="Adicione suas receitas para acompanhar suas entradas."
            action={<button onClick={() => setAddOpen(true)} className="btn-success"><Plus size={16} /> Nova receita</button>}
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
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Data</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {incomeTransactions.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 font-medium">{t.description}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                    {getCategoryName(t.category_id)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                    {formatDate(t.date)}
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
        <IncomeFormModal
          categories={incomeCategories}
          accounts={accounts}
          onClose={() => setAddOpen(false)}
          onSave={async (data) => {
            await addTransaction({ ...data, type: 'income' })
            setAddOpen(false)
          }}
        />
      )}

      {/* Edit Modal */}
      {editTransaction && (
        <IncomeFormModal
          categories={incomeCategories}
          accounts={accounts}
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
        title="Excluir receita"
        message="Tem certeza que deseja excluir esta receita?"
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface FormProps {
  categories: { id: string; name: string }[]
  accounts: { id: string; name: string; bank: string | null }[]
  transaction?: Transaction
  onClose: () => void
  onSave: (data: Partial<Transaction>) => Promise<void>
}

function IncomeFormModal({ categories, accounts, transaction, onClose, onSave }: FormProps) {
  const [description, setDescription] = useState(transaction?.description || '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction?.date || todayISO())
  const [categoryId, setCategoryId] = useState(transaction?.category_id || '')
  const [accountId, setAccountId] = useState(transaction?.account_id || '')
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status || 'pending')
  const [observation, setObservation] = useState(transaction?.observation || '')
  const [paymentMethod, setPaymentMethod] = useState(transaction?.payment_method || '')
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
        status,
        payment_date: status === 'paid' ? todayISO() : null,
        observation: observation || null,
        payment_method: paymentMethod || null,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={transaction ? 'Editar Receita' : 'Nova Receita'} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Descrição</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Salário" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input" />
          </div>
          <div>
            <label className="label">Data</label>
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
            <option value="paid">Recebido</option>
          </select>
        </div>
        <div>
          <label className="label">Observação (opcional)</label>
          <textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="input resize-none" rows={2} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !description || !amount} className="btn-success flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
