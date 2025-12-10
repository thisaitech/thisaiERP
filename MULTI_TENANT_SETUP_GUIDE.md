# Multi-Tenant Setup Guide - ThisAI CRM for Tailor Shops

## Overview

This guide explains how to set up ThisAI CRM to support **multiple independent tailor shops** where:
- ✅ Each shop has completely isolated data
- ✅ Shop A cannot see Shop B's data
- ✅ One Firebase project hosts all shops
- ✅ Each shop owner gets their own login
- ✅ Easy to add new shops without redeployment

---

## Architecture: Multi-Tenant with Data Isolation

### Concept

Instead of creating separate Firebase projects for each shop, we use **ONE Firebase project** with **data isolation by userId**:

```
Firebase Project: thisai-crm
├── Shop 1: ThisAI Tailor (userId: user_123)
│   ├── invoices (filtered by userId: user_123)
│   ├── parties (filtered by userId: user_123)
│   └── items (filtered by userId: user_123)
│
├── Shop 2: Royal Tailors (userId: user_456)
│   ├── invoices (filtered by userId: user_456)
│   ├── parties (filtered by userId: user_456)
│   └── items (filtered by userId: user_456)
│
└── Shop 3: Fashion Stitching (userId: user_789)
    ├── invoices (filtered by userId: user_789)
    ├── parties (filtered by userId: user_789)
    └── items (filtered by userId: user_789)
```

**Key Principle:** Every document stores `userId`, and Firestore security rules ensure users can ONLY access their own data.

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Project name: `thisai-crm` (or your choice)
4. Enable Google Analytics (optional)
5. Click **"Create project"**

### 1.2 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Enable **"Email/Password"** sign-in method
4. Enable **"Email link (passwordless sign-in)"** (optional)

### 1.3 Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules next)
4. Select location: **asia-south1 (Mumbai)** for India
5. Click **"Enable"**

### 1.4 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"**
3. Click **"Web"** (</> icon)
4. Register app name: `ThisAI CRM`
5. Copy the Firebase configuration

---

## Step 2: Update Your Application

### 2.1 Install Firebase

```bash
npm install firebase
```

### 2.2 Create Environment File

Create `.env.local` in project root:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=thisai-crm.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=thisai-crm
VITE_FIREBASE_STORAGE_BUCKET=thisai-crm.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
```

### 2.3 Create Firebase Config

Create `src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
```

### 2.4 Create Authentication Context

Create `src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { PlanType } from '../types'

interface UserProfile {
  uid: string
  email: string
  shopName: string
  ownerName: string
  phone: string
  subscriptionPlan: PlanType
  subscriptionStartDate: string
  subscriptionEndDate?: string
  createdAt: string
}

interface AuthContextType {
  currentUser: User | null
  userProfile: UserProfile | null
  loading: boolean
  signup: (email: string, password: string, shopData: ShopRegistrationData) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

interface ShopRegistrationData {
  shopName: string
  ownerName: string
  phone: string
  subscriptionPlan: PlanType
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Sign up new shop
  const signup = async (email: string, password: string, shopData: ShopRegistrationData) => {
    // Create authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      shopName: shopData.shopName,
      ownerName: shopData.ownerName,
      phone: shopData.phone,
      subscriptionPlan: shopData.subscriptionPlan,
      subscriptionStartDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    await setDoc(doc(db, 'users', user.uid), userProfile)
    setUserProfile(userProfile)
  }

  // Login
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  // Logout
  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile)
        }
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
```

### 2.5 Update Plan Hook to Use User Profile

Update `src/hooks/usePlan.ts`:

```typescript
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PLAN_CONFIG } from '../types'

export const usePlan = () => {
  const { userProfile } = useAuth()

  // Get plan from user profile, default to silver
  const currentPlan = userProfile?.subscriptionPlan || 'silver'
  const planConfig = PLAN_CONFIG[currentPlan]

  const hasFeature = useMemo(() => {
    return (feature: keyof typeof planConfig.features): boolean => {
      return planConfig.features[feature]
    }
  }, [planConfig])

  const isGoldPlan = currentPlan === 'gold'
  const isSilverPlan = currentPlan === 'silver'

  return {
    currentPlan,
    planConfig,
    hasFeature,
    isGoldPlan,
    isSilverPlan,
    shopName: userProfile?.shopName || 'My Shop',
    ownerName: userProfile?.ownerName || 'Owner'
  }
}
```

---

## Step 3: Firestore Database Structure

### Collections & Documents

```
firestore/
│
├── users/                          # User profiles (one per shop)
│   ├── {userId}/
│   │   ├── uid: string
│   │   ├── email: string
│   │   ├── shopName: "ThisAI Tailor"
│   │   ├── ownerName: "Rajesh Kumar"
│   │   ├── phone: "+91 9876543210"
│   │   ├── subscriptionPlan: "silver" | "gold"
│   │   ├── subscriptionStartDate: timestamp
│   │   ├── subscriptionEndDate: timestamp (optional)
│   │   └── createdAt: timestamp
│   │
│   └── {anotherUserId}/
│       ├── shopName: "Royal Tailors"
│       └── ... (same structure)
│
├── invoices/                       # All invoices (filtered by userId)
│   ├── {invoiceId}/
│   │   ├── userId: "user_123"     # 🔒 CRITICAL: Links to shop owner
│   │   ├── type: "sale" | "purchase"
│   │   ├── invoiceNumber: string
│   │   ├── partyId: string
│   │   ├── items: array
│   │   ├── grandTotal: number
│   │   └── createdAt: timestamp
│   │
│   └── {anotherInvoiceId}/
│       ├── userId: "user_456"     # Different shop's invoice
│       └── ...
│
├── parties/                        # All parties (filtered by userId)
│   ├── {partyId}/
│   │   ├── userId: "user_123"     # 🔒 CRITICAL: Links to shop owner
│   │   ├── type: "customer" | "supplier"
│   │   ├── companyName: string
│   │   └── ...
│   │
│   └── {anotherPartyId}/
│       ├── userId: "user_456"     # Different shop's party
│       └── ...
│
├── items/                          # All items (filtered by userId)
│   ├── {itemId}/
│   │   ├── userId: "user_123"     # 🔒 CRITICAL: Links to shop owner
│   │   ├── name: string
│   │   ├── stock: number
│   │   └── ...
│   │
│   └── {anotherItemId}/
│       ├── userId: "user_456"     # Different shop's item
│       └── ...
│
└── expenses/                       # All expenses (filtered by userId)
    ├── {expenseId}/
    │   ├── userId: "user_123"     # 🔒 CRITICAL: Links to shop owner
    │   ├── amount: number
    │   └── ...
    │
    └── ...
```

**Key Security Pattern:**
- Every document (except users collection) has `userId` field
- Firestore rules enforce that users can ONLY read/write documents where `userId` matches their auth UID

---

## Step 4: Firestore Security Rules

Go to Firestore → Rules and paste this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection - users can read/write their own profile only
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;
      allow delete: if false; // Never allow user deletion via client
    }

    // Invoices - users can only access their own invoices
    match /invoices/{invoiceId} {
      allow read: if isAuthenticated() &&
                     isOwner(resource.data.userId);

      allow create: if isAuthenticated() &&
                       isOwner(request.resource.data.userId);

      allow update: if isAuthenticated() &&
                       isOwner(resource.data.userId) &&
                       isOwner(request.resource.data.userId);

      allow delete: if isAuthenticated() &&
                       isOwner(resource.data.userId);
    }

    // Parties - users can only access their own parties
    match /parties/{partyId} {
      allow read: if isAuthenticated() &&
                     isOwner(resource.data.userId);

      allow create: if isAuthenticated() &&
                       isOwner(request.resource.data.userId);

      allow update: if isAuthenticated() &&
                       isOwner(resource.data.userId) &&
                       isOwner(request.resource.data.userId);

      allow delete: if isAuthenticated() &&
                       isOwner(resource.data.userId);
    }

    // Items - users can only access their own items
    match /items/{itemId} {
      allow read: if isAuthenticated() &&
                     isOwner(resource.data.userId);

      allow create: if isAuthenticated() &&
                       isOwner(request.resource.data.userId);

      allow update: if isAuthenticated() &&
                       isOwner(resource.data.userId) &&
                       isOwner(request.resource.data.userId);

      allow delete: if isAuthenticated() &&
                       isOwner(resource.data.userId);
    }

    // Expenses - users can only access their own expenses
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() &&
                     isOwner(resource.data.userId);

      allow create: if isAuthenticated() &&
                       isOwner(request.resource.data.userId);

      allow update: if isAuthenticated() &&
                       isOwner(resource.data.userId) &&
                       isOwner(request.resource.data.userId);

      allow delete: if isAuthenticated() &&
                       isOwner(resource.data.userId);
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**How These Rules Work:**
1. User logs in → Firebase Auth gives them a `uid`
2. User tries to read invoice → Firestore checks if `invoice.userId == user.uid`
3. If YES → Allow access
4. If NO → Deny access

**Result:** "ThisAI Tailor" can NEVER see "Royal Tailors" data, even if they try to hack the app!

---

## Step 5: Setting Up Your First Shop (ThisAI Tailor)

### Option A: Via Code (Registration Page)

Create `src/pages/Register.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PlanType } from '../types'

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    shopName: '',
    ownerName: '',
    phone: '',
    subscriptionPlan: 'silver' as PlanType
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signup(formData.email, formData.password, {
        shopName: formData.shopName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        subscriptionPlan: formData.subscriptionPlan
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Register Your Shop</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Shop Name</label>
            <input
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="ThisAI Tailor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Owner Name</label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="+91 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="shop@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value as PlanType })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="silver">Silver Plan</option>
              <option value="gold">Gold Plan</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Shop...' : 'Register Shop'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Option B: Via Firebase Console (Manual)

1. Go to Firebase Console → Authentication → Users
2. Click **"Add user"**
3. Email: `thisaitailor@example.com`
4. Password: `SecurePassword123`
5. Click **"Add user"**
6. Copy the generated UID (e.g., `abc123xyz`)

7. Go to Firestore Database → Start collection
8. Collection ID: `users`
9. Document ID: (paste the UID from step 6)
10. Add fields:
    ```
    uid: abc123xyz
    email: thisaitailor@example.com
    shopName: ThisAI Tailor
    ownerName: Rajesh Kumar
    phone: +91 9876543210
    subscriptionPlan: silver
    subscriptionStartDate: (current timestamp)
    createdAt: (current timestamp)
    ```

---

## Step 6: Update App to Use Multi-Tenant Data

### Example: Invoice Service

Create `src/services/invoiceService.ts`:

```typescript
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, auth } from '../config/firebase'
import { Invoice } from '../types'

// Get all invoices for current user
export const getInvoices = async (): Promise<Invoice[]> => {
  if (!auth.currentUser) throw new Error('Not authenticated')

  const invoicesRef = collection(db, 'invoices')
  const q = query(
    invoicesRef,
    where('userId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  )

  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Invoice[]
}

// Create invoice
export const createInvoice = async (invoiceData: Omit<Invoice, 'id'>): Promise<string> => {
  if (!auth.currentUser) throw new Error('Not authenticated')

  const invoicesRef = collection(db, 'invoices')
  const docRef = await addDoc(invoicesRef, {
    ...invoiceData,
    userId: auth.currentUser.uid, // 🔒 CRITICAL: Auto-add userId
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })

  return docRef.id
}

// Update invoice
export const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>): Promise<void> => {
  if (!auth.currentUser) throw new Error('Not authenticated')

  const invoiceRef = doc(db, 'invoices', invoiceId)
  await updateDoc(invoiceRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('Not authenticated')

  const invoiceRef = doc(db, 'invoices', invoiceId)
  await deleteDoc(invoiceRef)
}
```

---

## Step 7: Deployment

### 7.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 7.2 Login to Firebase

```bash
firebase login
```

### 7.3 Initialize Firebase Hosting

```bash
firebase init hosting
```

Select:
- Use existing project: `thisai-crm`
- Public directory: `dist`
- Configure as single-page app: **Yes**
- Set up automatic builds: **No**

### 7.4 Build and Deploy

```bash
# Build the React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be live at: `https://thisai-crm.web.app`

---

## Step 8: Adding New Shops

### Method 1: Self-Registration (Recommended)

1. User visits your deployed app
2. Clicks "Register"
3. Fills shop details
4. Creates account
5. ✅ Done! New shop is automatically isolated

### Method 2: Admin Creation

1. Go to Firebase Console → Authentication
2. Add new user manually
3. Go to Firestore → users collection
4. Add user profile document
5. Share login credentials with shop owner

---

## Testing Multi-Tenant Isolation

### Test Scenario:

1. **Register Shop 1:**
   - Email: `shop1@test.com`
   - Shop: "ThisAI Tailor"

2. **Create data in Shop 1:**
   - Add 5 invoices
   - Add 3 customers

3. **Logout and Register Shop 2:**
   - Email: `shop2@test.com`
   - Shop: "Royal Tailors"

4. **Verify isolation:**
   - Shop 2 should see ZERO invoices
   - Shop 2 should see ZERO customers
   - Shop 2 creates their own data

5. **Login back to Shop 1:**
   - Should still see all 5 invoices
   - Should still see all 3 customers
   - Should NOT see Shop 2's data

✅ **If this works, your multi-tenant system is secure!**

---

## Security Checklist

- [x] Every collection (except users) has `userId` field
- [x] Firestore rules enforce `userId` matching
- [x] Services automatically add `userId` when creating documents
- [x] Users can only query their own `userId`
- [x] No hardcoded test data without `userId`
- [x] Authentication required for all operations

---

## Cost Estimation

**For 10 Tailor Shops (each with ~50 invoices/month):**

- **Firestore Reads:** ~150K/month = **Free**
- **Firestore Writes:** ~50K/month = **Free**
- **Authentication:** Unlimited free
- **Hosting:** 10GB bandwidth = **Free**
- **Storage:** 1GB = **Free**

**Total Cost:** **₹0/month** (within free tier)

**For 100 Shops:** ~$5-10/month

---

## Summary

✅ **One Firebase project** hosts unlimited shops
✅ **Complete data isolation** via userId + security rules
✅ **Easy onboarding** - shops can self-register
✅ **No cross-shop data leaks** - impossible by design
✅ **Cost-effective** - free tier covers small-medium usage
✅ **Scalable** - can handle thousands of shops

**Next:** Follow [CLOUD_DATABASE_RECOMMENDATIONS.md](CLOUD_DATABASE_RECOMMENDATIONS.md) for detailed Firebase implementation.
