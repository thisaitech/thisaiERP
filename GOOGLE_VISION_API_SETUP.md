# 🔑 Google Vision API Setup Guide

## Problem Solved
Your invoice scanner was showing **old/cached data** because it was falling back to **mock/demo data** when the Google Vision API key was missing. Now it will show a clear error message instead.

---

## ✅ Quick Setup (5 minutes)

### Step 1: Get Your FREE API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create/Select a Project**
   - Click "Select a Project" at the top
   - Click "New Project"
   - Name it "ThisAI CRM" (or any name you want)
   - Click "Create"

3. **Enable Cloud Vision API**
   - Search for "Cloud Vision API" in the search bar
   - Click on "Cloud Vision API"
   - Click "ENABLE" button
   - Wait for it to enable (takes ~30 seconds)

4. **Create API Key**
   - Go to "Credentials" from the left menu
   - Click "+ CREATE CREDENTIALS" at the top
   - Select "API key"
   - **Copy the API key** that appears (looks like: `AIzaSyB...`)
   - (Optional) Click "Restrict Key" to limit it to Cloud Vision API only

### Step 2: Add Key to Your App

1. **Open the `.env` file** in your project root folder
   ```
   z:\Projects\Thisai_crm\.env
   ```

2. **Replace the placeholder** with your actual API key:
   ```env
   VITE_GOOGLE_VISION_API_KEY=AIzaSyB_your_actual_key_here_copy_from_google
   ```

3. **Save the file**

### Step 3: Restart the App

1. **Stop the development server** (Ctrl+C in terminal)
2. **Start it again**:
   ```bash
   npm run dev
   ```

---

## 🎉 Test It!

1. Go to **Purchases** or **Sales** page
2. Click **"AI Scan"** button (camera icon)
3. Upload an invoice image
4. You should now see **real extracted data** from your invoice!

---

## 💰 Pricing

- **FREE**: First 1,000 images per month
- **After that**: $1.50 per 1,000 images
- **Your use case**: Even scanning 100 invoices/day = ~3,000/month = ~$3/month

---

## ❓ Troubleshooting

### Error: "API key not valid"
- Make sure you copied the entire key
- Check for extra spaces before/after the key
- Ensure you enabled Cloud Vision API in Google Cloud Console

### Error: "Quota exceeded"
- You've used more than 1,000 scans this month
- Enable billing in Google Cloud Console (you'll only pay for usage above free tier)

### Still showing old data?
- Make sure you **restarted the app** after adding the key
- Check the browser console for any error messages
- Clear browser cache and reload

---

## 🔒 Security Note

**IMPORTANT**: The `.env` file is in `.gitignore` so your API key won't be committed to Git. Keep it private!

---

## 🆘 Need Help?

If you're still having issues:
1. Check the browser console (F12 → Console tab) for error messages
2. Verify your API key is correct in the `.env` file
3. Make sure Cloud Vision API is enabled in your Google Cloud project

---

## 🚀 Alternative: Use OpenAI GPT-4 Vision

If you prefer OpenAI (more expensive but potentially more accurate):

1. Get API key from: https://platform.openai.com/
2. Add to `.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-your-openai-key-here
   ```
3. Change provider in `src/services/enhancedReceiptAI.ts`:
   ```typescript
   provider: 'openai' as AIProvider
   ```

**Cost**: ~$0.01 per image (no free tier)
