import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateShort(date: string | Date): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM', { locale: ptBR })
}

export function formatMonthYear(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getCurrentMonth(): { month: number; year: number } {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function isOverdue(date: string, status: string): boolean {
  if (status === 'paid') return false
  const due = parseISO(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export function isSameMonth(dateStr: string, month: number, year: number): boolean {
  const d = parseISO(dateStr)
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

export function monthsAgo(months: number): { month: number; year: number } {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export function getMonthName(month: number): string {
  const names = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ]
  return names[month - 1] || ''
}

export function getMonthNameFull(month: number): string {
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return names[month - 1] || ''
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
