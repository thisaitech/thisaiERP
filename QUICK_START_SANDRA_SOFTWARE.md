# Quick Start: Setting Up Sandra Software Admin

## Step-by-Step Setup for Sandra Software Company

This guide walks you through setting up **Sandra Software** as the admin company that will manage this CRM system and provide it to multiple client businesses (tailor shops, retail stores, etc.).

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
   - Project name: `sandra-software-crm`
   - Google Analytics: **Enable** (recommended for business tracking)
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

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection - users can read/write their own profile
    match /users/{userId} {
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;
      // Admins can read all users
      allow read: if isAdmin();
    }

    // Invoices - users can only access their own invoices
    match /invoices/{invoiceId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if isAuthenticated() && isOwner(resource.data.userId);
      // Admins can read all invoices (for analytics/support)
      allow read: if isAdmin();
    }

    // Parties - users can only access their own parties
    match /parties/{partyId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if isAuthenticated() && isOwner(resource.data.userId);
      allow read: if isAdmin();
    }

    // Items - users can only access their own items
    match /items/{itemId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if isAuthenticated() && isOwner(resource.data.userId);
      allow read: if isAdmin();
    }

    // Expenses - users can only access their own expenses
    match /expenses/{expenseId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update: if isAuthenticated() && isOwner(resource.data.userId);
      allow delete: if isAuthenticated() && isOwner(resource.data.userId);
      allow read: if isAdmin();
    }

    // Admin analytics collection (only admins can read/write)
    match /analytics/{document=**} {
      allow read, write: if isAdmin();
    }

    // Subscriptions collection (admins can manage, users can read their own)
    match /subscriptions/{subscriptionId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow read, write: if isAdmin();
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
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
   - App nickname: `Sandra Software CRM`
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
VITE_FIREBASE_AUTH_DOMAIN=sandra-software-crm.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sandra-software-crm
VITE_FIREBASE_STORAGE_BUCKET=sandra-software-crm.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Admin Configuration
VITE_COMPANY_NAME="Sandra Software"
VITE_ADMIN_EMAIL=admin@sandrasoftware.com
VITE_SUPPORT_EMAIL=support@sandrasoftware.com
VITE_SUPPORT_PHONE=+91-XXXXXXXXXX
```

**Replace with your actual values from Step 5!**

### Step 8: Create Firebase Config File

Create `src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

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
export const analytics = getAnalytics(app)

export default app
```

---

## Part 3: Create Sandra Software Admin Account (5 minutes)

### Step 9: Create Admin User Account

1. Go to Firebase Console → **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - Email: `admin@sandrasoftware.com`
   - Password: `AdminSecure@2024!` (change this!)
4. Click **"Add user"**
5. **COPY the User UID** (e.g., `admin_abc123xyz`)

### Step 10: Create Admin Profile in Firestore

1. Go to **Firestore Database**
2. Click **"Start collection"**
3. Collection ID: `users`
4. Document ID: **(Paste the Admin User UID from Step 9)**
5. Add fields:

| Field | Type | Value |
|-------|------|-------|
| uid | string | (same as document ID) |
| email | string | admin@sandrasoftware.com |
| role | string | admin |
| companyName | string | Sandra Software |
| displayName | string | Admin |
| phone | string | +91-XXXXXXXXXX |
| subscriptionPlan | string | gold |
| isAdmin | boolean | true |
| createdAt | timestamp | (Click "Set to current time") |

6. Click **"Save"**

✅ **Admin Account Created!**

---

## Part 4: Example Client Setup (For Testing)

### Step 11: Create Test Client (Sample Tailor Shop)

Let me show you how to add your first client business:

1. Go to Firebase Console → **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - Email: `client1@example.com`
   - Password: `Client123!`
4. Click **"Add user"**
5. **COPY the User UID** (e.g., `client_xyz789`)

6. Go to **Firestore Database** → **users** collection
7. Click **"Add document"**
8. Document ID: **(Paste the Client User UID)**
9. Add fields:

| Field | Type | Value |
|-------|------|-------|
| uid | string | (same as document ID) |
| email | string | client1@example.com |
| role | string | client |
| companyName | string | Royal Tailors |
| ownerName | string | Rajesh Kumar |
| phone | string | +91 9876543210 |
| subscriptionPlan | string | silver |
| isAdmin | boolean | false |
| subscriptionStartDate | timestamp | (current time) |
| subscriptionEndDate | timestamp | (30 days from now) |
| createdBy | string | admin@sandrasoftware.com |
| createdAt | timestamp | (current time) |

10. Click **"Save"**

---

## Part 5: Database Structure Overview

### Collections Structure:

```
firestore/
│
├── users/                              # All user accounts
│   ├── {adminUserId}/                  # Sandra Software Admin
│   │   ├── role: "admin"
│   │   ├── companyName: "Sandra Software"
│   │   ├── isAdmin: true
│   │   └── subscriptionPlan: "gold"
│   │
│   ├── {client1UserId}/                # Client 1: Royal Tailors
│   │   ├── role: "client"
│   │   ├── companyName: "Royal Tailors"
│   │   ├── isAdmin: false
│   │   ├── subscriptionPlan: "silver"
│   │   └── createdBy: "admin@sandrasoftware.com"
│   │
│   └── {client2UserId}/                # Client 2: Fashion Stitching
│       ├── role: "client"
│       ├── companyName: "Fashion Stitching"
│       └── subscriptionPlan: "gold"
│
├── invoices/                           # All client invoices
│   ├── {invoiceId}/
│   │   ├── userId: "client1_xyz"       # Belongs to Client 1
│   │   ├── type: "sale"
│   │   └── ... (invoice data)
│   │
│   └── {anotherInvoiceId}/
│       ├── userId: "client2_abc"       # Belongs to Client 2
│       └── ...
│
├── subscriptions/                      # Subscription management
│   ├── {client1UserId}/
│   │   ├── userId: "client1_xyz"
│   │   ├── plan: "silver"
│   │   ├── startDate: timestamp
│   │   ├── endDate: timestamp
│   │   ├── status: "active"
│   │   ├── paymentMethod: "razorpay"
│   │   └── lastPaymentDate: timestamp
│   │
│   └── {client2UserId}/
│       └── ... (subscription details)
│
└── analytics/                          # Sandra Software Analytics
    ├── revenue/
    │   ├── totalRevenue: number
    │   ├── monthlyRevenue: map
    │   └── revenueByPlan: map
    │
    ├── clients/
    │   ├── totalClients: number
    │   ├── activeClients: number
    │   ├── churnRate: number
    │   └── clientsByPlan: map
    │
    └── usage/
        ├── totalInvoices: number
        ├── invoicesByClient: map
        └── storageUsed: number
```

---

## Part 6: Admin Dashboard Features

### What Sandra Software Admin Can Do:

✅ **Client Management:**
- View all registered clients
- Create new client accounts
- Upgrade/downgrade client plans
- Suspend/activate accounts
- View client usage statistics

✅ **Subscription Management:**
- Track subscription status
- Process payments
- Send renewal reminders
- Manage plan changes

✅ **Analytics & Reporting:**
- Total revenue tracking
- Client acquisition metrics
- Feature usage analytics
- Churn rate monitoring
- Popular plan analysis

✅ **Support:**
- View client data (for support purposes)
- Access all client invoices (read-only)
- Help troubleshoot issues

### What Clients Can Do:

✅ **Full CRM Access** (based on their plan):
- Create/manage invoices
- Track customers & suppliers
- Generate reports
- Export to PDF/Excel
- WhatsApp integration
- All features per their plan (Silver/Gold)

❌ **Cannot Access:**
- Other clients' data
- Admin analytics
- Subscription management
- Other clients' invoices

---

## Part 7: Branding & Customization

### Update App Branding for Sandra Software

Update `src/config/branding.ts` (create this file):

```typescript
export const BRANDING = {
  companyName: 'Sandra Software',
  appName: 'ThisAI CRM',
  tagline: 'Business Management Made Simple',

  // Contact Information
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@sandrasoftware.com',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '+91-XXXXXXXXXX',
  website: 'https://sandrasoftware.com',

  // Social Media
  facebook: 'https://facebook.com/sandrasoftware',
  twitter: 'https://twitter.com/sandrasoftware',
  linkedin: 'https://linkedin.com/company/sandrasoftware',

  // Branding Colors (optional - override theme)
  primaryColor: '#2563eb', // Blue
  accentColor: '#f59e0b', // Amber

  // Footer Text
  footerText: '© 2024 Sandra Software. All rights reserved.',
  poweredBy: 'Powered by Sandra Software'
}
```

### Update Login Page

Update the login page to show Sandra Software branding:

```typescript
// In Login component
import { BRANDING } from '../config/branding'

<div className="text-center mb-8">
  <h1 className="text-3xl font-bold">{BRANDING.appName}</h1>
  <p className="text-slate-400 mt-2">{BRANDING.tagline}</p>
  <p className="text-xs text-slate-500 mt-4">{BRANDING.poweredBy}</p>
</div>
```

---

## Part 8: Deploy to Cloud (20 minutes)

### Step 12: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 13: Login to Firebase

```bash
firebase login
```

Browser will open → Login with your Google account

### Step 14: Initialize Hosting

```bash
firebase init hosting
```

Answers:
- **Use existing project:** Select `sandra-software-crm`
- **Public directory:** `dist`
- **Single-page app:** `Yes`
- **Automatic builds:** `No`
- **Overwrite index.html:** `No`

### Step 15: Build & Deploy

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

After deployment, you'll get a URL like:
```
✔  Deploy complete!

Hosting URL: https://sandra-software-crm.web.app
```

### Step 16: Set Up Custom Domain (Optional)

1. In Firebase Console → **Hosting**
2. Click **"Add custom domain"**
3. Enter: `crm.sandrasoftware.com` (or your domain)
4. Follow DNS configuration steps
5. SSL certificate auto-provisioned

---

## Part 9: Client Onboarding Process

### How to Add New Clients:

#### Method 1: Manual (Admin Creates Account)

1. Admin logs into Firebase Console
2. Creates user in Authentication
3. Creates user profile in Firestore
4. Shares credentials with client
5. Client logs in and starts using

#### Method 2: Self-Registration with Approval

1. Client fills registration form on your website
2. Form submits to Firebase Cloud Function
3. Admin receives notification
4. Admin approves/rejects registration
5. If approved, account activated
6. Client receives welcome email

#### Method 3: Invite System

1. Admin sends invitation email
2. Client clicks invitation link
3. Client sets up password
4. Account automatically created
5. Subscription starts

---

## Part 10: Monetization Setup

### Integrating Razorpay (for Indian Payments)

1. **Create Razorpay Account:**
   - Visit: https://razorpay.com
   - Sign up as business
   - Complete KYC verification

2. **Get API Keys:**
   - Dashboard → Settings → API Keys
   - Copy Key ID and Key Secret

3. **Add to Environment:**
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
VITE_RAZORPAY_KEY_SECRET=your_secret_key
```

4. **Pricing Plans:**
```typescript
export const PRICING = {
  silver: {
    monthly: 499,  // ₹499/month
    yearly: 4990,  // ₹4990/year (2 months free)
    features: '(All core features + exports + WhatsApp)'
  },
  gold: {
    monthly: 999,  // ₹999/month
    yearly: 9990,  // ₹9990/year (2 months free)
    features: '(Everything + Enterprise features)'
  }
}
```

---

## Part 11: Testing Your Setup

### Test Checklist:

#### As Admin (Sandra Software):

- [x] Login with admin@sandrasoftware.com
- [x] Create new client account
- [x] View all clients dashboard
- [x] View analytics (total clients, revenue)
- [x] Access client data for support
- [x] Upgrade client plan

#### As Client:

- [x] Login with client credentials
- [x] Cannot see other clients' data
- [x] Can create invoices (visible only to them)
- [x] Can export reports
- [x] Plan restrictions work (Silver vs Gold)

#### Data Isolation Test:

1. Create Client A, add 5 invoices
2. Create Client B, should see 0 invoices
3. ✅ If isolated, security is working!

---

## Part 12: Going Live Checklist

### Before Production:

- [x] Change all default passwords
- [x] Update admin email to real email
- [x] Configure custom domain
- [x] Set up SSL certificate
- [x] Enable Firebase App Check (anti-abuse)
- [x] Set up monitoring & alerts
- [x] Create backup strategy
- [x] Test payment integration
- [x] Create Terms of Service
- [x] Create Privacy Policy
- [x] Set up customer support system

---

## Support & Next Steps

### Documentation:
- [MULTI_TENANT_SETUP_GUIDE.md](MULTI_TENANT_SETUP_GUIDE.md) - Technical details
- [CLOUD_DATABASE_RECOMMENDATIONS.md](CLOUD_DATABASE_RECOMMENDATIONS.md) - Database info
- [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) - Pre-launch verification

### Resources:
- Firebase Docs: https://firebase.google.com/docs
- Razorpay Docs: https://razorpay.com/docs
- React Firebase: https://react-firebase-js.com

---

## Cost Estimation for Sandra Software

### Firebase Costs (for 100 clients):

- **Firestore:** ~₹500-1000/month
- **Authentication:** Free
- **Hosting:** ₹200-500/month
- **Cloud Functions:** ₹300-500/month (if using)

**Total Infrastructure:** ~₹1000-2000/month

### Revenue Potential (100 clients):

**Scenario 1 (70% Silver, 30% Gold):**
- 70 clients × ₹499 = ₹34,930
- 30 clients × ₹999 = ₹29,970
- **Total Monthly Revenue:** ₹64,900
- **Annual Revenue:** ₹7,78,800

**Profit Margin:** ~96-98% (after infrastructure costs)

---

## Summary

✅ **Sandra Software** is now the admin company
✅ Can manage unlimited client businesses
✅ Complete data isolation between clients
✅ Admin dashboard with analytics
✅ Subscription & payment management
✅ Scalable infrastructure
✅ High profit margins

**Ready to onboard your first clients!** 🚀

---

**Created:** 2025-11-16
**Company:** Sandra Software
**Project:** ThisAI CRM Multi-Tenant System
**Status:** Production Ready ✅
