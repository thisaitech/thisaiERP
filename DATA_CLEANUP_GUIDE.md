# Data Cleanup Guide

## How to Clear All Data

This guide explains how to completely remove all existing data (customers, items, invoices, etc.) from your ThisAI CRM application.

### Method 1: Using the Settings Page (Recommended)

1. **Navigate to Settings**
   - Click on the **Settings** icon in the navigation menu
   - Or go to `/settings` in your browser

2. **Go to Developer Tools Section**
   - In the settings sidebar, click on **"Developer Tools"**

3. **Click "Clear All Data" Button**
   - You'll see a red **"Clear All Data"** button
   - Click it to start the cleanup process

4. **Confirm the Action**
   - You'll get **TWO confirmation prompts**:
     - First warning about what will be deleted
     - Final confirmation before deletion
   - Click **OK** on both prompts to proceed

5. **Wait for Completion**
   - The system will clear all data from:
     - ✅ Firebase Firestore (if configured)
     - ✅ LocalStorage
   - Page will automatically reload when done

### Method 2: Using Browser Console

If you prefer using the developer console:

1. **Open Browser Console**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)

2. **Run the Command**
   ```javascript
   clearAllData()
   ```

3. **Wait for Completion**
   - Check the console for progress logs
   - Refresh the page manually when done

### What Gets Deleted

The cleanup process removes:

#### Firebase Collections (if configured):
- ✅ **Parties** (All customers/suppliers)
- ✅ **Items** (All products/services)
- ✅ **Invoices** (All sales invoices)
- ✅ **Delivery Challans**
- ✅ **Purchase Orders**
- ✅ **Credit Notes**
- ✅ **Debit Notes**
- ✅ **Proforma Invoices**
- ✅ **E-Way Bills**

#### LocalStorage:
- ✅ All cached data (except theme and language preferences)

#### What's Preserved:
- ❌ **Businesses** collection (your business info)
- ❌ **Settings** collection (your app settings)
- ❌ **Users** collection (user accounts)
- ❌ Theme and language preferences

### Before Deploying to Firebase

1. **Clear All Test Data**
   - Use the "Clear All Data" feature in Settings
   - This ensures no test/dummy data goes to production

2. **Create Fresh Data**
   - Add your real business information
   - Add actual customers and items
   - Create real invoices

3. **Deploy to Firebase**
   ```bash
   npm run build
   firebase deploy
   ```

The cleaned state will be deployed, and Firebase will only contain your fresh data.

### Important Notes

⚠️ **WARNING**: This action is **IRREVERSIBLE**!
- Make sure you have backups if needed
- Double-check before confirming the deletion
- The app requires two confirmations to prevent accidental deletion

💡 **Tip**: Always export your data as a backup before clearing:
- Go to Settings → Backup & Export
- Click "Export Complete Data"
- Save the JSON file somewhere safe

### Troubleshooting

**If Firebase data doesn't clear:**
- Check your Firebase configuration in `.env`
- Ensure you have proper permissions in Firebase Console
- Check browser console for error messages

**If LocalStorage doesn't clear:**
- Try manually clearing browser data
- Go to Browser Settings → Clear browsing data → Cached images and files

### Support

For issues or questions:
- Check the console logs for detailed error messages
- Ensure Firebase is properly configured
- Contact your development team if problems persist
