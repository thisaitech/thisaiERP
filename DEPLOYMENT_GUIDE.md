# Deployment Guide - ThisAI CRM

## Prerequisites

Before deploying, you need to fix TypeScript compilation errors. Run:
```bash
npm run build
```

If errors persist, you can temporarily skip type checking by modifying the build script.

## Part 1: Firebase Hosting Deployment

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase
```bash
firebase login
```

### Step 3: Initialize or Verify Firebase Project
```bash
# If not already initialized
firebase init

# Select: Hosting
# Use existing project: thisai-crm-silver (or your actual Firebase project ID)
# Public directory: dist
# Configure as single-page app: Yes
# Set up automatic builds: No
```

### Step 4: Update Firebase Configuration
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project or create a new one
3. Get your Firebase configuration from Project Settings
4. Update `.env` file with your Firebase credentials

### Step 5: Build the Project
```bash
# Fix TypeScript errors first, or use:
npm run build -- --mode production
```

### Step 6: Deploy to Firebase
```bash
firebase deploy
```

Your app will be live at: `https://thisai-crm-silver.web.app`

---

## Part 2: Generate Android APK

### Step 1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### Step 2: Initialize Capacitor
```bash
npx cap init
```

When prompted:
- App name: ThisAI CRM
- App ID: com.thisai.crm (or your desired package name)
- Web directory: dist

### Step 3: Build the Web App
```bash
npm run build
```

### Step 4: Add Android Platform
```bash
npx cap add android
```

### Step 5: Copy Web Assets
```bash
npx cap copy android
npx cap sync android
```

### Step 6: Install Android Studio (if not installed)
Download from: https://developer.android.com/studio

### Step 7: Open Project in Android Studio
```bash
npx cap open android
```

### Step 8: Generate APK in Android Studio

1. In Android Studio, go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build to complete
3. Click "locate" in the notification to find your APK
4. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 9: Generate Signed Release APK (Production)

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Create a new keystore or use existing
4. Fill in keystore details (save these credentials!)
5. Select **release** build variant
6. Click **Finish**
7. APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Quick Commands Reference

### Firebase Deployment
```bash
# Build
npm run build

# Deploy
firebase deploy

# Deploy hosting only
firebase deploy --only hosting
```

### APK Generation
```bash
# Sync web assets
npx cap sync

# Open in Android Studio
npx cap open android

# Or build from command line (requires Android SDK)
cd android
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk

# For release build
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

---

## Troubleshooting

### TypeScript Errors
If build fails due to TypeScript errors:

1. **Option 1**: Fix the errors (recommended)
2. **Option 2**: Modify `package.json`:
   ```json
   "build": "vite build"
   ```
   (Remove `tsc &&` to skip type checking)

### Firebase Deploy Fails
- Verify `.firebaserc` has correct project ID
- Run `firebase use --add` to select project
- Check Firebase CLI is logged in: `firebase login`

### Capacitor Issues
- Ensure Node.js version is 16 or higher
- Clear cache: `npx cap sync --force`
- Reinstall: `npx cap add android --force`

### Android Build Fails
- Install Android SDK Platform 33 or higher
- Accept all licenses: `sdkmanager --licenses`
- Ensure Java JDK 11 or higher is installed

---

## Environment Variables

Create `.env` file with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional API Keys
VITE_GOOGLE_VISION_API_KEY=
VITE_OPENAI_API_KEY=
VITE_RAZORPAY_KEY_ID=
```

---

## Post-Deployment

### Test Your Deployed App
1. Firebase: Visit your hosting URL
2. Android: Install APK on device
3. Test all features, especially authentication and database operations

### Update App
```bash
# Make changes
# Build
npm run build

# Deploy to Firebase
firebase deploy

# Update Android
npx cap sync
npx cap open android
# Rebuild APK in Android Studio
```

---

## Distribution

### Firebase Hosting
- Automatic HTTPS
- Global CDN
- Free SSL certificate
- Custom domain support

### Android APK
- **Debug APK**: For testing only
- **Release APK**: For production distribution
- Upload to Google Play Store for official distribution
- Or distribute directly (enable "Install from Unknown Sources" on devices)

---

## Support

For issues:
1. Check Firebase console for hosting errors
2. Check Android Studio logcat for mobile issues
3. Verify all environment variables are set
4. Ensure Firebase rules allow read/write for authenticated users
