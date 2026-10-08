import { useState, ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Wallet,
  PieChart,
  Target,
  Calendar,
  FileBarChart,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Plus,
  CalendarClock,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { path: '/income', label: 'Receitas', icon: TrendingUp },
  { path: '/expenses', label: 'Despesas', icon: TrendingDown },
  { path: '/bills', label: 'Contas a pagar', icon: Receipt },
  { path: '/cards', label: 'Cartões', icon: CreditCard },
  { path: '/accounts', label: 'Contas', icon: Wallet },
  { path: '/budget', label: 'Orçamento', icon: PieChart },
  { path: '/goals', label: 'Metas', icon: Target },
  { path: '/calendar', label: 'Calendário', icon: Calendar },
  { path: '/forecast', label: 'Previsão', icon: CalendarClock },
  { path: '/reports', label: 'Relatórios', icon: FileBarChart },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

const mobileNav = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { path: '/accounts', label: 'Contas', icon: Wallet },
  { path: '/reports', label: 'Relatórios', icon: FileBarChart },
]

interface LayoutProps {
  children: ReactNode
  onQuickAdd: () => void
}

export default function Layout({ children, onQuickAdd }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 fixed h-full">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">FinancePro</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                )
              }
            >
              <item.icon size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold tracking-tight">FinancePro</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 overflow-y-auto">
            <nav className="px-3 py-2 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                    )
                  }
                >
                  <item.icon size={19} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <main className="flex-1 pt-14 lg:pt-0 pb-20 lg:pb-6 px-4 lg:px-8">
          {children}
        </main>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={onQuickAdd}
        className="fixed bottom-20 lg:bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center hover:bg-brand-700 active:scale-95 transition-all"
        title="Novo lançamento"
      >
        <Plus size={26} />
      </button>

      {/* Bottom Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 h-16 flex items-center justify-around px-2">
        {mobileNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-400 dark:text-gray-500',
              )
            }
          >
            <item.icon size={22} />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 dark:text-gray-500"
        >
          <Menu size={22} />
          Mais
        </button>
      </nav>

      {/* "Mais" Modal for mobile */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Mais opções</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems
                .filter((item) => !mobileNav.some((mn) => mn.path === item.path))
                .map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setMoreOpen(false)
                    }}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
