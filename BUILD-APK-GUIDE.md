# 📱 Android APK Build Guide

## Quick Build (Command Line)

### Option 1: Automated Script (Recommended)
```powershell
cd d:\Project2\olduiCRM
powershell -ExecutionPolicy Bypass -File build-apk.ps1
```

This script will:
1. ✅ Build your web app (`npm run build`)
2. ✅ Sync with Capacitor
3. ✅ Build Debug APK
4. ✅ Build Release APK (unsigned)

### Option 2: Manual Steps

#### Step 1: Build Web App
```powershell
npm run build
```

#### Step 2: Sync Capacitor
```powershell
npx cap sync android
```

#### Step 3: Build APK with Gradle
```powershell
cd android
.\gradlew.bat assembleDebug      # For debug APK
.\gradlew.bat assembleRelease    # For release APK
cd ..
```

## APK Locations

After building, APKs will be at:
- **Debug APK**: `android\app\build\outputs\apk\debug\app-debug.apk`
- **Release APK**: `android\app\build\outputs\apk\release\app-release-unsigned.apk`

## Using Android Studio

### Option 1: Open in Android Studio
```powershell
npx cap open android
```

Then in Android Studio:
1. Wait for Gradle sync to complete
2. Go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Or: **Build → Generate Signed Bundle / APK** (for signed release)

### Option 2: Build from Android Studio Menu
1. Open Android Studio
2. File → Open → Select `android` folder
3. Wait for sync
4. Build → Build Bundle(s) / APK(s) → Build APK(s)

## Signing APK for Production

### Create Keystore (First Time Only)
```powershell
cd android\app
keytool -genkey -v -keystore thisai-crm-release.keystore -alias thisai-crm -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing in build.gradle

Add to `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('thisai-crm-release.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'thisai-crm'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

### Build Signed Release APK
```powershell
cd android
.\gradlew.bat assembleRelease
```

## Troubleshooting

### Issue: Gradle build fails
**Solution**: Make sure you have:
- Java JDK 17 or higher installed
- Android SDK installed
- Set `JAVA_HOME` environment variable

### Issue: "SDK location not found"
**Solution**: Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Issue: "Build tools not found"
**Solution**: Install Android Build Tools via Android Studio SDK Manager

### Issue: Capacitor sync fails
**Solution**: 
```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap sync android
```

## Testing APK

### Install on Device
```powershell
# Enable USB Debugging on your Android device
# Connect via USB
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Or Transfer APK
1. Copy APK to your device
2. Open file manager on device
3. Tap APK to install
4. Allow "Install from Unknown Sources" if prompted

## Current Configuration

- **App ID**: `com.thisai.crm`
- **App Name**: `ThisAI CRM`
- **Min SDK**: 23 (Android 6.0)
- **Target SDK**: 35 (Android 15)
- **Web Directory**: `dist`

## Quick Commands Summary

```powershell
# Full build process
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
cd ..

# Or use the script
powershell -ExecutionPolicy Bypass -File build-apk.ps1
```

## ✅ Success!

Your APK will be ready for installation and testing!
