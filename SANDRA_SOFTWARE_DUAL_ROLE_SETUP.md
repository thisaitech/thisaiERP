# Sandra Software - Dual Role Setup Guide

## Understanding the Setup

Sandra Software has **TWO roles** in this system:

### Role 1: Regular User (Using CRM for Sandra Software Business)
- Sandra Software uses the CRM to manage their own business
- Track their own invoices, customers, inventory
- Like any other client/user

### Role 2: Super Admin (Managing Other Client Businesses)
- Can view analytics across all clients
- Can create accounts for other businesses (Royal Tailors, Fashion Shop, etc.)
- Can support clients by viewing their data
- Manages subscriptions and billing

---

## Account Structure

```
Firebase Database
│
├── Sandra Software (Owner/Admin)
│   ├── Role: "owner" + "admin"
│   ├── Uses CRM for their own business
│   └── Can also manage other clients
│
├── Client 1: Royal Tailors
│   ├── Role: "client"
│   └── Uses CRM for their tailoring business
│
├── Client 2: Fashion Boutique
│   ├── Role: "client"
│   └── Uses CRM for their retail business
│
└── Client 3: Modern Stitching
    ├── Role: "client"
    └── Uses CRM for their tailoring business
```

---

## Quick Setup for Sandra Software

### Step 1: Create Sandra Software Account (Owner + Admin)

1. Go to Firebase Console → **Authentication** → **Users**
2. Click **"Add user"**
3. Fill in:
   - Email: `admin@sandrasoftware.com`
   - Password: `SecureAdmin@2024!`
4. Click **"Add user"**
5. **COPY the User UID** (example: `sandra_abc123`)

### Step 2: Create User Profile in Firestore

1. Go to **Firestore Database**
2. Click **"Start collection"** → Collection ID: `users`
3. Document ID: **(Paste the UID from Step 1)**
4. Add these fields:

| Field | Type | Value | Purpose |
|-------|------|-------|---------|
| uid | string | sandra_abc123 | Unique identifier |
| email | string | admin@sandrasoftware.com | Login email |
| **role** | string | **owner** | Identifies as both user + admin |
| companyName | string | Sandra Software | Their company name |
| displayName | string | Sandra Admin | Display name |
| phone | string | +91-9876543210 | Contact number |
| subscriptionPlan | string | gold | Full access (they own the system) |
| **isAdmin** | boolean | **true** | Can manage other clients |
| **isSuperUser** | boolean | **true** | Full system access |
| createdAt | timestamp | (current time) | Account creation |

5. Click **"Save"**

---

## What Sandra Software Can Do

### As Regular User (for their own business):

✅ **Manage Sandra Software's Business:**
- Create invoices for Sandra Software clients
- Track their own customers (software buyers)
- Manage their inventory (software products/licenses)
- Generate reports for Sandra Software
- Export data for Sandra Software
- Use all CRM features for their own business

**Data Location:** All Sandra's business data has `userId: sandra_abc123`

### As Super Admin (managing other clients):

✅ **Client Management:**
- Create new client accounts (Royal Tailors, Fashion Shop, etc.)
- View list of all clients
- Upgrade/downgrade client plans
- Suspend/activate accounts

✅ **Analytics Dashboard:**
- View total number of clients
- Track revenue from all clients
- Monitor feature usage across clients
- See subscription status

✅ **Support:**
- View any client's data (for troubleshooting)
- Access client invoices (read-only)
- Help clients with issues

---

## Example Scenario

### Sandra Software's Daily Work:

**Morning (As Regular User):**
```
Login: admin@sandrasoftware.com
Dashboard shows:
- Sandra Software's invoices (their own business)
- Sandra Software's customers
- Sandra Software's revenue
```

**Afternoon (As Super Admin):**
```
Switch to Admin Panel:
- View all clients: Royal Tailors, Fashion Shop, etc.
- See total revenue: ₹50,000/month from 100 clients
- Create new client: "Modern Boutique"
- Help Royal Tailors with an invoice issue
```

---

## Database Structure Example

### Sandra Software's Own Data:

```javascript
// Invoice created by Sandra Software for THEIR business
{
  id: "inv_001",
  userId: "sandra_abc123",  // Sandra's UID
  partyName: "ABC Corporation",  // Sandra's customer
  amount: 50000,
  description: "Software license sale"
}
```

### Client's Data (Royal Tailors):

```javascript
// Invoice created by Royal Tailors
{
  id: "inv_002",
  userId: "royal_xyz789",  // Royal Tailors' UID
  partyName: "Rajesh Kumar",  // Royal Tailors' customer
  amount: 5000,
  description: "Suit stitching"
}
```

**Note:** Sandra Software can VIEW both (as admin), but only inv_001 shows in THEIR business dashboard.

---

## UI/UX Flow

### When Sandra Logs In:

```
┌─────────────────────────────────────┐
│  Welcome, Sandra Software           │
│  admin@sandrasoftware.com           │
├─────────────────────────────────────┤
│                                     │
│  [ My Business ] [ Admin Panel ]   │ ← Two tabs
│                                     │
└─────────────────────────────────────┘
```

### Tab 1: My Business (Default)
- Shows Sandra Software's own invoices, customers, reports
- Works like any other client
- Full CRM features for their business

### Tab 2: Admin Panel (Admin Features)
- Client list and management
- System-wide analytics
- Subscription management
- Support tools

---

## Updated Firestore Security Rules

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

    function isSuperAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSuperUser == true;
    }

    function isAdmin() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Users collection
    match /users/{userId} {
      // Users can read/write their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;

      // Super admins can read all user profiles
      allow read: if isSuperAdmin();

      // Admins can create client accounts
      allow create: if isAdmin();
    }

    // Invoices - users access their own, admins can view all
    match /invoices/{invoiceId} {
      // Users can manage their own invoices
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);

      // Super admins can view all invoices (for support)
      allow read: if isSuperAdmin();
    }

    // Same pattern for parties, items, expenses
    match /parties/{partyId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow read: if isSuperAdmin();
    }

    match /items/{itemId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow read: if isSuperAdmin();
    }

    match /expenses/{expenseId} {
      allow read, write: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow read: if isSuperAdmin();
    }

    // Admin-only collections
    match /admin/{document=**} {
      allow read, write: if isSuperAdmin();
    }

    match /analytics/{document=**} {
      allow read, write: if isAdmin();
    }

    match /subscriptions/{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## Code Implementation

### Update src/hooks/usePlan.ts

Add admin detection:

```typescript
import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { PLAN_CONFIG } from '../types'

export const usePlan = () => {
  const { userProfile } = useAuth()

  const currentPlan = userProfile?.subscriptionPlan || 'silver'
  const planConfig = PLAN_CONFIG[currentPlan]

  const hasFeature = useMemo(() => {
    return (feature: keyof typeof planConfig.features): boolean => {
      return planConfig.features[feature]
    }
  }, [planConfig])

  const isGoldPlan = currentPlan === 'gold'
  const isSilverPlan = currentPlan === 'silver'

  // New admin checks
  const isAdmin = userProfile?.isAdmin === true
  const isSuperUser = userProfile?.isSuperUser === true
  const isOwner = userProfile?.role === 'owner'

  return {
    currentPlan,
    planConfig,
    hasFeature,
    isGoldPlan,
    isSilverPlan,
    isAdmin,
    isSuperUser,
    isOwner,
    shopName: userProfile?.companyName || 'My Business',
    ownerName: userProfile?.displayName || 'User'
  }
}
```

### Create Admin Panel Component

Create `src/pages/AdminPanel.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { usePlan } from '../hooks/usePlan'
import { Users, TrendUp, DollarSign, Activity } from '@phosphor-icons/react'

export const AdminPanel = () => {
  const { isAdmin, isSuperUser } = usePlan()
  const [clients, setClients] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    silverClients: 0,
    goldClients: 0
  })

  // Redirect if not admin
  if (!isAdmin && !isSuperUser) {
    return <div className="p-8">Access Denied: Admin Only</div>
  }

  useEffect(() => {
    const fetchClients = async () => {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('role', '==', 'client'))
      const snapshot = await getDocs(q)

      const clientData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setClients(clientData)

      // Calculate stats
      const active = clientData.filter(c => c.isActive !== false).length
      const silver = clientData.filter(c => c.subscriptionPlan === 'silver').length
      const gold = clientData.filter(c => c.subscriptionPlan === 'gold').length
      const revenue = (silver * 499) + (gold * 999)

      setStats({
        totalClients: clientData.length,
        activeClients: active,
        totalRevenue: revenue,
        silverClients: silver,
        goldClients: gold
      })
    }

    fetchClients()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6">
          <Users size={32} className="text-blue-400 mb-2" />
          <h3 className="text-sm text-slate-400">Total Clients</h3>
          <p className="text-3xl font-bold">{stats.totalClients}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <Activity size={32} className="text-green-400 mb-2" />
          <h3 className="text-sm text-slate-400">Active Clients</h3>
          <p className="text-3xl font-bold">{stats.activeClients}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <DollarSign size={32} className="text-amber-400 mb-2" />
          <h3 className="text-sm text-slate-400">Monthly Revenue</h3>
          <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <TrendUp size={32} className="text-purple-400 mb-2" />
          <h3 className="text-sm text-slate-400">Plans</h3>
          <p className="text-lg">Silver: {stats.silverClients} | Gold: {stats.goldClients}</p>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">All Clients</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3">Company</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                  <td className="p-3">{client.companyName}</td>
                  <td className="p-3">{client.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      client.subscriptionPlan === 'gold'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {client.subscriptionPlan?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                      Active
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-400">
                    {client.createdAt?.toDate().toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

### Update Layout to Show Admin Toggle

Update `src/components/Layout.tsx`:

```typescript
import { usePlan } from '../hooks/usePlan'
import { Link } from 'react-router-dom'
import { Shield } from '@phosphor-icons/react'

const Layout = () => {
  const { isAdmin, isSuperUser, shopName } = usePlan()

  return (
    <div>
      <header>
        {/* Existing header content */}

        {/* Show admin link if user is admin */}
        {(isAdmin || isSuperUser) && (
          <Link
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
          >
            <Shield size={20} />
            <span className="text-sm font-semibold">Admin Panel</span>
          </Link>
        )}
      </header>

      {/* Rest of layout */}
    </div>
  )
}
```

---

## Summary

### What You Get:

✅ **Sandra Software Account:**
- Email: `admin@sandrasoftware.com`
- Role: Owner + Admin
- Can use CRM for their own business
- Can also manage other clients

✅ **Dual Functionality:**
- **My Business Tab:** Sandra's own invoices, customers, inventory
- **Admin Panel Tab:** Manage all clients, view analytics

✅ **Clean Data Separation:**
- Sandra's business data: `userId: sandra_abc123`
- Client 1 data: `userId: royal_xyz789`
- Client 2 data: `userId: fashion_abc456`

✅ **Security:**
- Clients can ONLY see their own data
- Sandra can see everything (for support)
- Super secure with Firestore rules

---

## Next Steps

1. **Set up Sandra Software account** (Steps 1-2 above)
2. **Test by logging in** as Sandra
3. **Create a test client** (e.g., Royal Tailors)
4. **Verify data isolation** (clients can't see each other)
5. **Build Admin Panel UI** (use code above)
6. **Deploy and launch!**

You now have ONE account that does BOTH:
- Uses CRM for Sandra Software's business
- Manages other client businesses

**Perfect dual-role setup!** ✅
