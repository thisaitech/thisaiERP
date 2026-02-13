import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthChange } from '../services/authService'
import type { UserData } from '../services/authService'

interface AuthContextType {
  userData: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  userData: null,
  isLoading: true,
  isAuthenticated: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUserData(u)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    userData,
    isLoading,
    isAuthenticated: !!userData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

