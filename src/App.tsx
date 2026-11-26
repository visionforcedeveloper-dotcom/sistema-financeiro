import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { DataProvider } from './context/DataContext'
import { ApiProvider } from './context/ApiContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import TransactionModal from './components/TransactionModal'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Income    = lazy(() => import('./pages/Income'))
const Expenses  = lazy(() => import('./pages/Expenses'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-200 dark:border-brand-800 border-t-brand-600 rounded-full animate-spin" />
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<'expense' | 'income' | 'transfer' | undefined>()

  const openModal = (type?: 'expense' | 'income' | 'transfer') => {
    setDefaultType(type)
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <DataProvider>
      <ApiProvider>
        <Layout onQuickAdd={() => openModal()}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/"         element={<Dashboard onQuickAdd={openModal} />} />
              <Route path="/income"   element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
        <TransactionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultType={defaultType}
        />
      </ApiProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
