// Firebase Configuration and Initialization
import { initializeApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== 'your_firebase_api_key' &&
    firebaseConfig.projectId !== 'your-project-id'
  )
}

// Initialize Firebase only if configured
let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
    console.log('✓ Firebase initialized successfully')
  } catch (error) {
    console.error('Firebase initialization error:', error)
  }
} else {
  console.warn('⚠️ Firebase not configured. Add credentials to .env file.')
  console.warn('   The app will work in demo mode with local storage.')
}

// Export Firebase instances
export { app, db, auth, storage, isFirebaseConfigured }

// Helper function to check if Firebase is ready
export const isFirebaseReady = (): boolean => {
  return !!(db && auth)
}

// Collection names
export const COLLECTIONS = {
  BUSINESSES: 'businesses',
  PARTIES: 'parties',
  ITEMS: 'items',
  INVOICES: 'invoices',
  EXPENSES: 'expenses',
  SETTINGS: 'settings',
  USERS: 'users',
  DELIVERY_CHALLANS: 'delivery_challans',
  PURCHASE_ORDERS: 'purchase_orders',
  CREDIT_NOTES: 'credit_notes',
  DEBIT_NOTES: 'debit_notes',
  PROFORMA_INVOICES: 'proforma_invoices',
  EWAY_BILLS: 'eway_bills',
  PAYMENTS_IN: 'payments_in',
  PAYMENTS_OUT: 'payments_out',
  PRICE_LISTS: 'price_lists',
  BANKING: 'banking',
  QUOTATIONS: 'quotations',
  // CRM Collections
  CRM_LEADS: 'crm_leads',
  CRM_ACTIVITIES: 'crm_activities',
  CRM_SITE_VISITS: 'crm_site_visits',
  CRM_REQUIREMENTS: 'crm_requirements',
  CRM_DRAWINGS: 'crm_drawings',
  CRM_QUOTATIONS: 'crm_quotations',
  CRM_ATTACHMENTS: 'crm_attachments',
  CRM_AUDIT_LOGS: 'crm_audit_logs',
  CRM_SETTINGS: 'crm_settings'
} as const

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS]
