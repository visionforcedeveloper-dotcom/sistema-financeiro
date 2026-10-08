import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { formatCurrency, cn } from '../lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  X,
} from 'lucide-react'
import type { Transaction } from '../types'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function Calendar() {
  const { transactions, getCategoryName, loading } = useData()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const getDayTransactions = (date: Date): Transaction[] => {
    return transactions.filter((t) => {
      const tDate = parseISO(t.date)
      return isSameDay(tDate, date)
    })
  }

  const selectedDayTransactions = selectedDate ? getDayTransactions(selectedDate) : []

  const hasIncome = (date: Date) =>
    getDayTransactions(date).some((t) => t.type === 'income')
  const hasExpense = (date: Date) =>
    getDayTransactions(date).some((t) => t.type === 'expense')
  const hasPending = (date: Date) =>
    getDayTransactions(date).some((t) => t.status === 'pending')

  return (
    <div className="space-y-5 max-w-7xl mx-auto py-2 lg:py-6">
      <h1 className="text-2xl font-bold tracking-tight">Calendário Financeiro</h1>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Despesas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">Pendentes</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, -1))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Hoje
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const inMonth = isSameMonth(day, currentDate)
            const isToday = isSameDay(day, new Date())
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const dayTransactions = getDayTransactions(day)
            const dayTotal = dayTransactions.reduce((sum, t) => {
              if (t.type === 'income') return sum + t.amount
              if (t.type === 'expense') return sum - t.amount
              return sum
            }, 0)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'min-h-[60px] sm:min-h-[80px] p-1.5 rounded-xl text-left transition-all relative',
                  !inMonth && 'opacity-30',
                  isSelected
                    ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800',
                  isToday && !isSelected && 'bg-brand-50/50 dark:bg-brand-900/10',
                )}
              >
                <span className={cn(
                  'text-xs font-medium block',
                  isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300',
                )}>
                  {format(day, 'd')}
                </span>
                {/* Indicators */}
                <div className="flex gap-0.5 mt-1 flex-wrap">
                  {hasIncome(day) && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {hasExpense(day) && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  {hasPending(day) && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                </div>
                {/* Amount on larger screens */}
                {dayTransactions.length > 0 && (
                  <p className={cn(
                    'text-[10px] font-semibold mt-0.5 hidden sm:block truncate',
                    dayTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                  )}>
                    {formatCurrency(Math.abs(dayTotal)).replace('R$', '')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day transactions */}
      {selectedDate && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} />
            </button>
          </div>
          {selectedDayTransactions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum lançamento neste dia</p>
          ) : (
            <div className="space-y-2">
              {selectedDayTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      t.type === 'income'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : t.type === 'expense'
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                    )}>
                      {t.type === 'income' ? <TrendingUp size={16} /> : t.type === 'expense' ? <TrendingDown size={16} /> : <Receipt size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-gray-500">
                        {getCategoryName(t.category_id)} • {t.status === 'paid' ? '✓ Pago' : t.status === 'pending' ? '⏳ Pendente' : '⚠ Vencido'}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold',
                    t.type === 'income' ? 'text-green-600 dark:text-green-400'
                      : t.type === 'expense' ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400',
                  )}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
