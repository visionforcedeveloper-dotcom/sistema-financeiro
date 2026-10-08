import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, cn } from '../lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  ChevronDown, ChevronUp, Info, CalendarClock,
} from 'lucide-react'
import { addMonths, format, parseISO, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── tipos internos ──────────────────────────────────────────────────────────
interface MonthForecast {
  label: string          // "Jan 2025"
  monthKey: string       // "2025-01"
  month: number
  year: number
  projectedIncome: number
  projectedExpense: number
  balance: number        // sobra do mês (receita - despesa)
  cumulativeBalance: number  // saldo acumulado
  items: ForecastItem[]
}

interface ForecastItem {
  description: string
  amount: number
  type: 'income' | 'expense'
  source: 'recurring' | 'installment' | 'pending' | 'deadline'
  dueDate?: string
}

// ── helpers ─────────────────────────────────────────────────────────────────
function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getMonthName(date: Date) {
  return format(date, 'MMM yyyy', { locale: ptBR }).replace('.', '')
}

// ── componente principal ────────────────────────────────────────────────────
export default function Forecast() {
  const { accounts, transactions, recurringTransactions, getAccountBalance, getCategoryName } = useData()
  const [months, setMonths] = useState(6)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)

  // Saldo atual real de todas as contas
  const currentBalance = accounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0)

  const forecast = useMemo<MonthForecast[]>(() => {
    const result: MonthForecast[] = []
    const today = new Date()
    let cumulativeBalance = currentBalance

    for (let i = 0; i < months; i++) {
      const targetDate = addMonths(today, i)
      const m = targetDate.getMonth() + 1
      const y = targetDate.getFullYear()
      const mk = monthKey(y, m)
      const monthStart = startOfMonth(targetDate)
      const monthEnd = endOfMonth(targetDate)
      const items: ForecastItem[] = []

      // ── 1. Contas recorrentes ──────────────────────────────────────────
      for (const rec of recurringTransactions) {
        const startDate = parseISO(rec.start_date)
        const endDate = rec.end_date ? parseISO(rec.end_date) : null

        // Verifica se a recorrente está ativa neste mês
        if (isAfter(startDate, monthEnd)) continue
        if (endDate && isBefore(endDate, monthStart)) continue

        // Verifica periodicidade
        if (rec.period === 'monthly') {
          items.push({
            description: rec.description,
            amount: rec.amount,
            type: rec.type as 'income' | 'expense',
            source: 'recurring',
            dueDate: `${y}-${String(m).padStart(2, '0')}-${String(rec.due_day).padStart(2, '0')}`,
          })
        } else if (rec.period === 'annual') {
          const startMonth = startDate.getMonth() + 1
          if (startMonth === m) {
            items.push({
              description: rec.description + ' (anual)',
              amount: rec.amount,
              type: rec.type as 'income' | 'expense',
              source: 'recurring',
            })
          }
        } else if (rec.period === 'weekly') {
          // ~4 ocorrências por mês
          items.push({
            description: rec.description + ' (semanal ×4)',
            amount: rec.amount * 4,
            type: rec.type as 'income' | 'expense',
            source: 'recurring',
          })
        }
      }

      // ── 2. Parcelas futuras no mês ─────────────────────────────────────
      const installments = transactions.filter((t) => {
        if (t.type !== 'expense') return false
        if (t.status === 'paid') return false
        const tDate = parseISO(t.date)
        return tDate >= monthStart && tDate <= monthEnd
      })
      for (const inst of installments) {
        // Evitar duplicar com pending (só parceladas que têm grupo)
        if (!inst.installment_group_id) continue
        items.push({
          description: inst.description,
          amount: inst.amount,
          type: 'expense',
          source: 'installment',
          dueDate: inst.date,
        })
      }

      // ── 3. Despesas pendentes/vencidas com data neste mês ─────────────
      const pending = transactions.filter((t) => {
        if (t.type !== 'expense') return false
        if (t.status === 'paid') return false
        if (t.installment_group_id) return false // já contado acima
        const tDate = parseISO(t.date)
        return tDate >= monthStart && tDate <= monthEnd
      })
      for (const p of pending) {
        items.push({
          description: p.description,
          amount: p.amount,
          type: 'expense',
          source: 'pending',
          dueDate: p.date,
        })
      }

      // ── 4. Despesas com prazo de encerramento neste mês ────────────────
      const deadlines = transactions.filter((t) => {
        if (t.type !== 'expense') return false
        if (t.status === 'paid') return false
        if (!t.due_date) return false
        const dd = parseISO(t.due_date)
        return dd >= monthStart && dd <= monthEnd
      })
      for (const d of deadlines) {
        // Só adiciona se ainda não estiver listado como pending neste mês
        const alreadyListed = items.some((it) => it.description === d.description && it.source !== 'deadline')
        if (!alreadyListed) {
          items.push({
            description: d.description + ' ⚠ prazo',
            amount: d.amount,
            type: 'expense',
            source: 'deadline',
            dueDate: d.due_date!,
          })
        }
      }

      // ── 5. Receitas pendentes neste mês ───────────────────────────────
      const pendingIncome = transactions.filter((t) => {
        if (t.type !== 'income') return false
        if (t.status === 'paid') return false
        const tDate = parseISO(t.date)
        return tDate >= monthStart && tDate <= monthEnd
      })
      for (const inc of pendingIncome) {
        items.push({
          description: inc.description,
          amount: inc.amount,
          type: 'income',
          source: 'pending',
          dueDate: inc.date,
        })
      }

      const projectedIncome = items.filter((it) => it.type === 'income').reduce((s, it) => s + it.amount, 0)
      const projectedExpense = items.filter((it) => it.type === 'expense').reduce((s, it) => s + it.amount, 0)
      const balance = projectedIncome - projectedExpense
      cumulativeBalance += balance

      result.push({
        label: getMonthName(targetDate),
        monthKey: mk,
        month: m,
        year: y,
        projectedIncome,
        projectedExpense,
        balance,
        cumulativeBalance,
        items,
      })
    }

    return result
  }, [months, currentBalance, recurringTransactions, transactions, getAccountBalance])

  // Dados para o gráfico de barras
  const chartData = forecast.map((f) => ({
    month: f.label,
    Receitas: f.projectedIncome,
    Despesas: f.projectedExpense,
    Saldo: f.balance,
  }))

  // Dados para o gráfico de linha (saldo acumulado)
  const balanceChartData = [
    { month: 'Hoje', saldo: currentBalance },
    ...forecast.map((f) => ({ month: f.label, saldo: f.cumulativeBalance })),
  ]

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Previsão Financeira</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Projeção baseada em contas recorrentes, parcelas e despesas pendentes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Projetar</span>
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                months === m
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Saldo atual */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
          <Wallet size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo atual</p>
          <p className={cn('text-2xl font-bold', currentBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400')}>
            {formatCurrency(currentBalance)}
          </p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo previsto em {months} meses</p>
          <p className={cn(
            'text-2xl font-bold',
            (forecast[forecast.length - 1]?.cumulativeBalance ?? 0) >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400',
          )}>
            {formatCurrency(forecast[forecast.length - 1]?.cumulativeBalance ?? currentBalance)}
          </p>
        </div>
      </div>

      {/* Aviso se saldo ficará negativo */}
      {forecast.some((f) => f.cumulativeBalance < 0) && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Atenção: saldo negativo previsto</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Com base nas suas despesas recorrentes e pendentes, o saldo ficará negativo em{' '}
              {forecast.filter((f) => f.cumulativeBalance < 0).map((f) => f.label).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico — evolução do saldo acumulado */}
      <div className="card">
        <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
          <CalendarClock size={18} className="text-brand-500" />
          Evolução do saldo previsto
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={balanceChartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
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

      {/* Gráfico — receita x despesa por mês */}
      <div className="card">
        <h3 className="font-semibold text-base mb-4">Receitas x Despesas previstas</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Receitas" fill="#16a34a" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="Saldo" stroke="#5163f6" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards mensais detalhados */}
      <div className="space-y-3">
        <h3 className="font-semibold text-base">Detalhamento por mês</h3>
        {forecast.map((f) => {
          const isExpanded = expandedMonth === f.monthKey
          const isNegative = f.balance < 0
          const isCumNegative = f.cumulativeBalance < 0

          return (
            <div
              key={f.monthKey}
              className={cn(
                'card p-0 overflow-hidden border-2 transition-all',
                isCumNegative
                  ? 'border-red-200 dark:border-red-800'
                  : isNegative
                    ? 'border-yellow-200 dark:border-yellow-800'
                    : 'border-transparent',
              )}
            >
              {/* Header do mês */}
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : f.monthKey)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                {/* Mês */}
                <div className="w-24 shrink-0">
                  <p className="font-semibold capitalize">{f.label}</p>
                  <p className="text-xs text-gray-400">{f.items.length} lançamento{f.items.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Receitas */}
                <div className="flex items-center gap-1.5 min-w-[110px]">
                  <TrendingUp size={15} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Receitas</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(f.projectedIncome)}
                    </p>
                  </div>
                </div>

                {/* Despesas */}
                <div className="flex items-center gap-1.5 min-w-[110px]">
                  <TrendingDown size={15} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Despesas</p>
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(f.projectedExpense)}
                    </p>
                  </div>
                </div>

                {/* Sobra do mês */}
                <div className="flex items-center gap-1.5 min-w-[110px]">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isNegative ? 'bg-red-500' : 'bg-green-500',
                    )}
                  />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sobra</p>
                    <p className={cn(
                      'text-sm font-semibold',
                      isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
                    )}>
                      {formatCurrency(f.balance)}
                    </p>
                  </div>
                </div>

                {/* Saldo acumulado */}
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Saldo acumulado</p>
                  <p className={cn(
                    'text-sm font-bold',
                    isCumNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white',
                  )}>
                    {formatCurrency(f.cumulativeBalance)}
                  </p>
                </div>

                {isExpanded
                  ? <ChevronUp size={18} className="text-gray-400 shrink-0 ml-2" />
                  : <ChevronDown size={18} className="text-gray-400 shrink-0 ml-2" />}
              </button>

              {/* Detalhes expandidos */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                  {f.items.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">Nenhuma previsão para este mês</p>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Receitas */}
                      {f.items.filter((it) => it.type === 'income').length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Receitas previstas
                          </p>
                          {f.items
                            .filter((it) => it.type === 'income')
                            .map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <SourceBadge source={item.source} />
                                  <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                                </div>
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  +{formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))}
                        </>
                      )}

                      {/* Despesas */}
                      {f.items.filter((it) => it.type === 'expense').length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 mt-3">
                            Despesas previstas
                          </p>
                          {f.items
                            .filter((it) => it.type === 'expense')
                            .sort((a, b) => b.amount - a.amount)
                            .map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <SourceBadge source={item.source} />
                                  <span className="text-gray-700 dark:text-gray-300">{item.description}</span>
                                  {item.dueDate && (
                                    <span className="text-xs text-gray-400">
                                      {format(parseISO(item.dueDate), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  -{formatCurrency(item.amount)}
                                </span>
                              </div>
                            ))}
                        </>
                      )}

                      {/* Resumo do mês */}
                      <div className={cn(
                        'mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm font-semibold',
                      )}>
                        <span className="text-gray-600 dark:text-gray-400">Resultado do mês</span>
                        <span className={isNegative ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {f.balance >= 0 ? '+' : ''}{formatCurrency(f.balance)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legenda das fontes */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Legenda</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Recorrente</span>
            <span>Contas recorrentes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Parcela</span>
            <span>Compras parceladas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Pendente</span>
            <span>Lançamentos pendentes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Prazo</span>
            <span>Prazo de encerramento</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceBadge({ source }: { source: ForecastItem['source'] }) {
  const styles: Record<string, string> = {
    recurring: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    installment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    deadline: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }
  const labels: Record<string, string> = {
    recurring: 'Recorrente',
    installment: 'Parcela',
    pending: 'Pendente',
    deadline: 'Prazo',
  }
  return (
    <span className={cn('badge text-[10px] shrink-0', styles[source])}>
      {labels[source]}
    </span>
  )
}
