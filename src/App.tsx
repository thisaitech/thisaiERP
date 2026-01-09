import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AIAssistantProvider } from './contexts/AIAssistantContext'
import { CelebrationProvider } from './components/Celebrations'
import { LanguageProvider } from './contexts/LanguageContext'
import { POSSessionProvider } from './contexts/POSSessionContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Purchases from './pages/Purchases'
import Parties from './pages/Parties'
import Inventory from './pages/Inventory'
import ReportsNew from './pages/ReportsNew'
import Expenses from './pages/Expenses'
import OnlineStore from './pages/OnlineStore'
import Banking from './pages/Banking'
// Utilities moved to Settings page
import Settings from './pages/Settings'
import Quotations from './pages/Quotations'
import More from './pages/More'
import PartyStatement from './pages/PartyStatement'
import CreditNotes from './pages/CreditNotes'
import Returns from './pages/Returns'
import PaymentSuccess from './pages/PaymentSuccess'
import CompanyInfo from './pages/CompanyInfo'
import Profile from './pages/Profile'
import ToastCleaner from './components/ToastCleaner'
import OfflineIndicator from './components/OfflineIndicator'
import { Toaster } from 'sonner'
import { Toaster as HotToaster } from 'react-hot-toast'
import { initSyncService } from './services/syncService'
import { initOfflineDB } from './services/offlineDB'
import { PWAUpdateReady } from './components/PWAUpdateReady'
// CRM Module
import CRMPage from './crm/pages/CRMPage'
// Super Admin
import SuperAdmin from './pages/SuperAdmin'

function App() {
  // Initialize offline services on app mount
  useEffect(() => {
    const initOfflineServices = async () => {
      try {
        // Initialize IndexedDB
        await initOfflineDB()
        console.log('✅ Offline database ready')

        // Initialize sync service
        initSyncService()
        console.log('✅ Sync service initialized')

      } catch (error) {
        console.error('Failed to initialize offline services:', error)
      }
    }

    initOfflineServices()
  }, [])

  // Prevent mouse wheel from changing number input values globally
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        // Blur the input to prevent value change, or just prevent default
        target.blur()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [])
  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <POSSessionProvider>
            <AuthProvider>
              <AIAssistantProvider>
                <CelebrationProvider>
                  <div className="min-h-screen bg-background text-foreground overflow-x-hidden max-w-[100vw]">
                    <PWAUpdateReady />
                    <ToastCleaner />
                    <OfflineIndicator position="bottom-left" />
                    <Toaster
                      position="top-center"
                      richColors
                      closeButton
                      duration={3000}
                      visibleToasts={1}
                      toastOptions={{
                        className: 'font-medium',
                        style: {
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                        }
                      }}
                    />
                    <HotToaster
                      position="top-center"
                      toastOptions={{
                        className: 'font-medium',
                        style: {
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '16px',
                        },
                        success: {
                          iconTheme: {
                            primary: '#10b981',
                            secondary: 'white',
                          },
                        },
                      }}
                    />
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/setup" element={<Setup />} />
                      <Route path="/payment-success" element={<PaymentSuccess />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        {/* All routes use pageKey for permission checking (configured in Settings > Page Permissions) */}
                        <Route index element={<ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>} />
                        <Route path="sales" element={<ProtectedRoute pageKey="sales"><Sales /></ProtectedRoute>} />
                        <Route path="pos" element={<ProtectedRoute pageKey="pos"><Sales /></ProtectedRoute>} />
                        <Route path="quotations" element={<ProtectedRoute pageKey="quotations"><Quotations /></ProtectedRoute>} />

                        {/* These pages check page permissions (admin can grant access to any role) */}
                        <Route path="purchases" element={<ProtectedRoute pageKey="purchases"><Purchases /></ProtectedRoute>} />
                        <Route path="expenses" element={<ProtectedRoute pageKey="expenses"><Expenses /></ProtectedRoute>} />
                        <Route path="parties" element={<ProtectedRoute pageKey="parties"><Parties /></ProtectedRoute>} />
                        <Route path="party-statement" element={<ProtectedRoute pageKey="parties"><PartyStatement /></ProtectedRoute>} />
                        <Route path="credit-notes" element={<ProtectedRoute pageKey="sales"><CreditNotes /></ProtectedRoute>} />
                        <Route path="returns" element={<ProtectedRoute pageKey="sales"><Returns /></ProtectedRoute>} />
                        <Route path="inventory" element={<ProtectedRoute pageKey="inventory"><Inventory /></ProtectedRoute>} />
                        <Route path="reports" element={<ProtectedRoute pageKey="reports"><ReportsNew /></ProtectedRoute>} />
                        <Route path="banking" element={<ProtectedRoute pageKey="banking"><Banking /></ProtectedRoute>} />

                        {/* Utilities moved to Settings page */}

                        {/* Admin only - Settings */}
                        <Route path="settings" element={<ProtectedRoute pageKey="settings"><Settings /></ProtectedRoute>} />
                        <Route path="company-info" element={<ProtectedRoute pageKey="settings"><CompanyInfo /></ProtectedRoute>} />

                        {/* Other pages */}
                        <Route path="profile" element={<Profile />} />
                        <Route path="online-store" element={<OnlineStore />} />
                        <Route path="more" element={<ProtectedRoute pageKey="others"><More /></ProtectedRoute>} />

                        {/* CRM Module */}
                        <Route path="crm" element={<CRMPage />} />

                        {/* Super Admin - Hidden route for managing subscriptions */}
                        <Route path="super-admin" element={<SuperAdmin />} />
                      </Route>
                    </Routes>
                  </div>
                </CelebrationProvider>
              </AIAssistantProvider>
            </AuthProvider>
          </POSSessionProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
