import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import ToastCleaner from './components/ToastCleaner'
import { Toaster } from 'sonner'

const Layout = React.lazy(() => import('./components/Layout'))
const Login = React.lazy(() => import('./pages/Login'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const Sales = React.lazy(() => import('./pages/Sales'))
const Parties = React.lazy(() => import('./pages/Parties'))
const Inventory = React.lazy(() => import('./pages/Inventory'))
const ReportsNew = React.lazy(() => import('./pages/ReportsNew'))
const Expenses = React.lazy(() => import('./pages/Expenses'))
const Banking = React.lazy(() => import('./pages/Banking'))
const Settings = React.lazy(() => import('./pages/Settings'))
const Quotations = React.lazy(() => import('./pages/Quotations'))
const CompanyInfo = React.lazy(() => import('./pages/CompanyInfo'))
const CRM = React.lazy(() => import('./pages/CRM'))

function App() {
  const fallback = (
    <div className="min-h-screen flex items-center justify-center bg-[#e4ebf5] dark:bg-slate-900 text-slate-700 dark:text-slate-200">
      Loading...
    </div>
  )

  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground overflow-x-hidden max-w-[100vw]">
              <ToastCleaner />
              <Toaster
                position="top-center"
                richColors
                closeButton
                duration={3000}
                visibleToasts={1}
                toastOptions={{
                  className: 'font-medium',
                  style: {
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                  },
                }}
              />

              <Suspense fallback={fallback}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>} />
                    <Route path="sales" element={<ProtectedRoute pageKey="sales"><Sales /></ProtectedRoute>} />
                    <Route path="inventory" element={<ProtectedRoute pageKey="inventory"><Inventory /></ProtectedRoute>} />
                    <Route path="parties" element={<ProtectedRoute pageKey="parties"><Parties /></ProtectedRoute>} />
                    <Route path="expenses" element={<ProtectedRoute pageKey="expenses"><Expenses /></ProtectedRoute>} />
                    <Route path="quotations" element={<ProtectedRoute pageKey="quotations"><Quotations /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute pageKey="reports"><ReportsNew /></ProtectedRoute>} />
                    <Route path="banking" element={<ProtectedRoute pageKey="banking"><Banking /></ProtectedRoute>} />
                    <Route path="crm" element={<ProtectedRoute pageKey="crm"><CRM /></ProtectedRoute>} />

                    {/* Admin only */}
                    <Route path="settings" element={<ProtectedRoute pageKey="settings"><Settings /></ProtectedRoute>} />
                    <Route path="company-info" element={<ProtectedRoute pageKey="settings"><CompanyInfo /></ProtectedRoute>} />

                    {/* Backward compatibility */}
                    <Route path="profile" element={<Navigate to="/" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App

