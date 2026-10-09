import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, cn } from '../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, AlertTriangle,
  ChevronDown, ChevronUp, Repeat, CreditCard,
} from 'lucide-react'
import {
  addMonths, format, parseISO,
  isBefore, isAfter, startOfMonth, endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ForecastItem {
  description: string
  amount: number
  type: 'income' | 'expense'
  source: 'recurring' | 'installment' | 'avulso'
  dueDay?: number
}

interface MonthForecast {
  label: string
  monthKey: string
  totalIncome: number
  totalExpense: number
  balance: number   // sobra = receita − despesa
  items: ForecastItem[]
}

function mkLabel(date: Date) {
  return format(date, 'MMM yyyy', { locale: ptBR }).replace('.', '')
}

function mkKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

export default function Forecast() {
  const { transactions, recurringTransactions } = useData()
  const [months, setMonths] = useState(6)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  const forecast = useMemo<MonthForecast[]>(() => {
    const result: MonthForecast[] = []
    const today = new Date()

    for (let i = 0; i < months; i++) {
      const target = addMonths(today, i)
      const m = target.getMonth() + 1
      const y = target.getFullYear()
      const monthStart = startOfMonth(target)
      const monthEnd = endOfMonth(target)
      const items: ForecastItem[] = []

      // ── Receitas recorrentes ──────────────────────────────────────────
      for (const rec of recurringTransactions) {
        if (rec.type !== 'income') continue
        const start = parseISO(rec.start_date)
        const end = rec.end_date ? parseISO(rec.end_date) : null
        if (isAfter(startOfMonth(start), monthEnd)) continue
        if (end && isBefore(end, monthStart)) continue
        if (rec.period === 'monthly') {
          items.push({ description: rec.description, amount: rec.amount, type: 'income', source: 'recurring', dueDay: Math.min(rec.due_day, 28) })
        } else if (rec.period === 'annual' && (start.getMonth() + 1) === m) {
          items.push({ description: rec.description + ' (anual)', amount: rec.amount, type: 'income', source: 'recurring' })
        } else if (rec.period === 'weekly') {
          items.push({ description: rec.description + ' (semanal ×4)', amount: rec.amount * 4, type: 'income', source: 'recurring' })
        }
      }

      // ── Despesas recorrentes ──────────────────────────────────────────
      for (const rec of recurringTransactions) {
        if (rec.type !== 'expense') continue
        const start = parseISO(rec.start_date)
        const end = rec.end_date ? parseISO(rec.end_date) : null
        if (isAfter(startOfMonth(start), monthEnd)) continue
        if (end && isBefore(end, monthStart)) continue
        if (rec.period === 'monthly') {
          items.push({ description: rec.description, amount: rec.amount, type: 'expense', source: 'recurring', dueDay: Math.min(rec.due_day, 28) })
        } else if (rec.period === 'annual' && (start.getMonth() + 1) === m) {
          items.push({ description: rec.description + ' (anual)', amount: rec.amount, type: 'expense', source: 'recurring' })
        } else if (rec.period === 'weekly') {
          items.push({ description: rec.description + ' (semanal ×4)', amount: rec.amount * 4, type: 'expense', source: 'recurring' })
        }
      }

      // ── Parcelas com data neste mês ──────────────────────────────────
      for (const t of transactions) {
        if (t.type !== 'expense' || !t.installment_group_id) continue
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        items.push({ description: t.description, amount: t.amount, type: 'expense', source: 'installment', dueDay: tDate.getDate() })
      }

      // ── Despesas avulsas com data neste mês ──────────────────────────
      for (const t of transactions) {
        if (t.type !== 'expense' || t.installment_group_id || t.recurring_id) continue
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        items.push({ description: t.description, amount: t.amount, type: 'expense', source: 'avulso', dueDay: tDate.getDate() })
      }

      // ── Receitas avulsas com data neste mês ──────────────────────────
      for (const t of transactions) {
        if (t.type !== 'income' || t.recurring_id) continue
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        items.push({ description: t.description, amount: t.amount, type: 'income', source: 'avulso', dueDay: tDate.getDate() })
      }

      const totalIncome = items.filter(it => it.type === 'income').reduce((s, it) => s + it.amount, 0)
      const totalExpense = items.filter(it => it.type === 'expense').reduce((s, it) => s + it.amount, 0)

      result.push({
        label: mkLabel(target),
        monthKey: mkKey(y, m),
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        items,
      })
    }
    return result
  }, [months, recurringTransactions, transactions])

  const negativeMonths = forecast.filter(f => f.balance < 0)

  const chartData = forecast.map(f => ({
    month: f.label,
    'Receita': f.totalIncome,
    'Despesas': f.totalExpense,
    'Sobra': f.balance,
  }))

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Previsão Financeira</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receita − Despesas = Sobra do mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Projetar</span>
          {[3, 6, 12].map(m => (
            <button key={m} onClick={() => setMonths(m)} className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              months === m ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            )}>{m}m</button>
          ))}
        </div>
      </div>

      {/* Sem recorrentes configuradas */}
      {recurringTransactions.length === 0 && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Repeat size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Configure seu <strong>salário recorrente</strong> em Receitas e suas <strong>despesas recorrentes</strong> em Despesas para ver a previsão completa.
          </p>
        </div>
      )}

      {/* Alerta meses negativos */}
      {negativeMonths.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Despesas maiores que a receita em: {negativeMonths.map(f => f.label).join(', ')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Revise suas despesas nesses meses.
            </p>
          </div>
        </div>
      )}

      {/* Cards resumo do próximo mês */}
      {forecast[0] && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card border-2 border-green-100 dark:border-green-900/40">
            <span className="stat-label flex items-center gap-1.5"><TrendingUp size={14} className="text-green-500" /> Receita — {forecast[0].label}</span>
            <span className="stat-value text-green-600 dark:text-green-400">{formatCurrency(forecast[0].totalIncome)}</span>
          </div>
          <div className="stat-card border-2 border-red-100 dark:border-red-900/40">
            <span className="stat-label flex items-center gap-1.5"><TrendingDown size={14} className="text-red-500" /> Despesas — {forecast[0].label}</span>
            <span className="stat-value text-red-600 dark:text-red-400">{formatCurrency(forecast[0].totalExpense)}</span>
          </div>
          <div className={cn('stat-card border-2', forecast[0].balance >= 0 ? 'border-green-100 dark:border-green-900/40' : 'border-red-100 dark:border-red-900/40')}>
            <span className="stat-label">Sobra — {forecast[0].label}</span>
            <span className={cn('stat-value', forecast[0].balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
              {forecast[0].balance >= 0 ? '+' : ''}{formatCurrency(forecast[0].balance)}
            </span>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div className="card">
        <h3 className="font-semibold text-base mb-4">Receita × Despesas × Sobra</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="Receita" fill="#16a34a" radius={[6,6,0,0]} />
            <Bar dataKey="Despesas" fill="#dc2626" radius={[6,6,0,0]} />
            <Bar dataKey="Sobra" fill="#5163f6" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detalhamento mês a mês */}
      <div className="space-y-3">
        <h3 className="font-semibold text-base">Detalhamento mês a mês</h3>
        {forecast.map(f => {
          const isExpanded = expandedMonth === f.monthKey
          const isNeg = f.balance < 0
          const incomeItems = f.items.filter(it => it.type === 'income').sort((a,b) => b.amount - a.amount)
          const expenseItems = f.items.filter(it => it.type === 'expense').sort((a,b) => b.amount - a.amount)

          return (
            <div key={f.monthKey} className={cn(
              'card p-0 overflow-hidden border-2 transition-all',
              isNeg ? 'border-red-200 dark:border-red-800' : 'border-transparent',
            )}>
              {/* Linha clicável */}
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : f.monthKey)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                {/* Mês */}
                <div className="w-20 shrink-0">
                  <p className="font-semibold capitalize text-sm">{f.label}</p>
                  <p className="text-[11px] text-gray-400">{f.items.length} item{f.items.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Receita */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Receita</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(f.totalIncome)}</p>
                </div>

                {/* Despesas */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Despesas</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(f.totalExpense)}</p>
                </div>

                {/* Sobra */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Sobra</p>
                  <p className={cn('text-sm font-bold', isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
                    {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                  </p>
                </div>

                {isExpanded ? <ChevronUp size={17} className="text-gray-400 shrink-0" /> : <ChevronDown size={17} className="text-gray-400 shrink-0" />}
              </button>

              {/* Detalhe */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">

                  {/* Receitas */}
                  {incomeItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <TrendingUp size={12} /> Receitas
                      </p>
                      {incomeItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <SBadge source={item.source} type="income" />
                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.description}</span>
                            {item.dueDay && <span className="text-xs text-gray-400 shrink-0">dia {item.dueDay}</span>}
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400 ml-2 shrink-0">+{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Despesas */}
                  {expenseItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <TrendingDown size={12} /> Despesas
                      </p>
                      {expenseItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <SBadge source={item.source} type="expense" />
                            <span className="text-gray-700 dark:text-gray-300 truncate">{item.description}</span>
                            {item.dueDay && <span className="text-xs text-gray-400 shrink-0">dia {item.dueDay}</span>}
                          </div>
                          <span className="font-semibold text-red-600 dark:text-red-400 ml-2 shrink-0">-{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mini resumo */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Receita total</span>
                      <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(f.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Despesas totais</span>
                      <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(f.totalExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-bold">
                      <span>Sobra do mês</span>
                      <span className={isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                        {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SBadge({ source, type }: { source: ForecastItem['source']; type: 'income' | 'expense' }) {
  if (source === 'recurring') return (
    <span className={cn('badge text-[10px] shrink-0 flex items-center gap-0.5',
      type === 'income'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    )}><Repeat size={9} />Recorrente</span>
  )
  if (source === 'installment') return (
    <span className="badge text-[10px] shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-0.5">
      <CreditCard size={9} />Parcela
    </span>
  )
  return <span className="badge text-[10px] shrink-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Avulso</span>
}
