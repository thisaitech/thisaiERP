// Authentication Service
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'
import { auth, db, COLLECTIONS } from './firebase'


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
  createdBy?: string // UID of admin who created this user
}

// Derive a stable companyId from company name or email domain
const deriveCompanyId = (email?: string | null, companyName?: string) => {
  const source = companyName && companyName.trim().length > 0
    ? companyName
    : (email || '').split('@')[1] || ''
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'default-company'
}

// Rate limiting for sign-in attempts
const signInAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

const checkRateLimit = (email: string): void => {
  const now = Date.now()
  const attempts = signInAttempts.get(email)

  if (attempts) {
    // Reset counter if lockout period has passed
    if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
      signInAttempts.delete(email)
      return
    }

    if (attempts.count >= MAX_ATTEMPTS) {
      const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 60000)
      throw new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`)
    }
  }
}

const recordFailedAttempt = (email: string): void => {
  const now = Date.now()
  const attempts = signInAttempts.get(email) || { count: 0, lastAttempt: 0 }
  attempts.count += 1
  attempts.lastAttempt = now
  signInAttempts.set(email, attempts)
}

const recordSuccessfulAttempt = (email: string): void => {
  signInAttempts.delete(email)
}

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<UserData> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  // SECURITY: Check rate limiting
  checkRateLimit(email)

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    // SECURITY: Clear failed attempts on successful login
    recordSuccessfulAttempt(email)
    const user = userCredential.user

    // Update last login
    if (db) {
      const userDocRef = doc(db, COLLECTIONS.USERS, user.uid)
      const userDoc = await getDoc(userDocRef)
      const now = new Date().toISOString()
      const companyId = deriveCompanyId(user.email, (userDoc.data() as any)?.companyName)

      const baseData: UserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        companyName: '',
        companyId,
        role: 'cashier',
        status: 'active',
        createdAt: user.metadata?.creationTime
          ? new Date(user.metadata.creationTime).toISOString()
          : now,
        lastLogin: now
      }

      const mergedData: UserData = {
        ...baseData,
        ...(userDoc.exists() ? (userDoc.data() as Partial<UserData>) : {}),
        lastLogin: now
      }

      await setDoc(userDocRef, mergedData, { merge: true })

      return mergedData
    }

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      companyName: '',
      role: 'cashier',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
  } catch (error) {
    console.error('Sign in error:', error)

    // SECURITY: Record failed attempt for rate limiting
    if (email) {
      recordFailedAttempt(email)
    }

    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown sign-in error occurred.');
  }
}

// ============ SOCIAL LOGIN FUNCTIONS ============

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserData> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    const result = await signInWithPopup(auth, provider)
    const user = result.user

    return await handleSocialLoginUser(user, 'google')
  } catch (error) {
    console.error('Google sign in error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getSocialAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown Google sign-in error occurred.');
  }
}

// Sign in with Facebook
export const signInWithFacebook = async (): Promise<UserData> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  try {
    const provider = new FacebookAuthProvider()
    provider.addScope('email')
    provider.addScope('public_profile')

    const result = await signInWithPopup(auth, provider)
    const user = result.user

    return await handleSocialLoginUser(user, 'facebook')
  } catch (error) {
    console.error('Facebook sign in error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getSocialAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown Facebook sign-in error occurred.');
  }
}

// Sign in with Apple
export const signInWithApple = async (): Promise<UserData> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  try {
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')

    const result = await signInWithPopup(auth, provider)
    const user = result.user

    return await handleSocialLoginUser(user, 'apple')
  } catch (error) {
    console.error('Apple sign in error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getSocialAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown Apple sign-in error occurred.');
  }
}

// Handle social login user - create or update user document
const handleSocialLoginUser = async (user: User, provider: string): Promise<UserData> => {
  const now = new Date().toISOString()

  if (db) {
    const userDocRef = doc(db, COLLECTIONS.USERS, user.uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      // Existing user - update last login
      const existingData = userDoc.data() as UserData
      const updatedData: UserData = {
        ...existingData,
        lastLogin: now
      }
      await setDoc(userDocRef, updatedData, { merge: true })
      return updatedData
    } else {
      // New user - create document with restricted role
      const companyId = deriveCompanyId(user.email, user.displayName || '')
      const newUserData: UserData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        companyName: '', // User will need to set this in settings
        companyId,
        role: 'cashier', // SECURITY: Start with lowest privilege role
        status: 'active',
        createdAt: now,
        lastLogin: now
      }
      await setDoc(userDocRef, newUserData)
      return newUserData
    }
  }

  // Fallback if db is not available
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    companyName: '',
    role: 'cashier', // SECURITY: Start with lowest privilege role
    status: 'active',
    createdAt: now,
    lastLogin: now
  }
}

// Helper function for social auth error messages
const getSocialAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.'
    case 'auth/popup-blocked':
      return 'Popup was blocked by browser. Please allow popups and try again.'
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled. Please try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.'
    case 'auth/auth-domain-config-required':
      return 'Authentication domain not configured. Please contact support.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please contact support.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in. Please contact support.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.'
    default:
      return 'Sign-in failed. Please try again.'
  }
}

// Sign out
export const signOut = async (): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  try {
    await firebaseSignOut(auth)
  } catch (error: unknown) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Create admin account (for initial setup)
export const createAdminAccount = async (
  email: string,
  password: string,
  companyName: string,
  displayName: string
): Promise<UserData> => {
  if (!auth || !db) {
    throw new Error('Firebase not initialized')
  }

  try {
    // Create user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Update profile
    await updateProfile(user, {
      displayName: displayName
    })

    // Create user document
    const userData: UserData = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName,
      companyName: companyName,
      companyId: deriveCompanyId(user.email, companyName),
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }

    const userDocRef = doc(db, COLLECTIONS.USERS, user.uid)
    await setDoc(userDocRef, userData)

    return userData
  } catch (error) {
    console.error('Create account error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown error occurred while creating the account.');
  }
}

// Get current user
export const getCurrentUser = (): User | null => {
  if (!auth) return null
  return auth.currentUser
}

// Re-authenticate user with email and password
// This is required for sensitive operations like password change, account deletion, etc.
export const reauthenticate = async (password: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase authentication not initialized')
  }

  const user = auth.currentUser
  if (!user || !user.email) {
    throw new Error('No user is currently signed in')
  }

  try {
    // Create credential with email and password
    const credential = EmailAuthProvider.credential(user.email, password)
    
    // Re-authenticate the user
    await reauthenticateWithCredential(user, credential)
  } catch (error) {
    console.error('Re-authentication error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown re-authentication error occurred.');
  }
}

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<UserData | null> => {
  if (!db) return null

  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, uid)
    const userDoc = await getDoc(userDocRef)

    if (userDoc.exists()) {
      return userDoc.data() as UserData
    }

    return null
  } catch (error: unknown) {
    console.error('Get user data error:', error)
    return null
  }
}

// Helper function to convert Firebase error codes to user-friendly messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address'
    case 'auth/user-disabled':
      return 'This account has been disabled'
    case 'auth/user-not-found':
      return 'No account found with this email'
    case 'auth/wrong-password':
      return 'Incorrect password'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection'
    default:
      return 'Authentication failed. Please try again'
  }
}

// ============ STAFF MANAGEMENT FUNCTIONS ============

// Create a staff user (Manager or Cashier) - Admin only
export const createStaffUser = async (
  email: string,
  password: string,
  displayName: string,
  role: 'manager' | 'cashier',
  adminData: UserData
): Promise<UserData> => {
  if (!auth || !db) {
    throw new Error('Firebase not initialized')
  }

  // Verify caller is admin
  if (adminData.role !== 'admin') {
    throw new Error('Only administrators can create staff accounts')
  }

  try {
    // Store current admin user credentials temporarily
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error('Admin must be logged in to create users')
    }

    // Create the new user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const newUser = userCredential.user

    // Update profile with display name
    await updateProfile(newUser, { displayName })

    // Create user document in Firestore
    const userData: UserData = {
      uid: newUser.uid,
      email: newUser.email || '',
      displayName: displayName,
      companyName: adminData.companyName,
      companyId: adminData.companyId,
      role: role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      createdBy: adminData.uid
    }

    const userDocRef = doc(db, COLLECTIONS.USERS, newUser.uid)
    await setDoc(userDocRef, userData)

    // Note: After createUserWithEmailAndPassword, Firebase automatically signs in as the new user
    // The admin will need to sign back in. We return the new user data for display purposes.

    return userData
  } catch (error) {
    console.error('Create staff user error:', error)
    if (error && typeof error === 'object' && 'code' in error) {
        throw new Error(getAuthErrorMessage((error as {code: string}).code))
    }
    throw new Error('An unknown error occurred while creating the staff user.');
  }
}

// Get all users for a company - Admin only
export const getCompanyUsers = async (companyId: string): Promise<UserData[]> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  try {
    const usersRef = collection(db, COLLECTIONS.USERS)
    const q = query(usersRef, where('companyId', '==', companyId))
    const querySnapshot = await getDocs(q)

    const users: UserData[] = []
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserData)
    })

    // Sort by role: admin first, then manager, then cashier
    const roleOrder = { admin: 0, manager: 1, cashier: 2 }
    users.sort((a, b) => roleOrder[a.role] - roleOrder[b.role])

    return users
  } catch (error: unknown) {
    console.error('Get company users error:', error)
    throw new Error('Failed to fetch users')
  }
}

// Update user role - Admin only
export const updateUserRole = async (
  targetUid: string,
  newRole: 'manager' | 'cashier',
  adminData: UserData
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  // Verify caller is admin
  if (adminData.role !== 'admin') {
    throw new Error('Only administrators can change user roles')
  }

  // Prevent changing own role
  if (targetUid === adminData.uid) {
    throw new Error('Cannot change your own role')
  }

  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, targetUid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    const userData = userDoc.data() as UserData

    // Verify user belongs to same company
    if (userData.companyId !== adminData.companyId) {
      throw new Error('Cannot modify users from other companies')
    }

    // Cannot change another admin's role
    if (userData.role === 'admin') {
      throw new Error('Cannot change role of another administrator')
    }

    await updateDoc(userDocRef, { role: newRole })
  } catch (error: unknown) {
    console.error('Update user role error:', error)
    throw error
  }
}

// Update user status (activate/deactivate) - Admin only
export const updateUserStatus = async (
  targetUid: string,
  newStatus: 'active' | 'inactive',
  adminData: UserData
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  // Verify caller is admin
  if (adminData.role !== 'admin') {
    throw new Error('Only administrators can change user status')
  }

  // Prevent deactivating own account
  if (targetUid === adminData.uid) {
    throw new Error('Cannot deactivate your own account')
  }

  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, targetUid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    const userData = userDoc.data() as UserData

    // Verify user belongs to same company
    if (userData.companyId !== adminData.companyId) {
      throw new Error('Cannot modify users from other companies')
    }

    // Cannot deactivate another admin
    if (userData.role === 'admin') {
      throw new Error('Cannot deactivate another administrator')
    }

    await updateDoc(userDocRef, { status: newStatus })
  } catch (error: unknown) {
    console.error('Update user status error:', error)
    throw error
  }
}

// Delete a staff user - Admin only (removes from Firestore only, Firebase Auth deletion requires Admin SDK)
export const deleteStaffUser = async (
  targetUid: string,
  adminData: UserData
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not initialized')
  }

  // Verify caller is admin
  if (adminData.role !== 'admin') {
    throw new Error('Only administrators can delete users')
  }

  // Prevent deleting own account
  if (targetUid === adminData.uid) {
    throw new Error('Cannot delete your own account')
  }

  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, targetUid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      throw new Error('User not found')
    }

    const userData = userDoc.data() as UserData

    // Verify user belongs to same company
    if (userData.companyId !== adminData.companyId) {
      throw new Error('Cannot delete users from other companies')
    }

    // Cannot delete another admin
    if (userData.role === 'admin') {
      throw new Error('Cannot delete another administrator')
    }

    // Delete user document from Firestore
    await deleteDoc(userDocRef)

    // Note: This only removes the Firestore document.
    // The Firebase Auth account still exists but user won't have access
    // since their companyId data is gone. For full deletion, use Firebase Admin SDK.
  } catch (error: unknown) {
    console.error('Delete staff user error:', error)
    throw error
  }
}
