import { useData } from '../context/DataContext'
import { formatCurrency, formatDate, isOverdue, getMonthNameFull } from '../lib/utils'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertCircle,
  PiggyBank,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
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
  LineChart,
  Line,
  Legend,
} from 'recharts'
import EmptyState from '../components/EmptyState'
import { getCurrentMonth } from '../lib/utils'

interface DashboardProps {
  onQuickAdd: (type?: 'expense' | 'income' | 'transfer') => void
}

export default function Dashboard({ onQuickAdd }: DashboardProps) {
  const {
    transactions,
    categories,
    getDashboardStats,
    getMonthlyComparison,
    getCategorySpending,
    getBalanceEvolution,
    getCategoryName,
    loading,
  } = useData()

  const stats = getDashboardStats()
  const { month, year } = getCurrentMonth()
  const monthlyData = getMonthlyComparison(6)
  const categoryData = getCategorySpending()
  const balanceData = getBalanceEvolution(6)

  // Upcoming bills (pending expenses with future dates)
  const upcomingBills = transactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .filter((t) => !isOverdue(t.date, t.status))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  // Recent transactions
  const recentTransactions = transactions.slice(0, 6)

  const statCards = [
    {
      label: 'Saldo Atual',
      value: formatCurrency(stats.balance),
      icon: Wallet,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-900/20',
    },
    {
      label: 'Receitas do Mês',
      value: formatCurrency(stats.monthIncome),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Despesas do Mês',
      value: formatCurrency(stats.monthExpense),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      hint: 'Todas as despesas do mês',
    },
    {
      label: 'Contas a Pagar',
      value: formatCurrency(stats.billsToPay),
      icon: Receipt,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Contas Vencidas',
      value: formatCurrency(stats.overdueBills),
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Economia do Mês',
      value: formatCurrency(stats.monthSavings),
      icon: PiggyBank,
      color: stats.monthSavings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bg: stats.monthSavings >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Comprometimento da Renda',
      value: `${stats.incomeCommitment.toFixed(1)}%`,
      icon: Percent,
      color: stats.incomeCommitment > 80 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
      bg: stats.incomeCommitment > 80 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  const hasTransactions = transactions.length > 0

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

      {!hasTransactions ? (
        <div className="card">
          <EmptyState
            icon={<Wallet size={32} />}
            title="Bem-vindo ao FinancePro!"
            message="Comece adicionando suas contas, receitas e despesas para acompanhar sua vida financeira."
            action={
              <div className="flex gap-2">
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
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="stat-label">{card.label}</span>
                    {'hint' in card && card.hint && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{card.hint}</p>
                    )}
                  </div>
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center ${card.color} shrink-0`}>
                    <card.icon size={18} />
                  </div>
                </div>
                <span className={`stat-value ${card.color}`}>{card.value}</span>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income vs Expense Bar Chart */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Receita x Despesa</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-gray-500" />
                  <YAxis tick={{ fontSize: 11 }} className="text-gray-500" />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'var(--card-bg, #fff)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Receita" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Despesa" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expenses by Category Pie Chart */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Despesas por Categoria</h3>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-[280px] text-sm text-gray-400">
                  Sem despesas neste mês
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Balance Evolution Line Chart */}
          <div className="card">
            <h3 className="font-semibold text-base mb-4">Evolução do Saldo</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="#5163f6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Upcoming Bills & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upcoming Bills */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon size={18} className="text-yellow-500" />
                <h3 className="font-semibold text-base">Próximas Contas</h3>
              </div>
              {upcomingBills.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Nenhuma conta pendente</p>
              ) : (
                <div className="space-y-2">
                  {upcomingBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{bill.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(bill.date)} • {getCategoryName(bill.category_id)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400 ml-2 shrink-0">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <h3 className="font-semibold text-base mb-4">Últimas Movimentações</h3>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Sem movimentações</p>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          t.type === 'income'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                            : t.type === 'expense'
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        }`}>
                          {t.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ml-2 shrink-0 ${
                        t.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : t.type === 'expense'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
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
