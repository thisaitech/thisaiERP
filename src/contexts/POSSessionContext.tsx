// POS Session Context - For multi-tab independent POS billing
// Each browser tab gets its own unique session, allowing multiple cashiers to bill simultaneously

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

// Generate unique session ID for this browser tab
const generateSessionId = () => {
  return 'pos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// Get or create session ID for this tab (stored in sessionStorage - per tab)
const getTabSessionId = (): string => {
  let sessionId = sessionStorage.getItem('thisai_pos_session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem('thisai_pos_session_id', sessionId)
  }
  return sessionId
}

// Cart item interface
export interface POSCartItem {
  id: string
  name: string
  price: number
  quantity: number
  gstRate?: number
  unit?: string
  hsn?: string
}

// Session data interface
export interface POSSessionData {
  cart: POSCartItem[]
  customerId?: string
  customerName?: string
  customerPhone?: string
  paymentMethod?: 'cash' | 'upi' | 'card' | 'credit'
  createdAt: number
  lastUpdated: number
}

// All sessions storage key
const SESSIONS_KEY = 'thisai_pos_sessions'

// Get all sessions from localStorage
const getAllSessions = (): Record<string, POSSessionData> => {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// Save all sessions to localStorage
const saveAllSessions = (sessions: Record<string, POSSessionData>) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

// Context type
interface POSSessionContextType {
  sessionId: string
  shortId: string // Last 6 chars for display
  cart: POSCartItem[]
  customerName: string
  customerPhone: string
  customerId?: string
  addToCart: (item: POSCartItem) => void
  updateCartItem: (itemId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  setCustomer: (id: string | undefined, name: string, phone: string) => void
  clearSession: () => void
  getAllActiveSessions: () => { id: string; shortId: string; itemCount: number; total: number; createdAt: number }[]
  switchToSession: (sessionId: string) => void
  createNewSession: () => string
}

const POSSessionContext = createContext<POSSessionContextType | undefined>(undefined)

export const POSSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get unique session ID for this tab
  const [sessionId] = useState<string>(() => getTabSessionId())
  const shortId = sessionId.slice(-6)

  // Initialize session data from localStorage
  const [sessionData, setSessionData] = useState<POSSessionData>(() => {
    const sessions = getAllSessions()
    if (sessions[sessionId]) {
      return sessions[sessionId]
    }
    // Create new session
    const newSession: POSSessionData = {
      cart: [],
      customerName: '',
      customerPhone: '',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }
    return newSession
  })

  // Save session data to localStorage whenever it changes
  useEffect(() => {
    const sessions = getAllSessions()
    sessions[sessionId] = {
      ...sessionData,
      lastUpdated: Date.now()
    }
    saveAllSessions(sessions)
  }, [sessionId, sessionData])

  // Clean up old sessions (older than 24 hours)
  useEffect(() => {
    const cleanup = () => {
      const sessions = getAllSessions()
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      let hasChanges = false
      Object.keys(sessions).forEach(id => {
        if (id !== sessionId && now - sessions[id].lastUpdated > maxAge) {
          delete sessions[id]
          hasChanges = true
        }
      })

      if (hasChanges) {
        saveAllSessions(sessions)
      }
    }
    cleanup()
  }, [sessionId])

  // Auto cleanup when tab closes - Remove empty sessions only
  // (Keep sessions with items so they can be recovered if tab was closed accidentally)
  useEffect(() => {
    const handleTabClose = () => {
      const sessions = getAllSessions()
      const currentSession = sessions[sessionId]

      // Only remove session if cart is empty (completed sale or abandoned empty cart)
      if (currentSession && currentSession.cart.length === 0) {
        delete sessions[sessionId]
        saveAllSessions(sessions)
      }
    }

    window.addEventListener('beforeunload', handleTabClose)
    return () => window.removeEventListener('beforeunload', handleTabClose)
  }, [sessionId])

  // Cart operations
  const addToCart = useCallback((item: POSCartItem) => {
    setSessionData(prev => {
      const existingIndex = prev.cart.findIndex(i => i.id === item.id)
      if (existingIndex >= 0) {
        // Update quantity if item exists
        const newCart = [...prev.cart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + (item.quantity || 1)
        }
        return { ...prev, cart: newCart }
      } else {
        // Add new item
        return { ...prev, cart: [...prev.cart, { ...item, quantity: item.quantity || 1 }] }
      }
    })
  }, [])

  const updateCartItem = useCallback((itemId: string, quantity: number) => {
    setSessionData(prev => {
      if (quantity <= 0) {
        return { ...prev, cart: prev.cart.filter(i => i.id !== itemId) }
      }
      return {
        ...prev,
        cart: prev.cart.map(i => i.id === itemId ? { ...i, quantity } : i)
      }
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setSessionData(prev => ({
      ...prev,
      cart: prev.cart.filter(i => i.id !== itemId)
    }))
  }, [])

  const clearCart = useCallback(() => {
    setSessionData(prev => ({
      ...prev,
      cart: [],
      customerId: undefined,
      customerName: '',
      customerPhone: ''
    }))
  }, [])

  const setCustomer = useCallback((id: string | undefined, name: string, phone: string) => {
    setSessionData(prev => ({
      ...prev,
      customerId: id,
      customerName: name,
      customerPhone: phone
    }))
  }, [])

  const clearSession = useCallback(() => {
    // Clear this session's data
    setSessionData({
      cart: [],
      customerName: '',
      customerPhone: '',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    })

    // Remove from localStorage
    const sessions = getAllSessions()
    delete sessions[sessionId]
    saveAllSessions(sessions)

    // Generate new session ID
    sessionStorage.removeItem('thisai_pos_session_id')
  }, [sessionId])

  const getAllActiveSessions = useCallback(() => {
    const sessions = getAllSessions()
    return Object.entries(sessions)
      .map(([id, data]) => ({
        id,
        shortId: id.slice(-6),
        itemCount: data.cart.reduce((sum, item) => sum + item.quantity, 0),
        total: data.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        createdAt: data.createdAt
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [])

  const switchToSession = useCallback((targetSessionId: string) => {
    sessionStorage.setItem('thisai_pos_session_id', targetSessionId)
    window.location.reload() // Reload to switch session
  }, [])

  const createNewSession = useCallback(() => {
    const newId = generateSessionId()
    sessionStorage.setItem('thisai_pos_session_id', newId)

    // Initialize new session in localStorage
    const sessions = getAllSessions()
    sessions[newId] = {
      cart: [],
      customerName: '',
      customerPhone: '',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }
    saveAllSessions(sessions)

    window.location.reload()
    return newId
  }, [])

  const value = useMemo(() => ({
    sessionId,
    shortId,
    cart: sessionData.cart,
    customerName: sessionData.customerName || '',
    customerPhone: sessionData.customerPhone || '',
    customerId: sessionData.customerId,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setCustomer,
    clearSession,
    getAllActiveSessions,
    switchToSession,
    createNewSession
  }), [
    sessionId,
    shortId,
    sessionData,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setCustomer,
    clearSession,
    getAllActiveSessions,
    switchToSession,
    createNewSession
  ])

  return (
    <POSSessionContext.Provider value={value}>
      {children}
    </POSSessionContext.Provider>
  )
}

// Hook to use POS session
export const usePOSSession = () => {
  const context = useContext(POSSessionContext)
  if (context === undefined) {
    throw new Error('usePOSSession must be used within a POSSessionProvider')
  }
  return context
}

export default POSSessionContext
