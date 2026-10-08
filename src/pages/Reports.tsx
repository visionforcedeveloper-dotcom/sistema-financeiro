import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, cn, getCurrentMonth, getMonthName, isSameMonth } from '../lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { Download, FileBarChart } from 'lucide-react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  parseISO,
  format as formatDateFns,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

type PeriodType = 'today' | 'week' | 'month' | 'last_month' | '3months' | '6months' | 'year' | 'custom'

export default function Reports() {
  const {
    transactions,
    categories,
    creditCards,
    accounts,
    getCategoryName,
    getMonthlyComparison,
    getBalanceEvolution,
    getCreditCardUsage,
    loading,
  } = useData()

  const [period, setPeriod] = useState<PeriodType>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { month, year } = getCurrentMonth()

  const dateRange = useMemo(() => {
    const now = new Date()
    switch (period) {
      case 'today':
        return { start: now, end: now }
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'last_month': {
        const last = subMonths(now, 1)
        return { start: startOfMonth(last), end: endOfMonth(last) }
      }
      case '3months':
        return { start: subMonths(now, 3), end: now }
      case '6months':
        return { start: subMonths(now, 6), end: now }
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) }
      case 'custom':
        return {
          start: customStart ? parseISO(customStart) : startOfMonth(now),
          end: customEnd ? parseISO(customEnd) : endOfMonth(now),
        }
    }
  }, [period, customStart, customEnd])

  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = parseISO(t.date)
      return tDate >= dateRange.start && tDate <= dateRange.end
    })
  }, [transactions, dateRange])

  const income = periodTransactions.filter((t) => t.type === 'income')
  const expenses = periodTransactions.filter((t) => t.type === 'expense')
  const totalIncome = income.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  // Expenses by category
  const categoryData = useMemo(() => {
    const data: Record<string, { amount: number; color: string; count: number }> = {}
    expenses.forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id)
      const name = cat ? cat.name : 'Outros'
      const color = cat?.color || '#94a3b8'
      if (!data[name]) data[name] = { amount: 0, color, count: 0 }
      data[name].amount += t.amount
      data[name].count += 1
    })
    return Object.entries(data).map(([name, d]) => ({
      name,
      amount: d.amount,
      color: d.color,
      count: d.count,
      percentage: totalExpense > 0 ? (d.amount / totalExpense) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount)
  }, [expenses, categories, totalExpense])

  // Spending by credit card
  const cardData = useMemo(() => {
    return creditCards.map((card) => {
      const cardExpenses = expenses.filter((t) => t.credit_card_id === card.id)
      const total = cardExpenses.reduce((s, t) => s + t.amount, 0)
      return { name: card.name, amount: total }
    }).filter((d) => d.amount > 0)
  }, [creditCards, expenses])

  // Spending by account
  const accountData = useMemo(() => {
    return accounts.map((acc) => {
      const accTransactions = periodTransactions.filter((t) => t.account_id === acc.id && t.type !== 'transfer')
      const total = accTransactions.reduce((s, t) => s + t.amount, 0)
      return { name: acc.name, amount: total }
    }).filter((d) => d.amount > 0)
  }, [accounts, periodTransactions])

  // Biggest expenses
  const biggestExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 10)
  }, [expenses])

  // Paid vs pending
  const paidCount = expenses.filter((t) => t.status === 'paid').length
  const pendingCount = expenses.filter((t) => t.status !== 'paid').length
  const paidAmount = expenses.filter((t) => t.status === 'paid').reduce((s, t) => s + t.amount, 0)
  const pendingAmount = expenses.filter((t) => t.status !== 'paid').reduce((s, t) => s + t.amount, 0)

  const monthlyData = getMonthlyComparison(12)
  const balanceData = getBalanceEvolution(12)

  const exportCSV = () => {
    const headers = ['Descrição', 'Tipo', 'Categoria', 'Valor', 'Data', 'Status', 'Observação']
    const rows = periodTransactions.map((t) => [
      t.description,
      t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
      getCategoryName(t.category_id),
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
    a.download = `financeiro_${formatDateFns(dateRange.start, 'dd-MM-yyyy')}_${formatDateFns(dateRange.end, 'dd-MM-yyyy')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodLabels: { value: PeriodType; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês anterior' },
    { value: '3months', label: 'Últimos 3 meses' },
    { value: '6months', label: 'Últimos 6 meses' },
    { value: 'year', label: 'Este ano' },
    { value: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <button onClick={exportCSV} className="btn-primary text-sm">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Period filter */}
      <div className="card space-y-3">
        <div className="flex gap-2 flex-wrap">
          {periodLabels.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">De</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Até</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input" />
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="stat-label">Receitas</span>
          <span className="stat-value text-green-600 dark:text-green-400">{formatCurrency(totalIncome)}</span>
          <span className="text-xs text-gray-400">{income.filter(t => t.status === 'paid').length} recebidas</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total de Despesas</span>
          <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</span>
          <span className="text-xs text-gray-400">
            {formatCurrency(paidAmount)} pagos · {formatCurrency(pendingAmount)} pendentes
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Saldo</span>
          <span className={`stat-value ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(balance)}
          </span>
          <span className="text-xs text-gray-400">Receitas − Total despesas</span>
        </div>
      </div>

      {periodTransactions.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <FileBarChart size={28} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados para o período selecionado</p>
          </div>
        </div>
      ) : (
        <>
          {/* Income vs Expense */}
          <div className="card">
            <h3 className="font-semibold text-base mb-4">Receitas x Despesas (12 meses)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="income" name="Receita" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expenses by category */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Despesas por Categoria</h3>
              {categoryData.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">Sem despesas no período</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {categoryData.map((_, i) => <Cell key={i} fill={categoryData[i].color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {categoryData.slice(0, 5).map((c) => (
                      <div key={c.name} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                        <span className="font-medium">
                          {formatCurrency(c.amount)} ({c.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Balance evolution */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Evolução Financeira</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="balance" name="Saldo" stroke="#5163f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Spending by card */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Gastos por Cartão</h3>
              {cardData.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">Sem gastos em cartões no período</p>
              ) : (
                <div className="space-y-2">
                  {cardData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spending by account */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Movimentações por Conta</h3>
              {accountData.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">Sem movimentações no período</p>
              ) : (
                <div className="space-y-2">
                  {accountData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-sm font-semibold">{formatCurrency(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Biggest expenses */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Maiores Despesas</h3>
              {biggestExpenses.length === 0 ? (
                <p className="text-sm text-gray-400 py-10 text-center">Sem despesas no período</p>
              ) : (
                <div className="space-y-2">
                  {biggestExpenses.map((t, i) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 w-5">{i + 1}º</span>
                        <span className="text-sm font-medium truncate">{t.description}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400 ml-2 shrink-0">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paid vs pending */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Contas Pagas x Pendentes</h3>
              <div className="space-y-3">
                {/* Total geral */}
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total de despesas</p>
                    <p className="text-xs text-gray-500">{expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(totalExpense)}</span>
                </div>
                <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Pagas</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{paidCount} conta{paidCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Pendentes / Vencidas</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">{pendingCount} conta{pendingCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{formatCurrency(pendingAmount)}</span>
                </div>
                {/* Barra de progresso pago/total */}
                {totalExpense > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{((paidAmount / totalExpense) * 100).toFixed(0)}% pago</span>
                      <span>{((pendingAmount / totalExpense) * 100).toFixed(0)}% pendente</span>
                    </div>
                    <div className="h-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(paidAmount / totalExpense) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
