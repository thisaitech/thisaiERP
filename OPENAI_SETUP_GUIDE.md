# 🤖 OpenAI API Setup - Better Invoice Scanning!

## Why OpenAI Instead of Google Vision?

**Google Vision** extracts text correctly, but our **text parsing logic** struggles with complex invoice layouts.

**OpenAI GPT-4o** actually **understands** the invoice structure using AI, giving you:
- ✅ **Much more accurate** data extraction
- ✅ **Better handling** of complex layouts
- ✅ **Smarter field recognition** (auto-detects vendor, buyer, items, taxes)
- ✅ **Works with ANY invoice format**

**Cost**: ~$0.003-0.01 per invoice (very affordable!)

---

## 🔑 Quick Setup (3 minutes)

### Step 1: Get OpenAI API Key

1. **Go to**: https://platform.openai.com/api-keys
2. **Sign up/Login** (if not already)
3. **Click** "+ Create new secret key"
4. **Name it**: "ThisAI CRM Scanner"
5. **Copy the key** (starts with `sk-proj-...`)

### Step 2: Add Credit (Required)

OpenAI requires a paid account:
1. Go to: https://platform.openai.com/settings/organization/billing/overview
2. Click "Add payment method"
3. Add credit: **$5 minimum** (will last for 500-1,500 invoice scans!)

### Step 3: Add Key to .env File

1. Open `z:\Projects\Thisai_crm\.env`
2. Replace the OpenAI key line:
   ```env
   VITE_OPENAI_API_KEY=sk-proj-your_actual_key_here
   ```
3. **Save the file**

### Step 4: Restart App

```bash
Ctrl+C
npm run dev
```

---

## ✅ Test It!

1. Go to **Purchases** or **Sales**
2. Click **AI Scan**
3. Upload your invoice
4. **See accurate data extracted!** 🎉

---

## 💰 Cost Breakdown

- **Per invoice**: $0.003 - $0.01 (~₹0.25 - ₹0.80)
- **100 invoices**: ~$0.50 (~₹40)
- **1,000 invoices**: ~$5 (~₹400)

**Much cheaper than manual entry!**

---

## 🔄 Switch Back to Google Vision (Optional)

If you want to use Google Vision instead (cheaper but less accurate):

1. Open `src/services/enhancedReceiptAI.ts`
2. Find line ~10:
   ```typescript
   provider: 'openai' as AIProvider
   ```
3. Change to:
   ```typescript
   provider: 'google' as AIProvider
   ```
4. Restart the app

---

## ❓ Troubleshooting

**Error: "Invalid API key"**
- Make sure you copied the entire key
- Key should start with `sk-proj-` or `sk-`
- No extra spaces

**Error: "Insufficient quota"**
- Add payment method in OpenAI dashboard
- Add at least $5 credit

**Still not working?**
- Check browser console (F12) for error details
- Verify API key is correct in `.env`
- Make sure you restarted the app

---

## 🎯 Why This Is Better

**Google Vision** is like a scanner - it just reads text.

**OpenAI GPT-4o** is like a smart assistant - it **understands** what each field means and extracts it correctly even from messy/complex invoices!

Your invoices will now be scanned **perfectly**! 🚀
