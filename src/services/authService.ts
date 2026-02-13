import { apiPost } from './apiClient'

export type UserRole = 'admin' | 'manager' | 'cashier'

export interface UserData {
  uid: string
  email: string
  displayName: string
  companyName: string
  companyId?: string
  role: UserRole
  status: 'active' | 'inactive'
  createdAt: string
  lastLogin: string
  createdBy?: string
}

type AuthResponse = {
  token: string
  user: UserData
}

const AUTH_CHANGED_EVENT = 'auth-changed'

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export const signIn = async (email: string, password: string): Promise<UserData> => {
  const res = await apiPost<AuthResponse>('/auth/login', { email, password })
  localStorage.setItem('auth_token', res.token)
  localStorage.setItem('user', JSON.stringify(res.user))
  emitAuthChanged()
  return res.user
}

export const createAdminAccount = async (
  email: string,
  password: string,
  fullName: string,
  companyName: string
): Promise<UserData> => {
  const res = await apiPost<AuthResponse>('/auth/register', {
    email,
    password,
    displayName: fullName,
    companyName,
  })
  localStorage.setItem('auth_token', res.token)
  localStorage.setItem('user', JSON.stringify(res.user))
  emitAuthChanged()
  return res.user
}

export const signOut = async (): Promise<void> => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  emitAuthChanged()
}

export const getCurrentUser = (): UserData | null => {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserData
  } catch {
    return null
  }
}

// Keep the same hook-style API as before, but based on localStorage (and a custom event).
export const onAuthChange = (callback: (user: UserData | null) => void) => {
  const handler = () => callback(getCurrentUser())

  handler()
  window.addEventListener(AUTH_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

