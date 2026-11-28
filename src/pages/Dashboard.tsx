import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useApi } from '../context/ApiContext'
import {
  formatCurrency, isSameMonth, getCurrentMonth, getMonthNameFull, cn,
} from '../lib/utils'
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  AlertCircle, Receipt, ArrowUpRight, ArrowDownRight,
  CalendarDays,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
  AreaChart, Area,
} from 'recharts'
import EmptyState from '../components/EmptyState'
import {
  startOfMonth, endOfMonth, parseISO,
  isAfter, isBefore, format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardProps {
  onQuickAdd: (type?: 'expense' | 'income' | 'transfer') => void
}

type TxList = ReturnType<typeof useData>['transactions']
type RecList = ReturnType<typeof useData>['recurringTransactions']

// ── Cálculo de um mês ────────────────────────────────────────────────────
// Regras:
// - Mês passado sem dados reais → zero (não projeta recorrentes no passado)
// - Mês atual ou futuro sem dados reais → projeta com recorrentes
// - Se há dados reais de um tipo, usa só eles (nunca dobra com recorrentes)
function buildMonthData(
  m: number, y: number,
  transactions: TxList,
  recurringTransactions: RecList,
  currentMonth: number,
  currentYear: number,
) {
  const monthStart = startOfMonth(new Date(y, m - 1))
  const monthEnd = endOfMonth(new Date(y, m - 1))

  const isPast = y < currentYear || (y === currentYear && m < currentMonth)
  const isCurrent = y === currentYear && m === currentMonth
  const isFuture = !isPast && !isCurrent

  const realIncomeList = transactions.filter((t) => t.type === 'income' && isSameMonth(t.date, m, y))
  const realExpenseList = transactions.filter((t) => t.type === 'expense' && isSameMonth(t.date, m, y))

  const hasRealIncome = realIncomeList.length > 0
  const hasRealExpense = realExpenseList.length > 0

  const realIncome = realIncomeList.reduce((s, t) => s + t.amount, 0)
  const realExpense = realExpenseList.reduce((s, t) => s + t.amount, 0)

  // Mês passado sem dados → zero
  if (isPast && !hasRealIncome && !hasRealExpense) {
    return { income: 0, expense: 0, balance: 0 }
  }

  // Mês futuro → sempre projeta pelos recorrentes (ignora transações avulsas futuras)
  if (isFuture) {
    let projIncome = 0
    let projExpense = 0
    for (const rec of recurringTransactions) {
      const recEnd = rec.end_date ? parseISO(rec.end_date) : null
      if (recEnd && isBefore(endOfMonth(recEnd), monthStart)) continue
      if (rec.period === 'annual') {
        const recStart = parseISO(rec.start_date)
        if ((recStart.getMonth() + 1) !== m) continue
      }
      const amount = rec.period === 'weekly' ? rec.amount * 4 : rec.amount
      if (rec.type === 'income') projIncome += amount
      if (rec.type === 'expense') projExpense += amount
    }
    return { income: projIncome, expense: projExpense, balance: projIncome - projExpense }
  }

  // Mês atual ou passado com dados → usa dados reais, complementa com recorrentes se necessário
  let projIncome = 0
  let projExpense = 0

  if (!hasRealIncome || !hasRealExpense) {
    for (const rec of recurringTransactions) {
      const recEnd = rec.end_date ? parseISO(rec.end_date) : null
      if (recEnd && isBefore(endOfMonth(recEnd), monthStart)) continue
      if (rec.period === 'annual') {
        const recStart = parseISO(rec.start_date)
        if ((recStart.getMonth() + 1) !== m) continue
      }
      const amount = rec.period === 'weekly' ? rec.amount * 4 : rec.amount
      if (rec.type === 'income' && !hasRealIncome) projIncome += amount
      if (rec.type === 'expense' && !hasRealExpense) projExpense += amount
    }
  }

  const income = hasRealIncome ? realIncome : projIncome
  const expense = hasRealExpense ? realExpense : projExpense

  return { income, expense, balance: income - expense }
}

export default function Dashboard({ onQuickAdd }: DashboardProps) {
  const {
    transactions,
    recurringTransactions,
    loading,
  } = useApi()

  const { getCategoryName } = useData()

  const { month, year: currentYear } = getCurrentMonth()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [chartPeriod, setChartPeriod] = useState<'year' | 3 | 6 | 12>('year')

  const availableYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

  const year = currentYear

  // ── Stats do mês atual (inclui recorrentes não gerados) ────────────────
  const currentMonthData = useMemo(
    () => buildMonthData(month, year, transactions, recurringTransactions, month, year),
    [month, year, transactions, recurringTransactions],
  )
  const monthIncome = currentMonthData.income
  const monthExpense = currentMonthData.expense
  const monthBalance = currentMonthData.balance

  const billsPending = transactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .reduce((s, t) => s + t.amount, 0)
  const billsOverdue = transactions
    .filter((t) => t.type === 'expense' && t.status === 'overdue')
    .reduce((s, t) => s + t.amount, 0)

  // ── Planilha anual com saldo acumulado ────────────────────────────────
  const annualData = useMemo(() => {
    let runningBalance = 0

    const rows = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const isFuture = selectedYear > currentYear || (selectedYear === currentYear && m > month)
      const isCurrent = selectedYear === currentYear && m === month
      const isPast = selectedYear < currentYear || (selectedYear === currentYear && m < month)

      const data = buildMonthData(m, selectedYear, transactions, recurringTransactions, month, currentYear)
      runningBalance += data.balance

      return {
        month: format(new Date(selectedYear, i), 'MMM', { locale: ptBR }).replace('.', ''),
        monthFull: format(new Date(selectedYear, i), 'MMMM', { locale: ptBR }),
        m,
        y: selectedYear,
        income: data.income,
        expense: data.expense,
        balance: data.balance,
        accumulated: runningBalance,
        isCurrent,
        isFuture,
        isPast,
      }
    })
    return rows
  }, [transactions, recurringTransactions, month, currentYear, selectedYear])

  // ── Dados dos gráficos — respeitam o período selecionado ───────────────
  const chartData = useMemo(() => {
    if (chartPeriod === 'year') return annualData

    // Próximos N meses a partir do mês atual
    const months = chartPeriod as number
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(currentYear, (new Date().getMonth()) + i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const data = buildMonthData(m, y, transactions, recurringTransactions, month, currentYear)
      return {
        month: format(d, 'MMM/yy', { locale: ptBR }).replace('.', ''),
        m, y,
        income: data.income,
        expense: data.expense,
        balance: data.balance,
        accumulated: 0, // não usado nesta view
        isCurrent: m === month && y === currentYear,
        isFuture: y > currentYear || (y === currentYear && m > month),
        isPast: y < currentYear || (y === currentYear && m < month),
      }
    })
  }, [annualData, chartPeriod, transactions, recurringTransactions, month, currentYear])

  // ── Últimas movimentações ──────────────────────────────────────────────
  const recentTransactions = transactions.slice(0, 5)

  // ── Próximas contas ────────────────────────────────────────────────────
  const upcomingBills = transactions
    .filter((t) => t.type === 'expense' && (t.status === 'pending' || t.status === 'overdue'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const hasData = transactions.length > 0 || recurringTransactions.length > 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 lg:py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getMonthNameFull(month)} de {year}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onQuickAdd('income')} className="btn-success text-sm">
            <TrendingUp size={16} /> Nova receita
          </button>
          <button onClick={() => onQuickAdd('expense')} className="btn-danger text-sm">
            <TrendingDown size={16} /> Nova despesa
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon={<Wallet size={32} />}
            title="Bem-vindo ao FinancePro!"
            message="Configure seu salário recorrente em Receitas e suas despesas em Despesas para ver a previsão completa."
            action={
              <div className="flex gap-2 flex-wrap justify-center">
                <button onClick={() => onQuickAdd('income')} className="btn-success">
                  <TrendingUp size={16} /> Adicionar receita
                </button>
                <button onClick={() => onQuickAdd('expense')} className="btn-danger">
                  <TrendingDown size={16} /> Adicionar despesa
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {/* ── Cards do mês ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="stat-card">
              <span className="stat-label flex items-center gap-1"><TrendingUp size={13} className="text-green-500" /> Receita</span>
              <span className="stat-value text-green-600 dark:text-green-400">{formatCurrency(monthIncome)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label flex items-center gap-1"><TrendingDown size={13} className="text-red-500" /> Despesas</span>
              <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(monthExpense)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label"><PiggyBank size={13} className="inline mr-1 text-brand-500" />Sobra do mês</span>
              <span className={cn('stat-value', monthBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                {monthBalance >= 0 ? '+' : ''}{formatCurrency(monthBalance)}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label"><Receipt size={13} className="inline mr-1 text-yellow-500" />A pagar</span>
              <span className="stat-value text-yellow-600 dark:text-yellow-400">{formatCurrency(billsPending)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label"><AlertCircle size={13} className="inline mr-1 text-red-500" />Vencidas</span>
              <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(billsOverdue)}</span>
            </div>
          </div>

          {/* ── Planilha Anual ── */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-brand-500" />
                <h3 className="font-semibold">Visão Anual</h3>
                <span className="text-xs text-gray-400">• inclui recorrentes não geradas</span>
              </div>
              {/* Seletor de ano */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedYear(y => y - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  ‹
                </button>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-sm font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedYear(y => y + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left font-medium px-4 py-3 text-gray-500 dark:text-gray-400 w-24">Mês</th>
                    <th className="text-right font-medium px-4 py-3 text-gray-500 dark:text-gray-400">Receita</th>
                    <th className="text-right font-medium px-4 py-3 text-gray-500 dark:text-gray-400">Despesas</th>
                    <th className="text-right font-medium px-4 py-3 text-gray-500 dark:text-gray-400">Sobra</th>
                    <th className="text-right font-medium px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">Acumulado</th>
                    <th className="hidden md:table-cell px-4 py-3 w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {annualData.map((row) => (
                    <tr
                      key={row.m}
                      className={cn(
                        'border-b border-gray-50 dark:border-gray-800/50 transition-colors',
                        row.isCurrent
                          ? 'bg-brand-50/60 dark:bg-brand-900/20'
                          : row.isFuture
                            ? 'opacity-70'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{row.month}</span>
                          {row.isCurrent && (
                            <span className="text-[9px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-semibold">atual</span>
                          )}
                          {row.isFuture && (
                            <span className="text-[9px] text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-full">prev.</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-semibold',
                          row.income > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600',
                        )}>
                          {row.income > 0 ? formatCurrency(row.income) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-semibold',
                          row.expense > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600',
                        )}>
                          {row.expense > 0 ? formatCurrency(row.expense) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(row.income > 0 || row.expense > 0) ? (
                          <span className={cn(
                            'font-bold',
                            row.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                          )}>
                            {row.balance >= 0 ? '+' : ''}{formatCurrency(row.balance)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      {/* Saldo acumulado */}
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {(row.income > 0 || row.expense > 0 || row.accumulated !== 0) ? (
                          <span className={cn(
                            'font-bold',
                            row.accumulated >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400',
                          )}>
                            {row.accumulated >= 0 ? '+' : ''}{formatCurrency(row.accumulated)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      {/* Barra de progresso */}
                      <td className="hidden md:table-cell px-4 py-3">
                        {row.income > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', row.balance >= 0 ? 'bg-green-500' : 'bg-red-500')}
                                style={{ width: `${Math.min((row.expense / row.income) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-400 w-8 text-right">
                              {row.income > 0 ? Math.round((row.expense / row.income) * 100) : 0}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Total do ano */}
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t-2 border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">Total {selectedYear}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(annualData.reduce((s, r) => s + r.income, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(annualData.reduce((s, r) => s + r.expense, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {(() => {
                        const total = annualData.reduce((s, r) => s + r.balance, 0)
                        return (
                          <span className={total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {total >= 0 ? '+' : ''}{formatCurrency(total)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold hidden sm:table-cell">
                      {(() => {
                        const total = annualData.reduce((s, r) => s + r.balance, 0)
                        return (
                          <span className={total >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}>
                            {total >= 0 ? '+' : ''}{formatCurrency(total)}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="hidden md:table-cell" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Gráfico anual ── */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="font-semibold text-base">Receita × Despesas × Sobra</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Seletor de período */}
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 text-xs font-medium">
                  {([
                    { value: 'year', label: `Ano ${selectedYear}` },
                    { value: 3, label: '3 meses' },
                    { value: 6, label: '6 meses' },
                    { value: 12, label: '12 meses' },
                  ] as { value: 'year' | 3 | 6 | 12; label: string }[]).map((p) => (
                    <button
                      key={String(p.value)}
                      onClick={() => setChartPeriod(p.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-md transition-all',
                        chartPeriod === p.value
                          ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {chartPeriod === 'year' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">‹</button>
                    <span className="text-sm font-semibold w-10 text-center">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">›</button>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Receita</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Despesas</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />Sobra</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={3} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f9fafb',
                  }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <ReferenceLine y={0} stroke="#374151" />
                <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[6,6,0,0]} />
                <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[6,6,0,0]} />
                <Bar dataKey="balance" name="Sobra" fill="#6366f1" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Gráfico gastos vs sobra ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base">Gastos × Sobra</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Gastos</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Sobra</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [formatCurrency(v), name]}
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f9fafb',
                  }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  cursor={{ stroke: '#374151', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <ReferenceLine y={0} stroke="#374151" />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Gastos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradExpense)"
                  dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Sobra"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#gradBalance)"
                  dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Próximas contas + Últimas movimentações ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Próximas contas */}
            <div className="card">
              <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                <Receipt size={16} className="text-yellow-500" /> Contas pendentes
              </h3>
              {upcomingBills.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhuma conta pendente</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBills.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">{getCategoryName(t.category_id)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {t.status === 'overdue' && <span className="badge-danger text-[10px]">Vencido</span>}
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Últimas movimentações */}
            <div className="card">
              <h3 className="font-semibold text-base mb-3">Últimas movimentações</h3>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sem movimentações</p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          t.type === 'income'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.description}</p>
                          <p className="text-xs text-gray-400">{getCategoryName(t.category_id)}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold ml-2 shrink-0',
                        t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
