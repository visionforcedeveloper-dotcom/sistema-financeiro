import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import { useData } from '../context/DataContext'
import { todayISO } from '../lib/utils'
import type { TransactionType } from '../types'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  defaultType?: TransactionType
}

const paymentMethods = ['Dinheiro', 'Pix', 'Débito', 'Crédito', 'Boleto', 'Transferência']

export default function TransactionModal({ open, onClose, defaultType }: TransactionModalProps) {
  const { accounts, categories, creditCards, addTransaction, transferMoney } = useData()

  const [type, setType] = useState<TransactionType>(defaultType || 'expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [status, setStatus] = useState('pending')
  const [observation, setObservation] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType(defaultType || 'expense')
      setDescription('')
      setAmount('')
      setDate(todayISO())
      setCategoryId('')
      setAccountId('')
      setCreditCardId('')
      setPaymentMethod('')
      setStatus('pending')
      setObservation('')
      setTransferTo('')
    }
  }, [open, defaultType])

  const filteredCategories = categories.filter(
    (c) => !c.parent_id && (type === 'transfer' ? true : c.type === type),
  )

  const handleSave = async () => {
    if (!description || !amount) return
    setSaving(true)
    try {
      if (type === 'transfer') {
        if (!accountId || !transferTo) return
        await transferMoney(accountId, transferTo, parseFloat(amount), date, description)
      } else {
        await addTransaction({
          description,
          amount: parseFloat(amount),
          date,
          type,
          category_id: categoryId || null,
          account_id: accountId || null,
          credit_card_id: creditCardId || null,
          payment_method: paymentMethod || null,
          status: status as 'paid' | 'pending',
          observation: observation || null,
        })
      }
      onClose()
    } catch (err) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Lançamento" size="md">
      <div className="space-y-4">
        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                type === t
                  ? t === 'income'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                    : t === 'expense'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {t === 'income' ? 'Receita' : t === 'expense' ? 'Despesa' : 'Transferência'}
            </button>
          ))}
        </div>

        {/* Description */}
        <div>
          <label className="label">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'income' ? 'Ex: Salário' : type === 'expense' ? 'Ex: Mercado' : 'Ex: Transferência'}
            className="input"
            autoFocus
          />
        </div>

        {/* Amount */}
        <div>
          <label className="label">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="input"
          />
        </div>

        {/* Date */}
        <div>
          <label className="label">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Transfer-specific fields */}
        {type === 'transfer' ? (
          <>
            <div>
              <label className="label">Conta de origem</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.bank})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Conta de destino</label>
              <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.bank})
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Category */}
            <div>
              <label className="label">Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account */}
            <div>
              <label className="label">Conta</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.bank ? `(${a.bank})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Card (only for expenses) */}
            {type === 'expense' && (
              <div>
                <label className="label">Cartão de crédito</label>
                <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="input">
                  <option value="">Nenhum</option>
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="label">Forma de pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                <option value="">Selecione...</option>
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="label">Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStatus('pending')}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-500'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Pendente
                </button>
                <button
                  onClick={() => setStatus('paid')}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    status === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Pago
                </button>
              </div>
            </div>
          </>
        )}

        {/* Observation */}
        <div>
          <label className="label">Observação (opcional)</label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Adicione uma observação..."
            className="input resize-none"
            rows={2}
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !description || !amount}
          className="btn-primary w-full"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  )
}
