# 🚀 Quick APK Build Instructions

## Method 1: Command Line (Fastest)

### Step-by-Step:

1. **Build the web app:**
   ```powershell
   cd d:\Project2\olduiCRM
   npm run build
   ```

2. **Sync with Capacitor:**
   ```powershell
   npx cap sync android
   ```

3. **Build the APK:**
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   cd ..
   ```

4. **Find your APK:**
   - Location: `android\app\build\outputs\apk\debug\app-debug.apk`
   - Open the folder: `explorer android\app\build\outputs\apk\debug`

## Method 2: Android Studio (Recommended for First Time)

1. **Open Android Studio:**
   ```powershell
   cd d:\Project2\olduiCRM
   npx cap open android
   ```

2. **Wait for Gradle Sync** (may take a few minutes on first open)

3. **Build APK:**
   - Go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Or: **Build → Generate Signed Bundle / APK** (for production)

4. **APK Location:**
   - After build, Android Studio will show a notification
   - Click "locate" to find the APK
   - Or check: `android\app\build\outputs\apk\debug\`

## Method 3: Use the Automated Script

```powershell
cd d:\Project2\olduiCRM
powershell -ExecutionPolicy Bypass -File build-apk.ps1
```

## 📱 Install APK on Your Device

### Option 1: USB Debugging
```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Option 2: Transfer File
1. Copy APK to your phone
2. Open file manager
3. Tap APK to install
4. Allow "Install from Unknown Sources"

## ⚠️ Troubleshooting

### If Gradle fails:
- Make sure Java JDK is installed
- Check Android SDK is installed
- Verify `android/local.properties` has SDK path

### If build fails:
- Run: `npx cap sync android`
- Check: `npm run build` completes successfully
- Verify: `dist` folder exists after build

## ✅ Success!

Your APK is ready at:
`android\app\build\outputs\apk\debug\app-debug.apk`
