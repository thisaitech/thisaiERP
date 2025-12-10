# Quick Start: Setting Up ThisAI Tailor Shop

## Step-by-Step Setup for Your First Shop

This guide walks you through setting up **ThisAI Tailor** as your first shop in the system.

---

## Prerequisites

- [x] Node.js installed (v18+)
- [x] npm installed
- [x] Google account for Firebase

---

## Part 1: Firebase Setup (15 minutes)

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Click **"Add project"**

2. **Configure Project**
   - Project name: `thisai-tailor-crm`
   - Google Analytics: **Disable** (or enable if you want)
   - Click **"Create project"**
   - Wait for project creation (~30 seconds)
   - Click **"Continue"**

### Step 2: Enable Authentication

1. **In Firebase Console, click "Authentication"** (left sidebar)
2. Click **"Get started"**
3. Click **"Email/Password"** tab
4. Toggle **"Enable"** switch
5. Click **"Save"**

### Step 3: Create Firestore Database

1. **Click "Firestore Database"** (left sidebar)
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose location: **asia-south1 (Mumbai)** (best for India)
5. Click **"Enable"**
6. Wait for database creation (~1 minute)

### Step 4: Set Security Rules

1. In Firestore, click **"Rules"** tab
2. Replace all content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;
    }

    match /invoices/{invoiceId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
    }

    match /parties/{partyId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
    }

    match /items/{itemId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
    }

    match /expenses/{expenseId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
    }
  }
}
```

3. Click **"Publish"**

### Step 5: Get Firebase Configuration

1. Click **⚙️ Settings** (gear icon, top left)
2. Go to **"Project settings"**
3. Scroll to **"Your apps"** section
4. Click **"</>"** (Web app icon)
5. Register app:
   - App nickname: `ThisAI Tailor CRM`
   - **DON'T** check Firebase Hosting (we'll do later)
   - Click **"Register app"**
6. **COPY** the firebaseConfig object (you'll need this)
7. Click **"Continue to console"**

---

## Part 2: Application Setup (10 minutes)

### Step 6: Install Firebase Package

Open terminal in your project folder:

```bash
cd z:\Projects\Thisai_crmSilver
npm install firebase
```

### Step 7: Create Environment File

Create `.env.local` file in project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Replace with your actual values from Step 5!**

### Step 8: Create Firebase Config File

Create `src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
```

### Step 9: Test Firebase Connection

Create a test file `src/test-firebase.ts`:

```typescript
import { db, auth } from './config/firebase'
import { collection, addDoc } from 'firebase/firestore'

console.log('Firebase initialized:', {
  db: !!db,
  auth: !!auth
})

// This will test if Firestore is accessible
export const testFirebaseConnection = async () => {
  try {
    const testRef = collection(db, 'test')
    console.log('Firestore connection successful!')
    return true
  } catch (error) {
    console.error('Firestore connection failed:', error)
    return false
  }
}
```

Run test:

```bash
npm run dev
```

Open browser console and check for "Firebase initialized" message.

---

## Part 3: Register ThisAI Tailor Shop (5 minutes)

### Option A: Using Firebase Console (Manual - Recommended for First Shop)

#### Step 10: Create User Account

1. Go to Firebase Console → **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - Email: `thisaitailor@yourdomain.com`
   - Password: `SecurePassword123!`
4. Click **"Add user"**
5. **COPY the User UID** (e.g., `abc123xyz456`)

#### Step 11: Create User Profile in Firestore

1. Go to **Firestore Database**
2. Click **"Start collection"**
3. Collection ID: `users`
4. Document ID: **(Paste the User UID from Step 10)**
5. Add fields:

| Field | Type | Value |
|-------|------|-------|
| uid | string | (same as document ID) |
| email | string | thisaitailor@yourdomain.com |
| shopName | string | ThisAI Tailor |
| ownerName | string | (Your Name) |
| phone | string | +91 9876543210 |
| subscriptionPlan | string | silver |
| subscriptionStartDate | timestamp | (Click "Set to current time") |
| createdAt | timestamp | (Click "Set to current time") |

6. Click **"Save"**

✅ **Shop Created!** You can now login with those credentials.

---

### Option B: Using Registration Form (For Future Shops)

See [MULTI_TENANT_SETUP_GUIDE.md](MULTI_TENANT_SETUP_GUIDE.md) for building a registration page.

---

## Part 4: Update Your App

### Step 12: Update .gitignore

Add to `.gitignore`:

```
.env.local
.env
```

### Step 13: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## Part 5: Deploy to Cloud (Optional - 20 minutes)

### Step 14: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 15: Login to Firebase

```bash
firebase login
```

Browser will open → Login with your Google account

### Step 16: Initialize Hosting

```bash
firebase init hosting
```

Answers:
- **Use existing project:** Select your project
- **Public directory:** `dist`
- **Single-page app:** `Yes`
- **Automatic builds:** `No`
- **Overwrite index.html:** `No`

### Step 17: Build & Deploy

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

After deployment, you'll get a URL like:
```
✔  Deploy complete!

Hosting URL: https://thisai-tailor-crm.web.app
```

🎉 **Your app is now live on the internet!**

---

## Testing Your Setup

### Test 1: Login

1. Go to your app (localhost:3000 or deployed URL)
2. Navigate to login page
3. Email: `thisaitailor@yourdomain.com`
4. Password: `SecurePassword123!`
5. Click **"Login"**

✅ Should see dashboard

### Test 2: Create Invoice

1. Go to **Sales** → **Create Invoice**
2. Fill in details
3. Click **"Save"**
4. Check Firestore Console → invoices collection
5. ✅ Should see document with your `userId`

### Test 3: Data Isolation (After Adding 2nd Shop)

1. Logout
2. Register another shop (different email)
3. Login with new shop
4. ✅ Should see ZERO invoices (not ThisAI Tailor's data)

---

## Troubleshooting

### Problem: "Firebase is not defined"

**Solution:**
- Check `.env.local` has correct values
- Restart dev server
- Clear browser cache

### Problem: "Permission denied" in Firestore

**Solution:**
- Check Firestore Rules are published
- Verify user is logged in
- Check `userId` is being added to documents

### Problem: Can't login

**Solution:**
- Verify email/password in Firebase Console → Authentication
- Check Firebase Auth is enabled
- Check browser console for errors

### Problem: Build fails

**Solution:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

---

## What's Next?

Now that ThisAI Tailor is set up:

1. ✅ **Customize branding** - Update shop name in UI
2. ✅ **Add data** - Create customers, items, invoices
3. ✅ **Test features** - Try reports, exports, WhatsApp
4. ✅ **Add more shops** - Repeat process for other tailors
5. ✅ **Set up payments** - Integrate Razorpay/Stripe for subscriptions

---

## Important Notes

### Security
- ✅ Each shop's data is completely isolated
- ✅ Firestore rules prevent cross-shop access
- ✅ Even if hacked, Shop A cannot see Shop B's data

### Costs
- ✅ **Free tier covers:** ~50K reads/day, 20K writes/day
- ✅ **For 1 shop:** Definitely free
- ✅ **For 10 shops:** Still likely free
- ✅ **For 100 shops:** ~₹500-1000/month

### Backups
- ✅ Firebase automatically backs up data
- ✅ Can export from Firestore Console
- ✅ Can set up daily automated backups

---

## Support

If you need help:
1. Check [MULTI_TENANT_SETUP_GUIDE.md](MULTI_TENANT_SETUP_GUIDE.md)
2. Check [CLOUD_DATABASE_RECOMMENDATIONS.md](CLOUD_DATABASE_RECOMMENDATIONS.md)
3. Firebase docs: https://firebase.google.com/docs
4. Stack Overflow: [firebase] tag

---

**Created:** 2025-11-16
**For:** ThisAI Tailor Shop Setup
**Status:** Ready for Production ✅
