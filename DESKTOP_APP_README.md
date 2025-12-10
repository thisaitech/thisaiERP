# Desktop App Setup - ThisAI CRM

## 🖥️ Electron Desktop Application

Your CRM now has a desktop application built with Electron!

### Development

Run the desktop app in development mode:
```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Launch the Electron app
3. Auto-reload on file changes

### Build Desktop Apps

#### Windows
```bash
npm run electron:build:win
```
Creates:
- `release/ThisAI CRM Setup.exe` - Installer
- `release/ThisAI CRM.exe` - Portable version

#### macOS
```bash
npm run electron:build:mac
```
Creates:
- `release/ThisAI CRM.dmg` - Installer
- `release/ThisAI CRM-mac.zip` - Portable version

#### Linux
```bash
npm run electron:build:linux
```
Creates:
- `release/ThisAI CRM.AppImage` - Portable
- `release/thisai-crm.deb` - Debian package

### Build All Platforms
```bash
npm run electron:build
```

### Features

✅ **Native Desktop App** - Runs as a standalone application
✅ **Full Screen Support** - Maximizable, resizable windows
✅ **System Tray Integration** - Minimize to tray
✅ **Auto Updates** - Built-in update mechanism
✅ **Offline Support** - Works without internet (with Firebase cache)
✅ **Better Performance** - Native performance vs browser
✅ **Professional Look** - Custom window frame and icon

### File Locations

Built apps will be in: `release/`

### Platform Availability

- ✅ **Windows** - Windows 10/11 (64-bit)
- ✅ **macOS** - macOS 10.13+ (Intel & Apple Silicon)
- ✅ **Linux** - Ubuntu, Debian, Fedora (64-bit)

### Distribution

After building:
1. Find installers in `release/` folder
2. Share `.exe` (Windows), `.dmg` (Mac), or `.AppImage` (Linux)
3. Users can install and run without browser

### Notes

- First build takes longer (downloads Electron binaries)
- App size: ~150-200 MB (includes Chromium)
- Uses same Firebase backend as web app
- All data syncs across web, mobile, and desktop
