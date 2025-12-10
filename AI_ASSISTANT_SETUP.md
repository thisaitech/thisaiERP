# AI Voice Assistant Setup Guide

## 🎉 Congratulations!

Your AI Voice Assistant has been successfully integrated! You now have a powerful voice-controlled assistant that works in **Tamil, English, Hindi, and Telugu**.

---

## 📍 Where to Add Your Gemini API Key

1. Open the file: **`.env`** (in your project root folder)

2. Find this line:
   ```
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Replace `your_gemini_api_key_here` with your actual Gemini API key

4. Save the file and restart your dev server (if running)

---

## 🔑 How to Get Your FREE Gemini API Key

### Step 1: Visit Google AI Studio
Go to: **https://aistudio.google.com/app/apikey**

### Step 2: Sign In
Sign in with your Google account

### Step 3: Create API Key
Click the **"Create API Key"** button

### Step 4: Copy Your Key
Copy the API key that appears (it looks like: `AIzaSy...`)

### Step 5: Paste into .env
Paste it into your `.env` file:
```
VITE_GEMINI_API_KEY=AIzaSyYourActualKeyHere
```

### Step 6: Restart Dev Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🚀 How to Use the AI Assistant

### 1. **Find the AI Button**
Look for the **floating sparkle icon** in the **bottom-right corner** of your screen on ANY page!

### 2. **Click to Open**
Click the button to open the AI assistant panel

### 3. **Choose Your Language**
Click the **translate icon** (🌐) in the header to select:
- **தமிழ்** (Tamil)
- **English**
- **हिंदी** (Hindi)
- **తెలుగు** (Telugu)

### 4. **Press "Speak" Button**
Click the **microphone button** at the bottom

### 5. **Start Speaking!**
Say your command, for example:

**In English:**
- "Find customer Ramesh Kumar"
- "Add 5 kg rice to the invoice"
- "Apply 10 percent discount"
- "Generate the invoice"

**In Tamil:**
- "ராமேஷ் என்ற வாடிக்கையாளரைக் கண்டுபிடி"
- "5 கிலோ அரிசி சேர்"
- "10 சதவீதம் தள்ளுபடி"

**In Hindi:**
- "ग्राहक राम को खोजें"
- "5 किलो चावल जोड़ें"
- "10 प्रतिशत छूट लगाएं"

---

## 🎤 Voice Commands You Can Use

### Customer Operations
- "Find customer [name]"
- "Search for [phone number]"
- "Show customer [name]"

### Item Operations
- "Add [quantity] [unit] of [item name]"
  - Example: "Add 5 kg rice"
  - Example: "Add 10 pieces of notebooks"
- "Update [item] quantity to [number]"
- "Remove [item name]"

### Discounts & Payments
- "Apply [number] percent discount"
- "Set payment mode to [cash/upi/bank]"
- "Show invoice total"

### Invoice Actions
- "Generate invoice"
- "Save invoice"
- "Clear invoice"
- "Start fresh"

---

## 🎯 Features

### ✅ Works Everywhere
The AI assistant appears on ALL pages - Dashboard, Sales, Inventory, etc.

### ✅ Multi-Language Support
- Tamil (தமிழ்)
- English
- Hindi (हिंदी)
- Telugu (తెలుగు)

### ✅ Voice Input & Output
- Speaks to you (can be toggled on/off)
- Understands your voice commands
- Real-time transcription display

### ✅ Smart Actions
- Searches customers automatically
- Finds items from inventory
- Applies discounts
- Updates quantities
- Generates invoices

### ✅ Chat History
- See all your conversations
- Clear chat anytime
- Expand/collapse panel

---

## 🛠️ Technical Details

### Files Created:
1. **`.env`** - Updated with Gemini API key config
2. **`src/services/geminiService.ts`** - Gemini AI integration
3. **`src/hooks/useVoiceRecognition.ts`** - Web Speech API hook
4. **`src/services/aiActionHandler.ts`** - Action execution logic
5. **`src/components/AIAssistant.tsx`** - Main UI component

### Technologies Used:
- **Gemini AI 1.5 Flash** - Natural language understanding
- **Web Speech API** - Voice recognition & synthesis
- **Framer Motion** - Smooth animations
- **Phosphor Icons** - Beautiful icons

### Cost:
- **FREE** for up to 60 requests/minute
- **FREE** for up to 1500 requests/day
- Web Speech API is always free (built into browser)

---

## 🎨 Customization

### Change Auto-Speak Behavior
Click the **speaker icon** in the header to toggle auto-speak on/off

### Expand/Collapse Panel
Click the **chat icon** to resize the panel

### Clear Chat History
Click the **X button** at the bottom to clear all messages

---

## 🐛 Troubleshooting

### "Please configure Gemini API key"
- Make sure you added your API key to `.env` file
- Restart your dev server after adding the key

### "Microphone permission denied"
- Allow microphone access when browser prompts
- Check browser settings if already denied

### Voice Not Working
- Make sure you're using Chrome, Edge, or Safari
- Firefox has limited Web Speech API support

### Tamil/Hindi Voice Not Clear
- Browser will use available system voices
- Install additional language packs in your OS for better quality

---

## 📱 Browser Support

### ✅ Fully Supported:
- **Chrome** (Desktop & Mobile)
- **Edge** (Desktop)
- **Safari** (Desktop & iOS)

### ⚠️ Limited Support:
- **Firefox** (Speech recognition limited)

---

## 🎓 Example Workflows

### Creating a Sale Invoice (English):
1. Click AI button
2. Say: "Find customer Ramesh Kumar"
3. Say: "Add 10 kg rice"
4. Say: "Add 5 pieces notebooks"
5. Say: "Apply 5 percent discount"
6. Say: "Set payment to cash"
7. Say: "Generate invoice"

### Creating a Sale Invoice (Tamil):
1. AI பொத்தானை கிளிக் செய்யவும்
2. சொல்லுங்கள்: "ராமேஷ் குமார் வாடிக்கையாளரைக் கண்டுபிடி"
3. சொல்லுங்கள்: "10 கிலோ அரிசி சேர்"
4. சொல்லுங்கள்: "5 துண்டு நோட்புக் சேர்"
5. சொல்லுங்கள்: "5 சதவீதம் தள்ளுபடி"
6. சொல்லுங்கள்: "பணம் மூலம் பணம் செலுத்து"
7. சொல்லுங்கள்: "இன்வாய்ஸ் உருவாக்கு"

---

## 🎉 You're All Set!

Your AI Voice Assistant is ready to use! Just add your Gemini API key and start speaking!

For questions or issues, the AI assistant button will show a red dot if the API key is not configured.

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors (F12 → Console)
2. Verify your API key is correct in `.env`
3. Make sure you restarted the dev server after adding the key
4. Check that microphone permissions are allowed

Happy voice commanding! 🎤✨
