# SSC Smart Tracker Chrome Extension

## What this does
- Injects an **Add to Tracker** button inside the currently visible Testbook question header.
- Scrapes best-effort question data first, then opens a **Review & Edit modal** before final save.
- Saves reviewed payloads to local extension storage and optionally POSTs to your backend.

## New review workflow
1. Click **Add to Tracker**
2. Review/Edit modal opens with pre-filled fields.
3. Edit question text, strict 4 options, subject/sub-topic, correct answer, difficulty, exam tag.
4. (Optional) capture screenshot or upload one.
5. Click **Save**.

## Modal fields captured
- `questionText`
- `options` (A/B/C/D)
- `correctAnswer`, `correctAnswerIndex`
- `subject`, `subTopic`, `examTag`
- `difficulty`, `markedForReview`, `fixLater`
- `userTimeTaken`, `avgTimeTaken`, `userTimeTakenSec`, `avgTimeTakenSec`
- `screenshotDataUrl` (if captured/uploaded)

## Local install
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `chrome-extension/`
4. Refresh your Testbook tab.

## Backend sync configuration (optional)
Store these keys in `chrome.storage.local`:
- `sscBackendUrl`: full POST endpoint (example: `http://127.0.0.1:8000/extension/reviewed-question`)
- `sscBackendToken`: optional bearer token

If URL is not configured, save still works locally.

## Stored data keys
- `sscQuestionCaptures`: raw scraped captures
- `sscReviewedCaptures`: reviewed/edited captures
- `sscQuestionCaptureOrder`: LRU order (max 200)
- `sscLastCapture`: latest saved capture
