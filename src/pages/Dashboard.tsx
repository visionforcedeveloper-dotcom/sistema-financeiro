import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
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
} from 'recharts'
import EmptyState from '../components/EmptyState'
import {
  addMonths, subMonths, startOfMonth, endOfMonth, parseISO,
  isAfter, isBefore, format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DashboardProps {
  onQuickAdd: (type?: 'expense' | 'income' | 'transfer') => void
}

// Gera dados de um mês: receita real (passado) ou prevista (futuro)
function buildMonthData(
  m: number, y: number,
  transactions: ReturnType<typeof useData>['transactions'],
  recurringTransactions: ReturnType<typeof useData>['recurringTransactions'],
  isFuture: boolean,
) {
  const monthStart = startOfMonth(new Date(y, m - 1))
  const monthEnd = endOfMonth(new Date(y, m - 1))

  if (!isFuture) {
    // Dados reais
    const income = transactions
      .filter((t) => t.type === 'income' && isSameMonth(t.date, m, y))
      .reduce((s, t) => s + t.amount, 0)
    const expense = transactions
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, m, y))
      .reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense, isReal: true }
  }

  // Previsão com base em recorrentes
  let income = 0
  let expense = 0

  for (const rec of recurringTransactions) {
    const start = parseISO(rec.start_date)
    const end = rec.end_date ? parseISO(rec.end_date) : null
    if (isAfter(startOfMonth(start), monthEnd)) continue
    if (end && isBefore(end, monthStart)) continue

    const amount = rec.period === 'weekly' ? rec.amount * 4 : rec.amount
    if (rec.period === 'annual' && (start.getMonth() + 1) !== m) continue

    if (rec.type === 'income') income += amount
    else if (rec.type === 'expense') expense += amount
  }

  // Despesas avulsas com data neste mês (parcelas futuras etc.)
  for (const t of transactions) {
    if (t.type !== 'expense' || t.recurring_id) continue
    const tDate = parseISO(t.date)
    if (tDate >= monthStart && tDate <= monthEnd) expense += t.amount
  }

  return { income, expense, balance: income - expense, isReal: false }
}

export default function Dashboard({ onQuickAdd }: DashboardProps) {
  const {
    transactions,
    recurringTransactions,
    getCategoryName,
    loading,
  } = useData()

  const { month, year: currentYear } = getCurrentMonth()
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Anos disponíveis: 3 anos atrás até 3 anos à frente
  const availableYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)

  // Stats do mês atual (sempre ano/mês atual, não o selecionado)
  const year = currentYear

  // ── Stats do mês atual ───────────────────────────────────────────────
  const monthIncome = transactions
    .filter((t) => t.type === 'income' && isSameMonth(t.date, month, year))
    .reduce((s, t) => s + t.amount, 0)
  const monthExpense = transactions
    .filter((t) => t.type === 'expense' && isSameMonth(t.date, month, year))
    .reduce((s, t) => s + t.amount, 0)
  const monthBalance = monthIncome - monthExpense

  const billsPending = transactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .reduce((s, t) => s + t.amount, 0)
  const billsOverdue = transactions
    .filter((t) => t.type === 'expense' && t.status === 'overdue')
    .reduce((s, t) => s + t.amount, 0)

  // ── Planilha anual (usa o ano selecionado) ────────────────────────────
  const annualData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const y = selectedYear
      const isFuture =
        y > currentYear || (y === currentYear && m > month)
      const isCurrent = y === currentYear && m === month
      const data = buildMonthData(m, y, transactions, recurringTransactions, isFuture)
      return {
        month: format(new Date(y, i), 'MMM', { locale: ptBR }).replace('.', ''),
        monthFull: format(new Date(y, i), 'MMMM', { locale: ptBR }),
        m, y,
        ...data,
        isCurrent,
        isFuture,
      }
    })
  }, [transactions, recurringTransactions, month, currentYear, selectedYear])

  // ── Últimas movimentações ────────────────────────────────────────────
  const recentTransactions = transactions.slice(0, 5)

  // ── Próximas contas ──────────────────────────────────────────────────
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
            message="Configure seu salário recorrente em Receitas e suas despesas fixas em Despesas para ver a previsão completa."
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
              <p className="text-[10px] text-gray-400">Total do mês</p>
            </div>
            <div className="stat-card">
              <span className="stat-label"><PiggyBank size={13} className="inline mr-1 text-brand-500" />Sobra</span>
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
                <span className="text-xs text-gray-400">• reais = passado · prev. = futuro</span>
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
                  className="text-sm font-semibold bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    <th className="hidden sm:table-cell px-4 py-3 w-40"></th>
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
                      {/* Barra de progresso */}
                      <td className="hidden sm:table-cell px-4 py-3">
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
                    <td className="hidden sm:table-cell" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Gráfico anual ── */}
          <div className="card">
            <h3 className="font-semibold text-base mb-4">Receita × Despesas × Sobra — {selectedYear}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={annualData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Bar dataKey="income" name="Receita" fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="expense" name="Despesas" fill="#dc2626" radius={[4,4,0,0]} />
                <Bar dataKey="balance" name="Sobra" fill="#5163f6" radius={[4,4,0,0]} />
              </BarChart>
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
