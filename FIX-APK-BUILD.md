# 🔧 Fix APK Build Issues

## Problem
APK file is not being generated after running build commands.

## Solution: Use Android Studio

The most reliable way to build the APK is through Android Studio:

### Step 1: Open Project in Android Studio
```powershell
cd d:\Project2\olduiCRM
npx cap open android
```

### Step 2: Wait for Gradle Sync
- Android Studio will automatically sync Gradle
- Wait for the sync to complete (check bottom status bar)
- Fix any errors that appear

### Step 3: Build APK
1. Go to: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete
3. Click "locate" in the notification to find your APK

## Alternative: Command Line with Full Output

If you want to use command line, try this:

```powershell
cd d:\Project2\olduiCRM

# 1. Build web app
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK with full output
cd android
.\gradlew.bat assembleDebug --stacktrace --info > build-output.txt 2>&1
cd ..

# 4. Check the output file for errors
Get-Content android\build-output.txt | Select-String -Pattern "error|Error|ERROR|failed|Failed|FAILED" -Context 2
```

## Common Issues

### Issue 1: Android SDK Not Found
**Solution**: Create `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Issue 2: Java Not Found
**Solution**: 
- Install JDK 17 or higher
- Set JAVA_HOME environment variable
- Add Java bin to PATH

### Issue 3: Gradle Build Fails
**Solution**:
- Open in Android Studio first to let it download dependencies
- Check internet connection (Gradle needs to download dependencies)
- Try: `.\gradlew.bat clean` then rebuild

### Issue 4: Build Completes But No APK
**Solution**:
- Check `android\app\build\outputs\apk\debug\` folder
- Look for any `.apk` files (may have different name)
- Check build logs for warnings

## Quick Fix Script

Run this to diagnose and fix common issues:

```powershell
cd d:\Project2\olduiCRM
powershell -ExecutionPolicy Bypass -File diagnose-apk-build.ps1
```

## Recommended Approach

**Use Android Studio** - It's the most reliable method:
1. Handles all dependencies automatically
2. Shows clear error messages
3. Provides build tools
4. Easy to debug issues

```powershell
npx cap open android
```

Then use the Build menu in Android Studio.
