import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from './firebase'

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

const AUTH_CHANGED_EVENT = 'auth-changed'

function requireFirebaseAuth() {
  if (!isFirebaseConfigured || !firebaseAuth) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to .env to enable authentication.')
  }
  return firebaseAuth
}

function requireFirestoreDb() {
  if (!isFirebaseConfigured || !firestoreDb) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to .env to enable data storage.')
  }
  return firestoreDb
}

function emitAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

function deriveCompanyId(email: string, companyName: string): string {
  const source = companyName.trim() || email.split('@')[1] || 'default-company'
  return source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default-company'
}

function saveSession(user: UserData, token: string) {
  localStorage.setItem('auth_token', token)
  localStorage.setItem('user', JSON.stringify(user))
  emitAuthChanged()
}

async function getUserData(uid: string): Promise<UserData> {
  const snap = await getDoc(doc(requireFirestoreDb(), 'users', uid))
  if (!snap.exists()) {
    throw new Error('User profile not found. Please register this account first.')
  }
  return snap.data() as UserData
}

export const signIn = async (email: string, password: string): Promise<UserData> => {
  const credential = await signInWithEmailAndPassword(requireFirebaseAuth(), email, password)
  const userData = await getUserData(credential.user.uid)
  const lastLogin = new Date().toISOString()
  const updatedUser = { ...userData, lastLogin }

  await updateDoc(doc(requireFirestoreDb(), 'users', credential.user.uid), { lastLogin })
  saveSession(updatedUser, await credential.user.getIdToken())
  return updatedUser
}

export const createAdminAccount = async (
  email: string,
  password: string,
  fullName: string,
  companyName: string
): Promise<UserData> => {
  const credential = await createUserWithEmailAndPassword(requireFirebaseAuth(), email, password)
  const now = new Date().toISOString()
  const userData: UserData = {
    uid: credential.user.uid,
    email: email.toLowerCase(),
    displayName: fullName,
    companyName,
    companyId: deriveCompanyId(email, companyName),
    role: 'admin',
    status: 'active',
    createdAt: now,
    lastLogin: now,
  }

  await setDoc(doc(requireFirestoreDb(), 'users', credential.user.uid), userData)
  saveSession(userData, await credential.user.getIdToken())
  return userData
}

export const signOut = async (): Promise<void> => {
  if (firebaseAuth) {
    await firebaseSignOut(firebaseAuth)
  }
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
  emitAuthChanged()
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
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

export const onAuthChange = (callback: (user: UserData | null) => void) => {
  if (!isFirebaseConfigured || !firebaseAuth) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    callback(null)
    return () => {}
  }

  const emitCurrent = () => callback(getCurrentUser())
  const unsubscribeFirebase = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    if (!firebaseUser) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      callback(null)
      return
    }

    try {
      const userData = await getUserData(firebaseUser.uid)
      saveSession(userData, await firebaseUser.getIdToken())
      callback(userData)
    } catch {
      emitCurrent()
    }
  })

  emitCurrent()
  window.addEventListener(AUTH_CHANGED_EVENT, emitCurrent)
  window.addEventListener('storage', emitCurrent)

  return () => {
    unsubscribeFirebase()
    window.removeEventListener(AUTH_CHANGED_EVENT, emitCurrent)
    window.removeEventListener('storage', emitCurrent)
  }
}
