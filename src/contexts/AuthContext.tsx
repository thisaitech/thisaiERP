import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onAuthChange, getUserData, getCurrentUser } from '../services/authService'
import type { UserData } from '../services/authService'

interface AuthContextType {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  isLoading: true,
  isAuthenticated: false
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user data
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser))
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
      }
    }

    // Listen to auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Get user data from Firestore
        const data = await getUserData(firebaseUser.uid)
        if (data) {
          setUserData(data)
          localStorage.setItem('user', JSON.stringify(data))
        }
      } else {
        setUserData(null)
        localStorage.removeItem('user')
      }

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    userData,
    isLoading,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
