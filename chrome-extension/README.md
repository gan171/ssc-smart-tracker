# SSC Smart Tracker Chrome Extension

## What this does
- Injects an **Add to Tracker** button directly inside the currently visible Testbook question header on solution/review pages.
- Saves each question capture separately in `chrome.storage.local.sscQuestionCaptures` (keyed by URL + question number + text fingerprint).

## Local install
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `chrome-extension/` folder
4. Open your Testbook solution page and refresh once.

## Debugging if button is missing
- Confirm URL includes Testbook + solution/review style routes (`solutions`, `analysis`, `result`, `attemptNo`, etc.)
- In page DevTools console run:
  ```js
  document.querySelector('.ssc-question-track-btn')
  ```
- If null, inspect if question markup changed and share the DOM around `Question No.` row.

## Stored data keys
- `sscQuestionCaptures`: dictionary of captured questions
- `sscQuestionCaptureOrder`: internal LRU order for storage cleanup (max 200)
- `sscLastCapture`: latest captured question