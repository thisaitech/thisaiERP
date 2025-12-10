import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { Sparkle, ShieldWarning } from '@phosphor-icons/react'
import type { UserRole } from '../services/authService'
import { canAccessPage, type PagePermissions } from '../services/permissionsService'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[] // Optional: restrict to specific roles (legacy, page permissions take priority)
  pageKey?: keyof PagePermissions // Optional: check page-level permissions
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, pageKey }) => {
  const { isAuthenticated, isLoading, userData } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex p-4 bg-gradient-to-br from-primary to-accent rounded-2xl mb-4"
          >
            <Sparkle size={32} weight="duotone" className="text-white" />
          </motion.div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check access - Page permissions take PRIORITY over role-based restrictions
  if (userData) {
    // Admin always has full access
    if (userData.role === 'admin') {
      // Continue to render children
    }
    // Check page-level permissions FIRST (if pageKey provided)
    else if (pageKey) {
      const hasPageAccess = canAccessPage(userData.uid, userData.role, pageKey)
      if (!hasPageAccess) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="inline-flex p-4 bg-red-100 rounded-2xl mb-4">
                <ShieldWarning size={48} weight="duotone" className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
              <p className="text-slate-600 mb-6">
                You don't have permission to access this page. Please contact your administrator.
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Your current role: <span className="font-medium capitalize">{userData.role}</span>
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Go Back
              </button>
            </motion.div>
          </div>
        )
      }
    }
    // Fallback: Check role-based access (legacy, for routes without pageKey)
    else if (allowedRoles && allowedRoles.length > 0) {
      const hasRoleAccess = allowedRoles.includes(userData.role)
      if (!hasRoleAccess) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="inline-flex p-4 bg-red-100 rounded-2xl mb-4">
                <ShieldWarning size={48} weight="duotone" className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
              <p className="text-slate-600 mb-6">
                You don't have permission to access this page. This area is restricted to{' '}
                <span className="font-medium">{allowedRoles.join(' or ')}</span> users only.
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Your current role: <span className="font-medium capitalize">{userData.role}</span>
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Go Back
              </button>
            </motion.div>
          </div>
        )
      }
    }
  }

  // Check if user is inactive
  if (userData?.status === 'inactive') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="inline-flex p-4 bg-yellow-100 rounded-2xl mb-4">
            <ShieldWarning size={48} weight="duotone" className="text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Account Deactivated</h2>
          <p className="text-slate-600 mb-6">
            Your account has been deactivated by an administrator. Please contact your admin to reactivate your account.
          </p>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
