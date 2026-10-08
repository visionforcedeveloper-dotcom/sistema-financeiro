import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { Target, Pencil, Trash2, Plus, TrendingUp } from 'lucide-react'
import type { FinancialGoal } from '../types'

export default function Goals() {
  const {
    financialGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    loading,
  } = useData()

  const [addOpen, setAddOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<FinancialGoal | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Metas Financeiras</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {financialGoals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Target size={32} />}
            title="Nenhuma meta criada"
            message="Defina metas financeiras para acompanhar seu progresso."
            action={<button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Nova meta</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {financialGoals.map((goal) => {
            const percentage = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0
            const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
            const isComplete = goal.current_amount >= goal.target_amount

            return (
              <div key={goal.id} className="card space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      isComplete
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
                    )}>
                      {isComplete ? <TrendingUp size={20} /> : <Target size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold">{goal.name}</p>
                      {goal.deadline && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Prazo: {formatDate(goal.deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditGoal(goal)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteId(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {goal.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{goal.description}</p>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </span>
                    <span className={cn(
                      'font-semibold',
                      isComplete ? 'text-green-600 dark:text-green-400'
                        : percentage >= 75 ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-600 dark:text-gray-400',
                    )}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isComplete ? 'bg-green-500' : 'bg-gradient-to-r from-brand-500 to-brand-600',
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  {!isComplete && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Faltam <span className="font-semibold">{formatCurrency(remaining)}</span> para atingir a meta
                    </p>
                  )}
                  {isComplete && (
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      ✓ Meta atingida! Parabéns!
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {addOpen && (
        <GoalFormModal onClose={() => setAddOpen(false)} onSave={async (data) => { await addGoal(data); setAddOpen(false) }} />
      )}
      {editGoal && (
        <GoalFormModal goal={editGoal} onClose={() => setEditGoal(null)} onSave={async (data) => { await updateGoal(editGoal.id, data); setEditGoal(null) }} />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGoal(deleteId)}
        title="Excluir meta"
        message="Tem certeza que deseja excluir esta meta?"
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface GoalFormProps {
  goal?: FinancialGoal
  onClose: () => void
  onSave: (data: Partial<FinancialGoal>) => Promise<void>
}

function GoalFormModal({ goal, onClose, onSave }: GoalFormProps) {
  const [name, setName] = useState(goal?.name || '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [currentAmount, setCurrentAmount] = useState(goal ? String(goal.current_amount) : '')
  const [deadline, setDeadline] = useState(goal?.deadline || '')
  const [description, setDescription] = useState(goal?.description || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !targetAmount) return
    setSaving(true)
    try {
      await onSave({
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount) || 0,
        deadline: deadline || null,
        description: description || null,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={goal ? 'Editar Meta' : 'Nova Meta'} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Nome da meta</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Comprar notebook" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor objetivo (R$)</label>
            <input type="number" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="5000,00" className="input" />
          </div>
          <div>
            <label className="label">Valor atual (R$)</label>
            <input type="number" step="0.01" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="0,00" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Prazo (opcional)</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" rows={2} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name || !targetAmount} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
