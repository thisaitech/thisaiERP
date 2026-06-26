import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.authDomain) &&
  Boolean(firebaseConfig.projectId) &&
  Boolean(firebaseConfig.appId)

const appConfig = isFirebaseConfigured ? firebaseConfig : null

let firebaseAppInstance: ReturnType<typeof initializeApp> | null = null
try {
  firebaseAppInstance = appConfig ? (getApps().length ? getApp() : initializeApp(appConfig)) : null
} catch (e) {
  console.warn('Firebase initialization failed; API fallback will be used.', e)
  firebaseAppInstance = null
}
export const firebaseApp = firebaseAppInstance
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null
export const firestoreDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null

if (firebaseApp && firebaseConfig.measurementId) {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(firebaseApp)
    })
    .catch(() => {
      // Analytics is optional and can be unavailable in restricted browsers.
    })
}
