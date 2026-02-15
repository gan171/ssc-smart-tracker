# 📌 SSC Smart Tracker - Testbook Chrome Extension

**One-click import questions from Testbook directly to your SSC Tracker!**

---

## 🎯 What It Does

- Automatically detects questions on Testbook analysis pages
- Injects "📌 Add to SSC Tracker" button next to each question
- Extracts question text, options, correct answer, and explanations
- **Captures screenshots of visual questions** (diagrams, graphs, images)
- Sends directly to your backend with one click
- Shows success notifications

---

## 📦 Installation

### **Step 1: Prepare Backend**

Add the new endpoint to `backend/main.py`:

```python
# Copy contents from backend_import_endpoint.py
# Add the ImportQuestionPayload model and /import-question/ endpoint
```

Restart backend:
```bash
cd backend
python run.py
```

### **Step 2: Load Extension in Chrome**

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `chrome-extension` folder
5. Extension should now appear in your extensions list

### **Step 3: Get Your API Token**

You need your authentication token from Supabase.

**Option A: Get from Browser DevTools**
1. Open your SSC Tracker app (localhost:5173)
2. Open DevTools (F12)
3. Go to Application → Local Storage → http://localhost:5173
4. Find `sb-<project-id>-auth-token`
5. Copy the `access_token` value

**Option B: Get from Network Request**
1. Open DevTools → Network tab
2. Upload a question
3. Find the request to `/upload-screenshot/`
4. Check Request Headers → Authorization
5. Copy the token after "Bearer "

### **Step 4: Configure Extension**

1. Click the extension icon in Chrome toolbar
2. Paste your API token
3. Verify Backend URL is `http://127.0.0.1:8000`
4. Click **"Save Settings"**
5. Should show "✅ Connected!"

---

## 🚀 Usage

### **Taking a Test on Testbook:**

1. Go to Testbook.com and take a mock test
2. After finishing, go to the **analysis/results page**
3. You'll see **"📌 Add to SSC Tracker"** buttons appear next to questions
4. Click the button on any question you got wrong
5. Button will show "⏳ Adding..." then "✅ Added!"
6. Question is now in your tracker with full analysis

### **What Gets Extracted:**

- ✅ Question text (perfect OCR-free extraction)
- ✅ All options (A, B, C, D)
- ✅ Correct answer
- ✅ Your answer (if visible)
- ✅ Explanation (if available)
- ✅ **Screenshot of entire question** (if it has images/diagrams)

---

## 🔧 How It Works

### **Technical Flow:**

```
User on Testbook analysis page
    ↓
Extension detects question containers
    ↓
Injects "Add to Tracker" button
    ↓
User clicks button
    ↓
Extension extracts DOM data:
├─ Question text (innerText)
├─ Options (from option elements)
├─ Correct answer (from marked element)
└─ Screenshot (if has images) [html2canvas]
    ↓
Sends to backend:
├─ If has image → /upload-screenshot/ (FormData)
└─ If text only → /import-question/ (JSON)
    ↓
Backend saves to Supabase
    ↓
Success notification shown
    ↓
Question appears in your tracker!
```

### **DOM Scraping Logic:**

The extension tries multiple selectors to find questions (since Testbook might change their HTML):

```javascript
SELECTORS = {
  questionContainer: '.question-container, .question-wrapper, [class*="question"]',
  questionText: '.question-text, .question-content',
  options: '.option, .option-item',
  correctAnswer: '.correct-answer, [class*="correct"]',
  questionImage: '.question-image, img[alt*="question"]'
}
```

If these don't work (Testbook updated their design), update the selectors in `content.js`.

---

## 🐛 Troubleshooting

### **"No API token found" error:**
- Open extension popup
- Make sure token is saved
- Token format: Long string like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **Button doesn't appear:**
- Check if you're on Testbook analysis page (not during test)
- Testbook might have changed HTML - update selectors
- Open DevTools console and check for errors

### **"Failed to add question" error:**
- Backend not running? Check `http://127.0.0.1:8000`
- Token expired? Get new token
- CORS issue? Make sure backend allows `*://testbook.com/*`

### **Screenshots not working:**
- html2canvas loads from CDN automatically
- Check internet connection
- Check browser console for errors

### **Questions appearing twice:**
- Extension has duplicate detection
- Checks question text hash before adding
- If still duplicating, backend also checks

---

## 🎨 Customization

### **Change Button Style:**
Edit `styles.css`:
```css
.ssc-tracker-button {
  background: your-gradient;
  color: your-color;
}
```

### **Change API URL:**
If backend runs on different port/host:
1. Open extension popup
2. Update "Backend URL"
3. Save settings

### **Add More Platforms:**
To support Oliveboard, Adda247, etc.:

1. Update `manifest.json`:
```json
"matches": [
  "*://*.testbook.com/*",
  "*://*.oliveboard.in/*",
  "*://*.adda247.com/*"
]
```

2. Add platform-specific selectors in `content.js`

---

## 📊 Features

### ✅ **Current:**
- One-click question import
- Text extraction (100% accurate)
- Screenshot capture for visual questions
- Success notifications
- Duplicate detection
- Stats tracking (popup shows count)

### 🔜 **Coming Soon (if you like it):**
- Auto-detect subject/topic from question
- Batch import (select multiple, import all)
- Sync across devices
- Keyboard shortcut (Ctrl+Shift+A)
- Firefox version

---

## 🔒 Privacy & Security

**What this extension does:**
- ✅ Reads question data from pages you're viewing
- ✅ Sends data to YOUR backend only
- ✅ Stores API token locally in Chrome

**What it does NOT do:**
- ❌ Doesn't access your Testbook account
- ❌ Doesn't store your login credentials
- ❌ Doesn't send data to any third party
- ❌ Doesn't track your browsing

**Your data:**
- Stays in YOUR Supabase database
- Accessed only by YOUR backend
- Token stored in Chrome's secure storage

---

## 🧪 Testing Checklist

After installation, test:

1. ✅ Extension loads on Testbook
2. ✅ Button appears on analysis page
3. ✅ Click button → Success notification
4. ✅ Question appears in tracker
5. ✅ Screenshot captured (for visual questions)
6. ✅ Options extracted correctly
7. ✅ Correct answer marked
8. ✅ No duplicates created
9. ✅ Stats update in popup
10. ✅ Works in incognito (after enabling)

---

## 📝 Notes for Your Week of Testing

**Things to test:**

1. **Different question types:**
   - Text-only questions
   - Questions with images
   - Questions with diagrams/graphs
   - Questions with tables

2. **Different pages:**
   - Mock test analysis
   - Practice test analysis
   - Previous year papers
   - Topic tests

3. **Edge cases:**
   - Very long questions
   - Questions with special characters
   - Questions with equations (math symbols)
   - Multiple images in one question

4. **Performance:**
   - Does page slow down?
   - Memory usage okay?
   - Button response time
   - Upload speed

5. **Reliability:**
   - Does button always appear?
   - Does extraction always work?
   - Any duplicates?
   - Any errors?

**Keep track of:**
- How many questions you import
- How much time you save vs screenshots
- Any bugs/issues
- Feature ideas

---

## 🔄 Updating Selectors (When Testbook Changes)

If buttons stop appearing:

1. Open Testbook analysis page
2. Right-click on a question → Inspect Element
3. Note the class names
4. Update `content.js`:
```javascript
SELECTORS: {
  questionContainer: '.new-class-name',
  questionText: '.another-new-class',
  // ... etc
}
```
5. Reload extension (chrome://extensions/ → Reload button)

---

## 📦 Files Structure

```
chrome-extension/
├── manifest.json          # Extension config
├── content.js            # Main logic (DOM scraping, button injection)
├── background.js         # Service worker (handles uploads)
├── popup.html            # Settings UI
├── popup.js              # Settings logic
├── styles.css            # Button & notification styles
└── icons/                # Extension icons (create 16x16, 48x48, 128x128 PNGs)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🎯 Success Criteria (After 1 Week)

**Keep if:**
- ✅ Saves you 10+ minutes per test
- ✅ Works reliably (>90% success rate)
- ✅ No major bugs
- ✅ Easier than screenshots

**Iterate if:**
- ⚠️ Selectors need frequent updates
- ⚠️ Some question types fail
- ⚠️ UI needs improvement

**Scrap if:**
- ❌ Too unreliable
- ❌ Maintenance too high
- ❌ Not actually faster

---

## 💡 Pro Tips

1. **Keyboard shortcut:** After clicking one button, press Tab to move to next question's button, then Enter to click

2. **Batch mode:** Open DevTools console and run:
```javascript
document.querySelectorAll('.ssc-tracker-button').forEach(btn => btn.click())
```
(Clicks all buttons at once!)

3. **Check what was uploaded:** Open your tracker immediately to verify

4. **Token expires:** Get new token every 24 hours (or extend JWT expiry in backend)

---

## 🚀 Next Steps After Testing

If you like it:
1. Polish UI (better animations, colors)
2. Add more platforms (Oliveboard, Adda247)
3. Add settings (auto-add wrong answers only)
4. Build Firefox version
5. Consider sharing with friends

If you love it:
1. Submit to Chrome Web Store
2. Make it a premium feature
3. Build landing page
4. Market it!

---

**Ready to test! Open Testbook and start importing questions!** 📌✨

Questions? Issues? Check DevTools console for debug logs.