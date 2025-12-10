# Firebase Setup & Deployment Guide

This guide will help you set up Firebase for the ThisAI CRM application and create admin accounts for Sandra Software and Thisai Technology.

## Prerequisites

- Node.js installed
- Firebase account (free tier is sufficient)
- Firebase CLI installed globally: `npm install -g firebase-tools`

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a project"
3. Enter project name: `thisai-crm` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click "Get Started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** authentication
5. Click "Save"

## Step 3: Enable Firestore Database

1. In your Firebase project, go to **Build → Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add rules later)
4. Select a location closest to your users
5. Click "Enable"

## Step 4: Enable Storage (Optional, for future file uploads)

1. Go to **Build → Storage**
2. Click "Get Started"
3. Choose **Start in production mode**
4. Click "Done"

## Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app with nickname: "ThisAI CRM Web"
5. **Don't** check "Also set up Firebase Hosting" (we'll do this later)
6. Click "Register app"
7. Copy the `firebaseConfig` object values

## Step 6: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=thisai-crm.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=thisai-crm
   VITE_FIREBASE_STORAGE_BUCKET=thisai-crm.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Important**: Never commit `.env` to version control!

## Step 7: Update Firestore Security Rules

1. Go to **Firestore Database → Rules**
2. Replace the rules with:

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
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Business data - accessible to authenticated users
    match /businesses/{businessId} {
      allow read, write: if isAuthenticated();
    }

    match /parties/{partyId} {
      allow read, write: if isAuthenticated();
    }

    match /items/{itemId} {
      allow read, write: if isAuthenticated();
    }

    match /invoices/{invoiceId} {
      allow read, write: if isAuthenticated();
    }

    match /settings/{settingId} {
      allow read, write: if isAuthenticated();
    }

    match /delivery_challans/{challanId} {
      allow read, write: if isAuthenticated();
    }

    match /purchase_orders/{orderId} {
      allow read, write: if isAuthenticated();
    }

    match /credit_notes/{noteId} {
      allow read, write: if isAuthenticated();
    }

    match /debit_notes/{noteId} {
      allow read, write: if isAuthenticated();
    }

    match /proforma_invoices/{invoiceId} {
      allow read, write: if isAuthenticated();
    }

    match /eway_bills/{billId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

3. Click "Publish"

## Step 8: Create Admin Accounts

### Option A: Using the Setup Page (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/setup`

3. Click "Create Admin Accounts" button

4. The following accounts will be created:
   - **Sandra Software**: `admin@sandrasoftware.com`
   - **Thisai Technology**: `admin@thisaitech.com`

5. **Important**: Note the passwords shown in the setup logs and change them immediately after first login!

### Option B: Manual Creation via Firebase Console

1. Go to **Authentication → Users**
2. Click "Add user"
3. For Sandra Software:
   - Email: `admin@sandrasoftware.com`
   - Password: `YourSecurePassword123!`
4. Repeat for Thisai Technology:
   - Email: `admin@thisaitech.com`
   - Password: `YourSecurePassword123!`

5. Create user documents in Firestore:
   - Go to **Firestore Database**
   - Create collection: `users`
   - For each user, create a document with UID as document ID:
     ```json
     {
       "uid": "user-uid-from-auth",
       "email": "admin@sandrasoftware.com",
       "displayName": "Sandra Admin",
       "companyName": "Sandra Software",
       "role": "admin",
       "createdAt": "2024-01-01T00:00:00.000Z",
       "lastLogin": "2024-01-01T00:00:00.000Z"
     }
     ```

## Step 9: Test Authentication

1. Navigate to: `http://localhost:3000/login`
2. Login with one of the admin accounts
3. Verify you can access the dashboard
4. Test logout functionality

## Step 10: Deploy to Firebase Hosting

1. Login to Firebase CLI:
   ```bash
   firebase login
   ```

2. Initialize Firebase in your project:
   ```bash
   firebase init
   ```

3. Select:
   - **Hosting: Configure files for Firebase Hosting**
   - Choose your existing project
   - Public directory: `dist`
   - Single-page app: `Yes`
   - Set up automatic builds: `No`
   - Overwrite index.html: `No`

4. Build the production app:
   ```bash
   npm run build
   ```

5. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

6. Your app will be live at: `https://your-project-id.web.app`

## Step 11: Update Environment Variables for Production

After deploying, you may want to create a production environment file:

1. Create `.env.production`:
   ```env
   VITE_FIREBASE_API_KEY=same_as_dev
   VITE_FIREBASE_AUTH_DOMAIN=thisai-crm.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=thisai-crm
   VITE_FIREBASE_STORAGE_BUCKET=thisai-crm.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Admin Account Credentials

After setup, the following accounts will be available:

### Sandra Software
- **Email**: `admin@sandrasoftware.com`
- **Password**: Set during setup (default: `Sandra@2024!`)
- **Company**: Sandra Software
- **Role**: Admin

### Thisai Technology
- **Email**: `admin@thisaitech.com`
- **Password**: Set during setup (default: `ThisAI@2024!`)
- **Company**: Thisai Technology
- **Role**: Admin

**⚠️ Security Warning**: Change these default passwords immediately after first login!

## Ongoing Maintenance

### To update the app:
```bash
npm run build
firebase deploy
```

### To view logs:
```bash
firebase functions:log
```

### To manage users:
Go to Firebase Console → Authentication → Users

## Troubleshooting

### Firebase not initializing
- Check that all environment variables are correctly set in `.env`
- Verify Firebase project settings match your `.env` values
- Clear browser cache and restart dev server

### Authentication errors
- Verify Email/Password authentication is enabled in Firebase Console
- Check Firestore security rules allow authenticated users
- Ensure user documents exist in Firestore `users` collection

### Deployment issues
- Make sure you've run `npm run build` before deploying
- Check that `firebase.json` has correct configuration
- Verify you're logged into the correct Firebase account

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Enable Authentication and Firestore
3. ✅ Configure environment variables
4. ✅ Create admin accounts
5. ✅ Test login functionality
6. ✅ Deploy to Firebase Hosting
7. 🔄 Customize and add features
8. 🔄 Set up custom domain (optional)

## Support

For issues or questions:
- Firebase Documentation: https://firebase.google.com/docs
- This project's GitHub issues (if applicable)
