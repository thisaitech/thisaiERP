# Quick Start Guide - ThisAI CRM

## What's New

### ✨ Features Added

1. **AI Scan Purchase** - New quick action button on dashboard that opens the AI receipt scanner directly
2. **Firebase Authentication** - Secure login system with user management
3. **Admin Accounts** - Pre-configured for Sandra Software and Thisai Technology
4. **PWA Support** - App can be installed on mobile, tablet, and desktop
5. **Protected Routes** - All pages require authentication

## Getting Started

### 1. Install Dependencies (if not already done)

```bash
npm install
```

### 2. Configure Firebase

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials (see FIREBASE_SETUP.md for details).

### 3. Start Development Server

```bash
npm run dev
```

The app will open at: `http://localhost:3000`

### 4. Create Admin Accounts

Navigate to: `http://localhost:3000/setup`

Click "Create Admin Accounts" to set up:
- **Sandra Software**: admin@sandrasoftware.com
- **Thisai Technology**: admin@thisaitech.com

### 5. Login

Go to: `http://localhost:3000/login`

Use one of the admin accounts created in step 4.

## Quick Actions on Dashboard

The dashboard now has 18 quick action buttons including:

1. **AI Scan Purchase** ⭐ NEW - Opens AI receipt scanner
2. New Invoice - Create sales invoice
3. New Bill - Create purchase bill
4. New Quote - Create quotation
5. Add Party - Add customer/supplier
6. New Expense - Record expense
7. Add Item - Add inventory item
8. Delivery Challan
9. Purchase Order
10. E-Way Bill
11. Payment In/Out
12. Price Lists
13. Attendance
14. Schemes
15. Notes
16. Barcode Scanner
17. QR Scanner

## Authentication Flow

### Login Process
1. User goes to `/login`
2. Enters email and password
3. Firebase authenticates
4. User data loaded from Firestore
5. Redirected to dashboard

### Logout Process
1. Click logout button (top right, sign-out icon)
2. Firebase session cleared
3. Redirected to login page

### Protected Routes
All app routes require authentication. Unauthenticated users are redirected to `/login`.

## PWA Installation

### Desktop (Chrome/Edge)
1. Open the app in browser
2. Click install icon (➕) in address bar
3. Click "Install"

### Mobile (Android/iOS)
1. Open in Chrome/Safari
2. Tap share button
3. Select "Add to Home Screen"

### App Shortcuts
Long-press app icon to access:
- New Invoice
- Add Party
- Reports

## File Structure

```
src/
├── components/
│   ├── Layout.tsx           # Main layout with navigation
│   ├── ProtectedRoute.tsx   # Route protection wrapper
│   └── ...
├── contexts/
│   └── AuthContext.tsx      # Authentication state management
├── pages/
│   ├── Dashboard.tsx        # Main dashboard (with AI Scan button)
│   ├── Login.tsx            # Login page
│   ├── Setup.tsx            # Admin account setup
│   └── ...
├── services/
│   ├── firebase.ts          # Firebase initialization
│   ├── authService.ts       # Authentication functions
│   └── ...
└── scripts/
    └── setupAdminAccounts.ts # Admin account creation script
```

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Deploying to Firebase

```bash
# First time setup
firebase login
firebase init

# Build and deploy
npm run build
firebase deploy
```

See FIREBASE_SETUP.md for detailed deployment instructions.

## Default Passwords

⚠️ **Change these immediately after first login!**

Default passwords are set in `src/scripts/setupAdminAccounts.ts`:
- Sandra Software: `Sandra@2024!`
- Thisai Technology: `ThisAI@2024!`

## Common Issues

### Firebase not initialized
- Check `.env` file exists and has correct values
- Restart dev server after changing `.env`

### Login not working
- Verify Firebase Authentication is enabled
- Check email/password match created accounts
- View browser console for error messages

### PWA not installing
- Use HTTPS (Firebase Hosting provides this)
- Ensure manifest.json is accessible
- Create icon files in /public directory

## Next Steps

1. ✅ Configure Firebase
2. ✅ Create admin accounts
3. ✅ Test login/logout
4. ✅ Test AI Scan Purchase button
5. 🔄 Change default passwords
6. 🔄 Add real data
7. 🔄 Deploy to Firebase
8. 🔄 Set up custom domain (optional)

## Support Files

- `FIREBASE_SETUP.md` - Complete Firebase setup guide
- `.env.example` - Environment variables template
- `firebase.json` - Firebase hosting configuration
- `.firebaserc` - Firebase project configuration

## Technologies Used

- React 18.2 + TypeScript
- Vite (Build tool)
- Firebase (Auth + Firestore + Hosting)
- Framer Motion (Animations)
- Tailwind CSS (Styling)
- PWA (Progressive Web App)
- Sonner (Toast notifications)
