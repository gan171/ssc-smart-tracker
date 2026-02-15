# SSC Smart Tracker Chrome Extension

## What this does
- Injects an **Add to Tracker** button on Testbook pages that look like test/analysis/result/review/solutions pages.
- Captures page HTML/title and stores it in `chrome.storage.local` as `sscLastCapture`.

## Local install
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `chrome-extension/` folder

## Debugging if button is missing
- Make sure the current URL is under `https://*.testbook.com/*` and includes one of these keywords:
  `test`, `analysis`, `result`, `review`, `solutions`
- Open DevTools on the page and run:
  ```js
  document.getElementById('ssc-smart-tracker-add-btn')
  ```
- Check content-script logs in page DevTools.
- Check service worker logs in `chrome://extensions` → extension details → **service worker**.
