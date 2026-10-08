import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, todayISO, cn } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { Search, Pencil, Copy, Trash2, ArrowLeftRight, Plus } from 'lucide-react'
import type { Transaction, TransactionType, TransactionStatus } from '../types'

const paymentMethods = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência']

export default function Transactions() {
  const {
    transactions,
    categories,
    accounts,
    creditCards,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    duplicateTransaction,
    getCategoryName,
    loading,
  } = useData()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
        if (filterType && t.type !== filterType) return false
        if (filterStatus && t.status !== filterStatus) return false
        if (filterCategory && t.category_id !== filterCategory) return false
        return true
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, search, filterType, filterStatus, filterCategory])

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">Pago</span>
    if (status === 'pending') return <span className="badge-warning">Pendente</span>
    return <span className="badge-danger">Vencido</span>
  }

  const typeLabel = (type: TransactionType) => {
    if (type === 'income') return <span className="badge-info">Receita</span>
    if (type === 'expense') return <span className="badge-danger">Despesa</span>
    return <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Transferência</span>
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>

      {/* Filters */}
      <div className="card space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lançamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input">
            <option value="">Todos os tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
            <option value="transfer">Transferência</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="">Todos os status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="overdue">Vencido</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input">
            <option value="">Todas as categorias</option>
            {categories.filter((c) => !c.parent_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ArrowLeftRight size={32} />}
            title="Nenhum lançamento"
            message="Comece adicionando suas receitas e despesas."
          />
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                <th className="text-left font-medium px-4 py-3">Descrição</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Tipo</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right font-medium px-4 py-3">Valor</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Data</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 font-medium">{t.description}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{typeLabel(t.type)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                    {getCategoryName(t.category_id)}
                  </td>
                  <td className={cn(
                    "px-4 py-3 text-right font-semibold",
                    t.type === 'income' ? 'text-green-600 dark:text-green-400'
                      : t.type === 'expense' ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400',
                  )}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTransaction(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => duplicateTransaction(t.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                        title="Duplicar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="Excluir"
                      >
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

      {/* Edit Modal */}
      {editTransaction && (
        <EditTransactionModal
          transaction={editTransaction}
          categories={categories}
          accounts={accounts}
          creditCards={creditCards}
          onClose={() => setEditTransaction(null)}
          onSave={async (data) => {
            await updateTransaction(editTransaction.id, data)
            setEditTransaction(null)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Excluir lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface EditModalProps {
  transaction: Transaction
  categories: { id: string; name: string; type: string | null; parent_id: string | null }[]
  accounts: { id: string; name: string; bank: string | null }[]
  creditCards: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: Partial<Transaction>) => Promise<void>
}

function EditTransactionModal({ transaction, categories, accounts, creditCards, onClose, onSave }: EditModalProps) {
  const [description, setDescription] = useState(transaction.description)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [date, setDate] = useState(transaction.date)
  const [type, setType] = useState(transaction.type)
  const [categoryId, setCategoryId] = useState(transaction.category_id || '')
  const [accountId, setAccountId] = useState(transaction.account_id || '')
  const [creditCardId, setCreditCardId] = useState(transaction.credit_card_id || '')
  const [paymentMethod, setPaymentMethod] = useState(transaction.payment_method || '')
  const [status, setStatus] = useState(transaction.status)
  const [observation, setObservation] = useState(transaction.observation || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      await onSave({
        description,
        amount: parseFloat(amount),
        date,
        type,
        category_id: categoryId || null,
        account_id: accountId || null,
        credit_card_id: creditCardId || null,
        payment_method: paymentMethod || null,
        status,
        payment_date: status === 'paid' ? todayISO() : null,
        observation: observation || null,
      })
    } catch (err) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter(
    (c) => !c.parent_id && (type === 'transfer' ? true : c.type === type),
  )

  return (
    <Modal open={true} onClose={onClose} title="Editar Lançamento" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                type === t
                  ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              )}
            >
              {t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Transferência'}
            </button>
          ))}
        </div>

        <div>
          <label className="label">Descrição</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>

        {type !== 'transfer' && (
          <>
            <div>
              <label className="label">Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Conta</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                <option value="">Sem conta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
                ))}
              </select>
            </div>
            {type === 'expense' && (
              <div>
                <label className="label">Cartão de crédito</label>
                <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="input">
                  <option value="">Nenhum</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
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
                <option value="overdue">Vencido</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="label">Observação</label>
          <textarea value={observation} onChange={(e) => setObservation(e.target.value)} className="input resize-none" rows={2} />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !description || !amount} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
