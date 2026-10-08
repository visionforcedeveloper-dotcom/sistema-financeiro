import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, getCurrentMonth, getMonthNameFull, cn } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { PieChart, Pencil, Trash2, Plus, AlertTriangle } from 'lucide-react'
import type { Budget as BudgetType, Category } from '../types'

export default function Budget() {
  const {
    categories,
    budgets,
    getBudgetProgress,
    addBudget,
    updateBudget,
    deleteBudget,
    loading,
  } = useData()

  const { month, year } = getCurrentMonth()
  const [addOpen, setAddOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<BudgetType | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const progress = getBudgetProgress()
  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.parent_id)

  // Categories without budget
  const budgetedCategoryIds = budgets
    .filter((b) => b.month === month && b.year === year)
    .map((b) => b.category_id)
  const availableCategories = expenseCategories.filter(
    (c) => !budgetedCategoryIds.includes(c.id),
  )

  const totalBudget = progress.reduce((sum, p) => sum + p.budget, 0)
  const totalSpent = progress.reduce((sum, p) => sum + p.spent, 0)
  const totalAvailable = totalBudget - totalSpent

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamento Mensal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getMonthNameFull(month)} de {year}
          </p>
        </div>
        {availableCategories.length > 0 && (
          <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
            <Plus size={16} /> Nova categoria no orçamento
          </button>
        )}
      </div>

      {/* Summary */}
      {progress.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <span className="stat-label">Orçamento total</span>
            <span className="stat-value">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Gasto</span>
            <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Disponível</span>
            <span className={`stat-value ${totalAvailable >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalAvailable)}
            </span>
          </div>
        </div>
      )}

      {/* Budget list */}
      {progress.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<PieChart size={32} />}
            title="Nenhum orçamento definido"
            message="Defina limites de gastos por categoria para acompanhar seus gastos."
            action={availableCategories.length > 0 && <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Criar orçamento</button>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {progress.map((p) => (
            <div key={p.category.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: p.category.color || '#6366f1' }}
                  >
                    {p.category.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{p.category.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(p.spent)} / {formatCurrency(p.budget)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-semibold',
                      p.percentage > 100 ? 'text-red-600 dark:text-red-400'
                        : p.percentage > 80 ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400',
                    )}>
                      {p.percentage.toFixed(0)}% usado
                    </p>
                    <p className={cn(
                      'text-xs',
                      p.available >= 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-500',
                    )}>
                      {p.available >= 0 ? `${formatCurrency(p.available)} disponível` : `${formatCurrency(Math.abs(p.available))} acima`}
                    </p>
                  </div>
                  <button onClick={() => {
                    const b = budgets.find((b) => b.category_id === p.category.id && b.month === month && b.year === year)
                    if (b) setEditBudget(b)
                  }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => {
                    const b = budgets.find((b) => b.category_id === p.category.id && b.month === month && b.year === year)
                    if (b) setDeleteId(b.id)
                  }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    p.percentage > 100 ? 'bg-red-500'
                      : p.percentage > 80 ? 'bg-yellow-500'
                      : 'bg-green-500',
                  )}
                  style={{ width: `${Math.min(p.percentage, 100)}%` }}
                />
              </div>
              {p.percentage > 80 && (
                <div className={cn(
                  'flex items-center gap-2 text-xs',
                  p.percentage > 100 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400',
                )}>
                  <AlertTriangle size={14} />
                  {p.percentage > 100
                    ? `Você ultrapassou o orçamento de ${p.category.name} em ${formatCurrency(Math.abs(p.available))}`
                    : `Atenção! Você já usou ${p.percentage.toFixed(0)}% do orçamento de ${p.category.name}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <BudgetFormModal
          categories={availableCategories}
          onClose={() => setAddOpen(false)}
          onSave={async (data) => { await addBudget(data); setAddOpen(false) }}
        />
      )}
      {editBudget && (
        <BudgetFormModal
          categories={expenseCategories}
          budget={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={async (data) => { await updateBudget(editBudget.id, data); setEditBudget(null) }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteBudget(deleteId)}
        title="Excluir orçamento"
        message="Tem certeza que deseja remover esta categoria do orçamento?"
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface BudgetFormProps {
  categories: Category[]
  budget?: BudgetType
  onClose: () => void
  onSave: (data: { category_id: string; amount: number; month?: number; year?: number }) => Promise<void>
}

function BudgetFormModal({ categories, budget, onClose, onSave }: BudgetFormProps) {
  const [categoryId, setCategoryId] = useState(budget?.category_id || '')
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!categoryId || !amount) return
    setSaving(true)
    try {
      await onSave({
        category_id: categoryId,
        amount: parseFloat(amount),
        month: budget?.month,
        year: budget?.year,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={budget ? 'Editar Orçamento' : 'Nova Categoria no Orçamento'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input" disabled={!!budget}>
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Limite (R$)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !categoryId || !amount} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
