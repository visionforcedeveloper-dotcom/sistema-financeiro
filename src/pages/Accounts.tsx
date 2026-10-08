import { useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency } from '../lib/utils'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import { Wallet, Pencil, Trash2, Plus, ArrowLeftRight } from 'lucide-react'
import type { Account, AccountType } from '../types'

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Conta corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'investment', label: 'Investimento' },
  { value: 'other', label: 'Outro' },
]

export default function Accounts() {
  const {
    accounts,
    getAccountBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    transferMoney,
    loading,
  } = useData()

  const [addOpen, setAddOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Saldo total: <span className="font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTransferOpen(true)} className="btn-secondary text-sm">
            <ArrowLeftRight size={16} /> Transferência
          </button>
          <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
            <Plus size={16} /> Nova conta
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet size={32} />}
            title="Nenhuma conta cadastrada"
            message="Cadastre suas contas bancárias, carteiras e investimentos."
            action={<button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Nova conta</button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const balance = getAccountBalance(acc.id)
            const typeLabel = accountTypes.find((t) => t.value === acc.type)?.label || acc.type

            return (
              <div key={acc.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{acc.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {typeLabel}{acc.bank ? ` • ${acc.bank}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Saldo atual</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(balance)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Saldo inicial: {formatCurrency(acc.initial_balance)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditAccount(acc)} className="btn-secondary text-sm flex-1">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => setDeleteId(acc.id)} className="btn-danger text-sm">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {addOpen && (
        <AccountFormModal onClose={() => setAddOpen(false)} onSave={async (data) => { await addAccount(data); setAddOpen(false) }} />
      )}
      {editAccount && (
        <AccountFormModal account={editAccount} onClose={() => setEditAccount(null)} onSave={async (data) => { await updateAccount(editAccount.id, data); setEditAccount(null) }} />
      )}

      {/* Transfer Modal */}
      {transferOpen && (
        <TransferModal accounts={accounts} onClose={() => setTransferOpen(false)} onTransfer={async (data) => { await transferMoney(data.from, data.to, data.amount, data.date, data.description); setTransferOpen(false) }} />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteAccount(deleteId)}
        title="Excluir conta"
        message="Tem certeza que deseja excluir esta conta? As transações associadas não serão removidas."
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface AccountFormProps {
  account?: Account
  onClose: () => void
  onSave: (data: Partial<Account>) => Promise<void>
}

function AccountFormModal({ account, onClose, onSave }: AccountFormProps) {
  const [name, setName] = useState(account?.name || '')
  const [bank, setBank] = useState(account?.bank || '')
  const [type, setType] = useState<AccountType>(account?.type || 'checking')
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initial_balance) : '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name) return
    setSaving(true)
    try {
      await onSave({
        name,
        bank: bank || null,
        type,
        initial_balance: parseFloat(initialBalance) || 0,
      })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={account ? 'Editar Conta' : 'Nova Conta'} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Nome da conta</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Conta principal" className="input" autoFocus />
        </div>
        <div>
          <label className="label">Banco (opcional)</label>
          <input type="text" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ex: Itaú" className="input" />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="input">
            {accountTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Saldo inicial (R$)</label>
          <input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0,00" className="input" />
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

interface TransferProps {
  accounts: Account[]
  onClose: () => void
  onTransfer: (data: { from: string; to: string; amount: number; date: string; description: string }) => Promise<void>
}

function TransferModal({ accounts, onClose, onTransfer }: TransferProps) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('Transferência')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!from || !to || !amount || from === to) return
    setSaving(true)
    try {
      await onTransfer({ from, to, amount: parseFloat(amount), date, description })
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Transferência entre contas" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Conta de origem</label>
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Conta de destino</label>
          <select value={to} onChange={(e) => setTo(e.target.value)} className="input">
            <option value="">Selecione...</option>
            {accounts.filter((a) => a.id !== from).map((a) => (
              <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
            ))}
          </select>
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
          <label className="label">Descrição</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
          💡 Transferências não contam como receita ou despesa. Apenas movem o dinheiro entre contas.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !from || !to || !amount || from === to} className="btn-primary flex-1">
            {saving ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
