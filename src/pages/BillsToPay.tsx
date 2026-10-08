import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, isOverdue, cn } from '../lib/utils'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { Receipt, Check, Trash2, RotateCcw } from 'lucide-react'
import type { TransactionStatus } from '../types'

export default function BillsToPay() {
  const {
    transactions,
    getCategoryName,
    markAsPaid,
    markAsUnpaid,
    deleteTransaction,
    loading,
  } = useData()

  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const bills = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .filter((t) => {
        if (filter === 'all') return true
        return t.status === filter
      })
      .sort((a, b) => {
        // Overdue first, then by date ascending
        if (a.status !== b.status) {
          if (a.status === 'overdue') return -1
          if (b.status === 'overdue') return 1
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
  }, [transactions, filter])

  const totalToPay = transactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalOverdue = transactions
    .filter((t) => t.type === 'expense' && t.status === 'overdue')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalPaid = transactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0)

  const statusBadge = (status: TransactionStatus) => {
    if (status === 'paid') return <span className="badge-success">🟢 Pago</span>
    if (status === 'pending') return <span className="badge-warning">🟡 Pendente</span>
    return <span className="badge-danger">🔴 Vencido</span>
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-label">Total a pagar</span>
          <span className="stat-value text-yellow-600 dark:text-yellow-400">{formatCurrency(totalToPay)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Vencidas</span>
          <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(totalOverdue)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pagas</span>
          <span className="stat-value text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'overdue', label: '🔴 Vencidas' },
          { value: 'pending', label: '🟡 Pendentes' },
          { value: 'paid', label: '🟢 Pagas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              filter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {bills.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Receipt size={32} />}
            title="Nenhuma conta"
            message="Você não tem contas nesta categoria."
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
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((t) => (
                <tr key={t.id} className={cn('table-row', isOverdue(t.date, t.status) && 'bg-red-50/50 dark:bg-red-900/10')}>
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
                    {formatCurrency(t.amount)}
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
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all"
                          title="Marcar como paga"
                        >
                          <Check size={14} className="inline mr-1" />
                          Pagar
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsUnpaid(t.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all"
                          title="Marcar como pendente"
                        >
                          <RotateCcw size={14} className="inline mr-1" />
                          Reverter
                        </button>
                      )}
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

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Excluir conta"
        message="Tem certeza que deseja excluir esta conta?"
        confirmLabel="Excluir"
      />
    </div>
  )
}
