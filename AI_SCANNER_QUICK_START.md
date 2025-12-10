# AI Receipt Scanner - Quick Start Guide

## ✨ What's New?

Your ThisAI CRM now has **AI-powered receipt scanning**!

📸 **Scan any receipt** → 🤖 **AI extracts data** → ✅ **Auto-fills forms**

## 🚀 Quick Setup (5 minutes)

### Step 1: Get FREE API Key from Google
1. Go to: https://console.cloud.google.com/
2. Create new project
3. Enable "Cloud Vision API"
4. Create API Key
5. Copy the key

### Step 2: Add to Your App
1. Create `.env` file in project root
2. Add this line:
```env
VITE_GOOGLE_VISION_API_KEY=paste_your_key_here
```

### Step 3: Restart App
```bash
npm run dev
```

## 🎯 How to Use

### For Purchases:
1. Go to **Purchases** page
2. Click **AI Scan** button (blue button with camera 📸)
3. Upload receipt photo
4. Wait 2 seconds
5. Click **Confirm** - Form auto-fills! ✨

### For Sales:
Same process on **Sales** page!

## 💰 Pricing

### Google Vision API (Recommended):
- **FREE**: First 1,000 scans/month
- **Paid**: $1.50 per 1,000 scans after that

### Example:
- 100 receipts/month = **FREE** ✅
- 1,000 receipts/month = **FREE** ✅
- 5,000 receipts/month = **$6/month** 💰

## 🎁 Alternative FREE Options

### Option 1: Mindee (250 free/month)
```env
VITE_MINDEE_API_KEY=your_key
```
Change provider to `'mindee'` in `src/services/receiptAI.ts`

### Option 2: Azure (500 free/month)
```env
VITE_AZURE_FORM_RECOGNIZER_KEY=your_key
```
Change provider to `'azure'` in `src/services/receiptAI.ts`

## 📊 What Data Gets Extracted?

✅ Vendor/Customer Name
✅ Date
✅ Item Names
✅ Quantities
✅ Prices
✅ Tax
✅ Total Amount

## 🔧 Switch AI Provider

Edit `src/services/receiptAI.ts`:
```typescript
const AI_CONFIG = {
  provider: 'google',  // Change to: 'azure', 'mindee', 'openai'
  // ...
}
```

## 📸 Tips for Best Scans

✅ Good lighting
✅ Clear, focused image
✅ No shadows or glare
✅ Keep receipt flat

## 🆘 Troubleshooting

**Issue**: Scan button not working
**Fix**: Check browser console, verify API key in `.env`

**Issue**: Wrong data extracted
**Fix**: Retake photo with better lighting

**Issue**: "API Error"
**Fix**: Verify API key is valid, check internet connection

## 📚 Full Documentation

See `AI_RECEIPT_SCANNER_README.md` for complete details on:
- All AI provider options
- Detailed pricing
- Advanced configuration
- Integration guides
- Security info

## 🎉 You're Ready!

Start scanning receipts and save hours of manual data entry!

---

**Questions?** support@thisai.tech
