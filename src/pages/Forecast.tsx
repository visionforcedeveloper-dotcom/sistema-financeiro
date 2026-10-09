import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, cn, formatDate } from '../lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  ChevronDown, ChevronUp, CalendarClock, Repeat,
  CreditCard,
} from 'lucide-react'
import {
  addMonths, format, parseISO,
  isBefore, isAfter, startOfMonth, endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── tipos ────────────────────────────────────────────────────────────────────
interface ForecastItem {
  description: string
  amount: number
  type: 'income' | 'expense'
  source: 'recurring' | 'installment' | 'pending'
  dueDate?: string
}

interface MonthForecast {
  label: string
  monthKey: string
  month: number
  year: number
  totalIncome: number       // receitas do mês
  totalExpense: number      // despesas do mês
  balance: number           // sobra = receita − despesa
  cumulativeBalance: number // saldo acumulado
  items: ForecastItem[]
}

// ── helpers ──────────────────────────────────────────────────────────────────
function mkLabel(date: Date) {
  return format(date, 'MMM yyyy', { locale: ptBR }).replace('.', '')
}

function mkKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

// ── componente ───────────────────────────────────────────────────────────────
export default function Forecast() {
  const {
    accounts,
    transactions,
    recurringTransactions,
    getAccountBalance,
  } = useData()

  const [months, setMonths] = useState(6)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  // Saldo atual real
  const currentBalance = accounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0)

  const forecast = useMemo<MonthForecast[]>(() => {
    const result: MonthForecast[] = []
    const today = new Date()
    let cumulative = currentBalance

    for (let i = 0; i < months; i++) {
      const target = addMonths(today, i)
      const m = target.getMonth() + 1
      const y = target.getFullYear()
      const monthStart = startOfMonth(target)
      const monthEnd = endOfMonth(target)
      const items: ForecastItem[] = []

      // ── 1. Receitas recorrentes (salário etc.) ──────────────────────────
      for (const rec of recurringTransactions) {
        if (rec.type !== 'income') continue
        const start = parseISO(rec.start_date)
        const end = rec.end_date ? parseISO(rec.end_date) : null
        // A recorrente precisa ter começado antes do fim do mês
        if (isAfter(startOfMonth(start), monthEnd)) continue
        // E não ter terminado antes do início do mês
        if (end && isBefore(end, monthStart)) continue

        if (rec.period === 'monthly') {
          items.push({
            description: rec.description,
            amount: rec.amount,
            type: 'income',
            source: 'recurring',
            dueDate: `${y}-${String(m).padStart(2, '0')}-${String(Math.min(rec.due_day, 28)).padStart(2, '0')}`,
          })
        } else if (rec.period === 'annual') {
          // Só inclui no mês de aniversário (mesmo mês do start_date)
          if ((start.getMonth() + 1) === m) {
            items.push({ description: rec.description + ' (anual)', amount: rec.amount, type: 'income', source: 'recurring' })
          }
        } else if (rec.period === 'weekly') {
          items.push({ description: rec.description + ' (semanal ×4)', amount: rec.amount * 4, type: 'income', source: 'recurring' })
        }
      }

      // ── 2. Despesas recorrentes (aluguel, internet etc.) ────────────────
      for (const rec of recurringTransactions) {
        if (rec.type !== 'expense') continue
        const start = parseISO(rec.start_date)
        const end = rec.end_date ? parseISO(rec.end_date) : null
        // A recorrente precisa ter começado antes do fim do mês
        if (isAfter(startOfMonth(start), monthEnd)) continue
        // E não ter terminado antes do início do mês
        if (end && isBefore(end, monthStart)) continue

        if (rec.period === 'monthly') {
          items.push({
            description: rec.description,
            amount: rec.amount,
            type: 'expense',
            source: 'recurring',
            dueDate: `${y}-${String(m).padStart(2, '0')}-${String(Math.min(rec.due_day, 28)).padStart(2, '0')}`,
          })
        } else if (rec.period === 'annual') {
          if ((start.getMonth() + 1) === m) {
            items.push({ description: rec.description + ' (anual)', amount: rec.amount, type: 'expense', source: 'recurring' })
          }
        } else if (rec.period === 'weekly') {
          items.push({ description: rec.description + ' (semanal ×4)', amount: rec.amount * 4, type: 'expense', source: 'recurring' })
        }
      }

      // ── 3. Parcelas futuras não pagas ───────────────────────────────────
      for (const t of transactions) {
        if (t.type !== 'expense') continue
        if (t.status === 'paid') continue
        if (!t.installment_group_id) continue
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        // Evitar duplicar se já existe recorrente com mesmo nome
        items.push({
          description: t.description,
          amount: t.amount,
          type: 'expense',
          source: 'installment',
          dueDate: t.date,
        })
      }

      // ── 4. Despesas avulsas pendentes/vencidas com data neste mês ───────
      for (const t of transactions) {
        if (t.type !== 'expense') continue
        if (t.status === 'paid') continue
        if (t.installment_group_id) continue // já contado acima
        if (t.recurring_id) continue         // já contado nas recorrentes
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        items.push({
          description: t.description,
          amount: t.amount,
          type: 'expense',
          source: 'pending',
          dueDate: t.date,
        })
      }

      // ── 5. Receitas avulsas pendentes com data neste mês ────────────────
      for (const t of transactions) {
        if (t.type !== 'income') continue
        if (t.status === 'paid') continue
        if (t.recurring_id) continue
        const tDate = parseISO(t.date)
        if (tDate < monthStart || tDate > monthEnd) continue
        items.push({
          description: t.description,
          amount: t.amount,
          type: 'income',
          source: 'pending',
          dueDate: t.date,
        })
      }

      const totalIncome = items.filter(it => it.type === 'income').reduce((s, it) => s + it.amount, 0)
      const totalExpense = items.filter(it => it.type === 'expense').reduce((s, it) => s + it.amount, 0)
      const balance = totalIncome - totalExpense
      cumulative += balance

      result.push({
        label: mkLabel(target),
        monthKey: mkKey(y, m),
        month: m,
        year: y,
        totalIncome,
        totalExpense,
        balance,
        cumulativeBalance: cumulative,
        items,
      })
    }

    return result
  }, [months, currentBalance, recurringTransactions, transactions])

  // dados para gráficos
  const barData = forecast.map(f => ({
    month: f.label,
    'Receita': f.totalIncome,
    'Despesas': f.totalExpense,
    'Sobra': f.balance,
  }))

  const lineData = [
    { month: 'Hoje', saldo: currentBalance },
    ...forecast.map(f => ({ month: f.label, saldo: f.cumulativeBalance })),
  ]

  const lastBalance = forecast[forecast.length - 1]?.cumulativeBalance ?? currentBalance
  const negativeMonths = forecast.filter(f => f.cumulativeBalance < 0)

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Previsão Financeira</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Salário − despesas = sobra, mês a mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Projetar</span>
          {[3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                months === m
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Aviso sem recorrentes */}
      {recurringTransactions.length === 0 && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Repeat size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Configure seu <strong>salário recorrente</strong> em Receitas e suas <strong>despesas recorrentes</strong> em Despesas para ver a previsão correta.
          </p>
        </div>
      )}

      {/* Alerta saldo negativo */}
      {negativeMonths.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Saldo negativo previsto em {negativeMonths.map(f => f.label).join(', ')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Suas despesas superam as receitas nesses meses.
            </p>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="stat-label">Saldo hoje</span>
          <span className={cn('stat-value', currentBalance >= 0 ? '' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(currentBalance)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Receita mensal prev.</span>
          <span className="stat-value text-green-600 dark:text-green-400">
            {formatCurrency(forecast[0]?.totalIncome ?? 0)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Despesa mensal prev.</span>
          <span className="stat-value text-red-600 dark:text-red-400">
            {formatCurrency(forecast[0]?.totalExpense ?? 0)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sobra mensal prev.</span>
          <span className={cn(
            'stat-value',
            (forecast[0]?.balance ?? 0) >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400',
          )}>
            {formatCurrency(forecast[0]?.balance ?? 0)}
          </span>
        </div>
      </div>

      {/* Gráfico de barras: Receita x Despesas x Sobra */}
      <div className="card">
        <h3 className="font-semibold text-base mb-4">Receita, Despesas e Sobra por mês</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="Receita" fill="#16a34a" radius={[6,6,0,0]} />
            <Bar dataKey="Despesas" fill="#dc2626" radius={[6,6,0,0]} />
            <Bar dataKey="Sobra" fill="#5163f6" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de linha: evolução do saldo */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <CalendarClock size={18} className="text-brand-500" />
            Evolução do saldo acumulado
          </h3>
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo em {months} meses</p>
            <p className={cn(
              'text-lg font-bold',
              lastBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}>
              {formatCurrency(lastBalance)}
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Zero', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Saldo acumulado"
              stroke="#5163f6"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detalhamento mês a mês */}
      <div className="space-y-3">
        <h3 className="font-semibold text-base">Detalhamento mês a mês</h3>
        {forecast.map(f => {
          const isExpanded = expandedMonth === f.monthKey
          const isNeg = f.balance < 0
          const isCumNeg = f.cumulativeBalance < 0
          const incomeItems = f.items.filter(it => it.type === 'income')
          const expenseItems = f.items.filter(it => it.type === 'expense').sort((a,b) => b.amount - a.amount)

          return (
            <div
              key={f.monthKey}
              className={cn(
                'card p-0 overflow-hidden border-2 transition-all',
                isCumNeg ? 'border-red-200 dark:border-red-800'
                  : isNeg ? 'border-yellow-200 dark:border-yellow-800'
                  : 'border-transparent',
              )}
            >
              {/* Linha resumo */}
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : f.monthKey)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                {/* Mês */}
                <div className="w-20 shrink-0">
                  <p className="font-semibold capitalize text-sm">{f.label}</p>
                  <p className="text-[11px] text-gray-400">{f.items.length} item{f.items.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Receita */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <TrendingUp size={14} className="text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Receita</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 truncate">
                      {formatCurrency(f.totalIncome)}
                    </p>
                  </div>
                </div>

                {/* Despesas */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <TrendingDown size={14} className="text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Despesas</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 truncate">
                      {formatCurrency(f.totalExpense)}
                    </p>
                  </div>
                </div>

                {/* Sobra */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', isNeg ? 'bg-red-500' : 'bg-green-500')} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Sobra</p>
                    <p className={cn(
                      'text-sm font-bold truncate',
                      isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                    )}>
                      {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                    </p>
                  </div>
                </div>

                {/* Saldo acumulado */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Saldo acumulado</p>
                  <p className={cn(
                    'text-sm font-bold',
                    isCumNeg ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white',
                  )}>
                    {formatCurrency(f.cumulativeBalance)}
                  </p>
                </div>

                {isExpanded
                  ? <ChevronUp size={17} className="text-gray-400 shrink-0 ml-1" />
                  : <ChevronDown size={17} className="text-gray-400 shrink-0 ml-1" />}
              </button>

              {/* Detalhe expandido */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">

                  {/* Receitas */}
                  {incomeItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <TrendingUp size={13} /> Receitas
                      </p>
                      {incomeItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <SourceBadge source={item.source} type="income" />
                            <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                            {item.dueDate && (
                              <span className="text-xs text-gray-400">
                                dia {parseISO(item.dueDate).getDate()}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            +{formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Despesas */}
                  {expenseItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <TrendingDown size={13} /> Despesas
                      </p>
                      {expenseItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <SourceBadge source={item.source} type="expense" />
                            <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                            {item.dueDate && (
                              <span className="text-xs text-gray-400">
                                dia {parseISO(item.dueDate).getDate()}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            -{formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resumo do mês */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Total receitas</span>
                      <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(f.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Total despesas</span>
                      <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(f.totalExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700 font-semibold">
                      <span>Sobra do mês</span>
                      <span className={isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                        {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Saldo acumulado</span>
                      <span className={isCumNeg ? 'text-red-600 dark:text-red-400' : ''}>
                        {formatCurrency(f.cumulativeBalance)}
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

// ── Badge de origem ───────────────────────────────────────────────────────────
function SourceBadge({ source, type }: { source: ForecastItem['source']; type: 'income' | 'expense' }) {
  if (source === 'recurring') {
    return (
      <span className={cn(
        'badge text-[10px] flex items-center gap-0.5',
        type === 'income'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      )}>
        <Repeat size={9} /> Recorrente
      </span>
    )
  }
  if (source === 'installment') {
    return (
      <span className="badge text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-0.5">
        <CreditCard size={9} /> Parcela
      </span>
    )
  }
  return (
    <span className="badge text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
      Pendente
    </span>
  )
}
