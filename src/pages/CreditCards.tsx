import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, todayISO, cn } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { CreditCard as CardIcon, Pencil, Trash2, Plus, ShoppingBag } from 'lucide-react'
import type { CreditCard } from '../types'

const cardColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#16a34a', '#06b6d4', '#3b82f6', '#64748b',
]

export default function CreditCards() {
  const {
    creditCards,
    getCreditCardUsage,
    transactions,
    getCategoryName,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    createInstallmentPurchase,
    categories,
    loading,
  } = useData()

  const [addOpen, setAddOpen] = useState(false)
  const [editCard, setEditCard] = useState<CreditCard | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [installmentOpen, setInstallmentOpen] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState('')

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cartões de Crédito</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      {creditCards.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CardIcon size={32} />}
            title="Nenhum cartão cadastrado"
            message="Cadastre seus cartões de crédito para acompanhar limites e faturas."
            action={<button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Novo cartão</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditCards.map((card) => {
            const usage = getCreditCardUsage(card.id)
            if (!usage) return null

            return (
              <div key={card.id} className="card space-y-4">
                {/* Card Visual */}
                <div
                  className="rounded-2xl p-4 text-white relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm opacity-80">{card.bank || 'Banco'}</p>
                      <p className="text-lg font-bold">{card.name}</p>
                    </div>
                    <CardIcon size={28} className="opacity-80" />
                  </div>
                  <p className="text-lg font-mono tracking-wider mt-4">
                    {card.last_four_digits ? `**** **** **** ${card.last_four_digits}` : '**** **** **** ****'}
                  </p>
                  <div className="flex justify-between mt-3 text-xs opacity-80">
                    <span>Fecha: dia {card.closing_day}</span>
                    <span>Vence: dia {card.due_day}</span>
                  </div>
                </div>

                {/* Limit Info */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Limite total</p>
                    <p className="text-sm font-semibold">{formatCurrency(card.limit_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Utilizado</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(usage.usedLimit)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Disponível</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(usage.availableLimit)}</p>
                  </div>
                </div>

                {/* Usage Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Uso do limite</span>
                    <span className={cn(
                      'font-medium',
                      usage.usagePercentage > 80 ? 'text-red-600 dark:text-red-400'
                        : usage.usagePercentage > 50 ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400',
                    )}>
                      {usage.usagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        usage.usagePercentage > 80 ? 'bg-red-500'
                          : usage.usagePercentage > 50 ? 'bg-yellow-500'
                          : 'bg-green-500',
                      )}
                      style={{ width: `${Math.min(usage.usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Invoices */}
                <div className="flex gap-2 text-sm">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fatura atual</p>
                    <p className="font-semibold">{formatCurrency(usage.currentInvoice)}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Próxima fatura</p>
                    <p className="font-semibold">{formatCurrency(usage.nextInvoice)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCardId(card.id)
                      setInstallmentOpen(true)
                    }}
                    className="btn-secondary text-sm flex-1"
                  >
                    <ShoppingBag size={16} /> Compra parcelada
                  </button>
                  <button onClick={() => setEditCard(card)} className="btn-secondary text-sm">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteId(card.id)} className="btn-danger text-sm">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {addOpen && (
        <CardFormModal onClose={() => setAddOpen(false)} onSave={async (data) => { await addCreditCard(data); setAddOpen(false) }} />
      )}
      {editCard && (
        <CardFormModal card={editCard} onClose={() => setEditCard(null)} onSave={async (data) => { await updateCreditCard(editCard.id, data); setEditCard(null) }} />
      )}

      {/* Installment Purchase Modal */}
      {installmentOpen && (
        <InstallmentModal
          cardId={selectedCardId}
          categories={categories.filter((c) => c.type === 'expense' && !c.parent_id)}
          onClose={() => setInstallmentOpen(false)}
          onSave={async (data) => {
            await createInstallmentPurchase(
              data.description,
              data.amount,
              data.installments,
              data.date,
              selectedCardId,
              data.categoryId,
              null,
            )
            setInstallmentOpen(false)
          }}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteCreditCard(deleteId)}
        title="Excluir cartão"
        message="Tem certeza que deseja excluir este cartão? As transações associadas não serão removidas."
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface CardFormProps {
  card?: CreditCard
  onClose: () => void
  onSave: (data: Partial<CreditCard>) => Promise<void>
}

function CardFormModal({ card, onClose, onSave }: CardFormProps) {
  const [name, setName] = useState(card?.name || '')
  const [bank, setBank] = useState(card?.bank || '')
  const [limit, setLimit] = useState(card ? String(card.limit_amount) : '')
  const [closingDay, setClosingDay] = useState(String(card?.closing_day || 1))
  const [dueDay, setDueDay] = useState(String(card?.due_day || 10))
  const [color, setColor] = useState(card?.color || cardColors[0])
  const [lastFour, setLastFour] = useState(card?.last_four_digits || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !limit) return
    setSaving(true)
    try {
      await onSave({
        name,
        bank: bank || null,
        limit_amount: parseFloat(limit),
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
        color,
        last_four_digits: lastFour || null,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={card ? 'Editar Cartão' : 'Novo Cartão'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nome do cartão</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" className="input" />
          </div>
          <div>
            <label className="label">Banco</label>
            <input type="text" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex: Nubank" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Limite (R$)</label>
          <input type="number" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0,00" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Dia de fechamento</label>
            <input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Dia de vencimento</label>
            <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Últimos 4 dígitos</label>
          <input type="text" maxLength={4} value={lastFour} onChange={(e) => setLastFour(e.target.value)} placeholder="1234" className="input" />
        </div>
        <div>
          <label className="label">Cor do cartão</label>
          <div className="flex gap-2 flex-wrap">
            {cardColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-9 h-9 rounded-xl transition-all',
                  color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900' : '',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name || !limit} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface InstallmentProps {
  cardId: string
  categories: { id: string; name: string }[]
  onClose: () => void
  onSave: (data: { description: string; amount: number; installments: number; date: string; categoryId: string | null }) => Promise<void>
}

function InstallmentModal({ categories, onClose, onSave }: InstallmentProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [installments, setInstallments] = useState('1')
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)

  const total = parseFloat(amount) || 0
  const installmentCount = parseInt(installments) || 1
  const installmentValue = total / installmentCount

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      await onSave({
        description,
        amount: total,
        installments: installmentCount,
        date,
        categoryId: categoryId || null,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Compra Parcelada" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Descrição</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Notebook" className="input" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor total (R$)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200,00" className="input" />
          </div>
          <div>
            <label className="label">Nº de parcelas</label>
            <input type="number" min="1" max="48" value={installments} onChange={(e) => setInstallments(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Data da primeira parcela</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
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
        {total > 0 && installmentCount > 0 && (
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              {installmentCount}x de <span className="font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(installmentValue)}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Serão criados {installmentCount} lançamentos automáticos, um para cada mês.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !description || !amount} className="btn-primary flex-1">
            {saving ? 'Criando...' : 'Criar parcelamento'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
