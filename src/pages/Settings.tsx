import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, todayISO, cn } from '../lib/utils'
import { insert as storageInsert, KEYS as storageKeys } from '../lib/storage'
// storageInsert and storageKeys are used inside importCSV
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { useTheme } from '../context/ThemeContext'
import {
  Settings as SettingsIcon,
  Tag,
  Repeat,
  Download,
  Upload,
  Moon,
  Sun,
  Pencil,
  Trash2,
  Plus,
  Palette,
} from 'lucide-react'
import type { Category, TransactionType, RecurringPeriod } from '../types'

type Tab = 'categories' | 'recurring' | 'import_export' | 'appearance'

const colorOptions = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#f97316',
  '#16a34a', '#06b6d4', '#3b82f6', '#64748b', '#78716c',
  '#dc2626', '#eab308', '#14b8a6', '#a855f7', '#3f6212',
]

const iconOptions = [
  'utensils', 'home', 'car', 'heart', 'graduation-cap',
  'gamepad-2', 'shopping-bag', 'repeat', 'receipt', 'file-text',
  'more-horizontal', 'briefcase', 'laptop', 'tag', 'trending-up',
  'rotate-ccw', 'shopping-cart', 'bike', 'fuel', 'wrench',
  'plane', 'gift', 'smartphone', 'wifi', 'zap', 'droplet',
]

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    recurringTransactions,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    transactions,
    accounts,
    getCategoryName,
    loading,
  } = useData()

  const [tab, setTab] = useState<Tab>('categories')
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [addRecurringOpen, setAddRecurringOpen] = useState(false)
  const [editRecurringId, setEditRecurringId] = useState<string | null>(null)
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null)

  const parentCategories = categories.filter((c) => !c.parent_id)
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId)

  const exportData = () => {
    const headers = ['Descrição', 'Tipo', 'Categoria', 'Conta', 'Valor', 'Data', 'Status', 'Observação']
    const rows = transactions.map((t) => [
      t.description,
      t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
      getCategoryName(t.category_id),
      accounts.find((a) => a.id === t.account_id)?.name || '',
      t.amount.toFixed(2),
      formatDate(t.date),
      t.status,
      t.observation || '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financepro_backup_${todayISO()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())

      if (lines.length < 2) {
        alert('Arquivo vazio ou inválido')
        return
      }

      const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim())

      if (!confirm(`Foram encontrados ${lines.length - 1} registros. Deseja importar?`)) return

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.replace(/"/g, '').trim())
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })

        const desc = row['Descrição'] || row['Description'] || ''
        if (!desc) continue

        const type = (row['Tipo'] || row['Type'] || 'expense').toLowerCase().includes('recei') ? 'income' : 'expense'
        const amount = parseFloat((row['Valor'] || row['Amount'] || '0').replace(',', '.')) || 0
        const date = row['Data'] || row['Date'] || todayISO()
        const status = (row['Status'] || 'pending').toLowerCase().includes('pag') ? 'paid' : 'pending'

        let dateISO = date
        if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = date.split('/')
          dateISO = `${y}-${m}-${d}`
        }

        storageInsert(storageKeys.transactions, {
          description: desc,
          amount,
          date: dateISO,
          type,
          status,
          observation: row['Observação'] || null,
          category_id: null, account_id: null, credit_card_id: null,
          payment_method: null, payment_date: null, installment_group_id: null,
          installment_number: null, installment_total: null,
          transfer_account_id: null, recurring_id: null,
        })
      }

      alert('Importação concluída!')
      window.location.reload()
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const tabs: { value: Tab; label: string; icon: typeof SettingsIcon }[] = [
    { value: 'categories', label: 'Categorias', icon: Tag },
    { value: 'recurring', label: 'Contas Recorrentes', icon: Repeat },
    { value: 'import_export', label: 'Importar / Exportar', icon: Download },
    { value: 'appearance', label: 'Aparência', icon: Palette },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              tab === t.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Categories tab */}
      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setAddCategoryOpen(true)} className="btn-primary text-sm">
              <Plus size={16} /> Nova categoria
            </button>
          </div>
          <div className="space-y-3">
            {parentCategories.map((cat) => {
              const subs = getSubcategories(cat.id)
              return (
                <div key={cat.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: cat.color || '#6366f1' }}
                      >
                        {cat.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium">{cat.name}</span>
                        {cat.type && (
                          <span className={cn(
                            'ml-2 text-xs',
                            cat.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                          )}>
                            {cat.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditCategory(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteCategoryId(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {subs.length > 0 && (
                    <div className="ml-12 mt-2 space-y-1">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400">↳ {sub.name}</span>
                          <div className="flex gap-1">
                            <button onClick={() => setEditCategory(sub)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setDeleteCategoryId(sub.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurring tab */}
      {tab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setAddRecurringOpen(true)} className="btn-primary text-sm">
              <Plus size={16} /> Nova conta recorrente
            </button>
          </div>
          {recurringTransactions.length === 0 ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
                  <Repeat size={28} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crie contas recorrentes como aluguel, internet, Netflix, etc.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recurringTransactions.map((rec) => (
                <div key={rec.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center',
                      rec.type === 'income'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                    )}>
                      <Repeat size={18} />
                    </div>
                    <div>
                      <p className="font-medium">{rec.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(rec.amount)} • {rec.period === 'monthly' ? 'Mensal' : rec.period === 'weekly' ? 'Semanal' : 'Anual'} • Dia {rec.due_day}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditRecurringId(rec.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteRecurringId(rec.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Import/Export tab */}
      {tab === 'import_export' && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold">Exportar dados</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Exporte todos os seus lançamentos em formato CSV para backup ou uso em planilhas.
            </p>
            <button onClick={exportData} className="btn-primary">
              <Download size={16} /> Exportar CSV
            </button>
          </div>

          <div className="card space-y-3">
            <h3 className="font-semibold">Importar planilha</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Importe um arquivo CSV com as colunas: Descrição, Tipo, Categoria, Conta, Valor, Data, Status, Observação.
            </p>
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} /> Selecionar arquivo CSV
              <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Appearance tab */}
      {tab === 'appearance' && (
        <div className="card space-y-4">
          <h3 className="font-semibold">Aparência</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              <div>
                <p className="font-medium">{theme === 'light' ? 'Modo claro' : 'Modo escuro'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Alterne entre claro e escuro</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors',
                theme === 'dark' ? 'bg-brand-600' : 'bg-gray-300',
              )}
            >
              <div className={cn(
                'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Category Modals */}
      {addCategoryOpen && (
        <CategoryFormModal
          parentCategories={parentCategories}
          onClose={() => setAddCategoryOpen(false)}
          onSave={async (data) => { await addCategory(data); setAddCategoryOpen(false) }}
        />
      )}
      {editCategory && (
        <CategoryFormModal
          category={editCategory}
          parentCategories={parentCategories.filter((c) => c.id !== editCategory.id)}
          onClose={() => setEditCategory(null)}
          onSave={async (data) => { await updateCategory(editCategory.id, data); setEditCategory(null) }}
        />
      )}

      {/* Recurring Modals */}
      {addRecurringOpen && (
        <RecurringFormModal
          categories={categories}
          accounts={accounts}
          onClose={() => setAddRecurringOpen(false)}
          onSave={async (data) => { await addRecurring(data); setAddRecurringOpen(false) }}
        />
      )}
      {editRecurringId && (() => {
        const rec = recurringTransactions.find((r) => r.id === editRecurringId)
        return rec ? (
          <RecurringFormModal
            recurring={rec}
            categories={categories}
            accounts={accounts}
            onClose={() => setEditRecurringId(null)}
            onSave={async (data) => { await updateRecurring(rec.id, data); setEditRecurringId(null) }}
          />
        ) : null
      })()}

      <ConfirmDialog
        open={deleteCategoryId !== null}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={() => deleteCategoryId && deleteCategory(deleteCategoryId)}
        title="Excluir categoria"
        message="Tem certeza? As transações associadas não serão removidas, mas ficarão sem categoria."
        confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={deleteRecurringId !== null}
        onClose={() => setDeleteRecurringId(null)}
        onConfirm={() => deleteRecurringId && deleteRecurring(deleteRecurringId)}
        title="Excluir conta recorrente"
        message="Tem certeza? As transações já geradas não serão removidas."
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface CategoryFormProps {
  category?: Category
  parentCategories: Category[]
  onClose: () => void
  onSave: (data: Partial<Category>) => Promise<void>
}

function CategoryFormModal({ category, parentCategories, onClose, onSave }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [type, setType] = useState<'income' | 'expense' | null>(category?.type || 'expense')
  const [parentId, setParentId] = useState(category?.parent_id || '')
  const [color, setColor] = useState(category?.color || colorOptions[0])
  const [icon, setIcon] = useState(category?.icon || iconOptions[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    try {
      await onSave({
        name,
        type,
        parent_id: parentId || null,
        color,
        icon,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={category ? 'Editar Categoria' : 'Nova Categoria'} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mercado" className="input" autoFocus />
        </div>
        {!parentId && (
          <div>
            <label className="label">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('expense')}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  type === 'expense'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                )}
              >
                Despesa
              </button>
              <button
                onClick={() => setType('income')}
                className={cn(
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  type === 'income'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                )}
              >
                Receita
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="label">Subcategoria de (opcional)</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
            <option value="">Nenhuma (categoria principal)</option>
            {parentCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-9 h-9 rounded-xl transition-all',
                  color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : '',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Ícone</label>
          <div className="grid grid-cols-8 gap-2">
            {iconOptions.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium transition-all',
                  icon === ic
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                )}
              >
                {ic.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !name} className="btn-primary flex-1">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

interface RecurringFormProps {
  recurring?: import('../types').RecurringTransaction
  categories: Category[]
  accounts: { id: string; name: string; bank: string | null }[]
  onClose: () => void
  onSave: (data: Partial<import('../types').RecurringTransaction>) => Promise<void>
}

function RecurringFormModal({ recurring, categories, accounts, onClose, onSave }: RecurringFormProps) {
  const [description, setDescription] = useState(recurring?.description || '')
  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : '')
  const [type, setType] = useState<TransactionType>(recurring?.type || 'expense')
  const [categoryId, setCategoryId] = useState(recurring?.category_id || '')
  const [accountId, setAccountId] = useState(recurring?.account_id || '')
  const [period, setPeriod] = useState<RecurringPeriod>(recurring?.period || 'monthly')
  const [dueDay, setDueDay] = useState(String(recurring?.due_day || 1))
  const [startDate, setStartDate] = useState(recurring?.start_date || todayISO())
  const [endDate, setEndDate] = useState(recurring?.end_date || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      await onSave({
        description,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || null,
        account_id: accountId || null,
        period,
        due_day: parseInt(dueDay),
        start_date: startDate,
        end_date: endDate || null,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter((c) => !c.parent_id && c.type === type)

  return (
    <Modal open={true} onClose={onClose} title={recurring ? 'Editar Conta Recorrente' : 'Nova Conta Recorrente'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setType('expense')}
            className={cn(
              'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              type === 'expense'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            )}
          >
            Despesa
          </button>
          <button
            onClick={() => setType('income')}
            className={cn(
              'px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              type === 'income'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            )}
          >
            Receita
          </button>
        </div>
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
            <label className="label">Dia de vencimento</label>
            <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {filteredCategories.map((c) => (
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
          <label className="label">Periodicidade</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as RecurringPeriod)} className="input">
            <option value="monthly">Mensal</option>
            <option value="weekly">Semanal</option>
            <option value="annual">Anual</option>
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
          </div>
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
