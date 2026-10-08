import { useState, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import TransactionModal from './components/TransactionModal'

const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Income       = lazy(() => import('./pages/Income'))
const Expenses     = lazy(() => import('./pages/Expenses'))
const BillsToPay   = lazy(() => import('./pages/BillsToPay'))
const CreditCards  = lazy(() => import('./pages/CreditCards'))
const Accounts     = lazy(() => import('./pages/Accounts'))
const Budget       = lazy(() => import('./pages/Budget'))
const Goals        = lazy(() => import('./pages/Goals'))
const Calendar     = lazy(() => import('./pages/Calendar'))
const Reports      = lazy(() => import('./pages/Reports'))
const Settings     = lazy(() => import('./pages/Settings'))
const Forecast     = lazy(() => import('./pages/Forecast'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<'expense' | 'income' | 'transfer' | undefined>()

  const openModal = (type?: 'expense' | 'income' | 'transfer') => {
    setDefaultType(type)
    setModalOpen(true)
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <Layout onQuickAdd={() => openModal()}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/"            element={<Dashboard onQuickAdd={openModal} />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/income"       element={<Income />} />
              <Route path="/expenses"     element={<Expenses />} />
              <Route path="/bills"        element={<BillsToPay />} />
              <Route path="/cards"        element={<CreditCards />} />
              <Route path="/accounts"     element={<Accounts />} />
              <Route path="/budget"       element={<Budget />} />
              <Route path="/goals"        element={<Goals />} />
              <Route path="/calendar"     element={<Calendar />} />
              <Route path="/reports"      element={<Reports />} />
              <Route path="/forecast"     element={<Forecast />} />
              <Route path="/settings"     element={<Settings />} />
            </Routes>
          </Suspense>
        </Layout>
        <TransactionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultType={defaultType}
        />
      </DataProvider>
    </ThemeProvider>
  )
}
