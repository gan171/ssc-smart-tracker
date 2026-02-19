chrome.runtime.onInstalled.addListener(() => {
  console.log('SSC Smart Tracker extension installed');
});

const MAX_CAPTURE_ENTRIES = 200;

async function getStoredState() {
  return chrome.storage.local.get([
    'sscQuestionCaptures',
    'sscReviewedCaptures',
    'sscQuestionCaptureOrder',
    'sscBackendUrl',
    'sscBackendToken'
  ]);
}

async function persistCapture(captureMapKey, message, sender) {
  const {
    sscQuestionCaptures = {},
    sscReviewedCaptures = {},
    sscQuestionCaptureOrder = []
  } = await getStoredState();

  const targetMap = captureMapKey === 'reviewed' ? sscReviewedCaptures : sscQuestionCaptures;

  const capture = {
    ...(message.payload || {}),
    rawPayload: message.rawPayload || null,
    tabUrl: sender?.tab?.url || null
  };

  targetMap[message.questionKey] = capture;

  const withoutCurrent = sscQuestionCaptureOrder.filter((key) => key !== message.questionKey);
  withoutCurrent.push(message.questionKey);

  while (withoutCurrent.length > MAX_CAPTURE_ENTRIES) {
    const evicted = withoutCurrent.shift();
    if (evicted) {
      delete sscQuestionCaptures[evicted];
      delete sscReviewedCaptures[evicted];
    }
  }

  await chrome.storage.local.set({
    sscQuestionCaptures,
    sscReviewedCaptures,
    sscQuestionCaptureOrder: withoutCurrent,
    sscLastCapture: capture
  });

  return capture;
}

async function sendToBackendIfConfigured(capture) {
  // 1. Hardcode your local backend URL for testing
  const backendUrl = 'http://localhost:8000/import-question/';

  // 2. IMPORTANT: Paste your active Supabase JWT token here
  const SUPABASE_JWT_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjVhNzczM2VhLTM3YWItNDAyNi04OTAwLWRjMjI3ZGYzNjEwYiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3JxbmJpb2ZqZ3RhaWRwZmlncHdpLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2ZTQ1YjI0Zi1lNGZlLTQxM2ItOGY0Yi1mZWVhYzI2NDgzYzEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcxNDkzNjc2LCJpYXQiOjE3NzE0OTAwNzYsImVtYWlsIjoiZ2FuZXNoLnNodWtsYTE3QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJnYW5lc2guc2h1a2xhMTdAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNmU0NWIyNGYtZTRmZS00MTNiLThmNGItZmVlYWMyNjQ4M2MxIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzE0NzkzMDZ9XSwic2Vzc2lvbl9pZCI6IjQ2MGVlYTlkLTA1YzMtNDVlOC04NWY0LTJjMTQzYzIyNDg2MCIsImlzX2Fub255bW91cyI6ZmFsc2V9.u0NR7vXGQXaBY14CtivL55yTFKl83QjN-mB7XNeofcuoFAvlzJi3EB_12obX11qNVNz2SDvCQRz2V19QOfxqFA";

  // 3. Reformat the payload to match what main.py expects
  const labels = ["A", "B", "C", "D", "E", "F"];
  const formattedOptions = (capture.options || []).map((optText, index) => ({
    label: labels[index] || String(index + 1),
    text: optText
  }));

  // Inject the Subject and Sub-topic as a header to help the AI categorize
  let contextHeader = "";
  if (capture.subject && capture.subject !== "Unknown") contextHeader += `[Section: ${capture.subject}] `;
  if (capture.subTopic) contextHeader += `[Sub-topic: ${capture.subTopic}]`;

  const finalQuestionText = contextHeader.trim()
      ? `${contextHeader.trim()}\n\n${capture.questionText || ''}`
      : (capture.questionText || '');

  const backendPayload = {
    question_text: finalQuestionText,
    options: formattedOptions,
    correct_option: capture.correctAnswer || "Unknown",
    source: "ssc-smart-tracker-extension",
    has_visual_elements: capture.screenshotProvided || false
  };

  console.log("🚀 SENDING THIS TO BACKEND:", JSON.stringify(backendPayload, null, 2));

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_JWT_TOKEN}`
      },
      body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Backend error ${response.status}: ${text.slice(0, 200)}`);
    }

    return { sentToBackend: true };
  } catch (error) {
    console.error("❌ Fetch failed:", error);
    throw error;
  }
}

async function captureVisibleScreenshot(sender) {
  const windowId = sender?.tab?.windowId;
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  return dataUrl;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SSC_TRACKER_CAPTURE_SCREENSHOT') {
    (async () => {
      try {
        const dataUrl = await captureVisibleScreenshot(sender);
        sendResponse({ ok: true, dataUrl });
      } catch (error) {
        console.error('Screenshot capture failed:', error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === 'SSC_TRACKER_CAPTURE_QUESTION') {
    (async () => {
      try {
        await persistCapture('raw', message, sender);
        sendResponse({ ok: true });
      } catch (error) {
        console.error('Failed to store raw capture payload:', error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  if (message?.type === 'SSC_TRACKER_SAVE_REVIEWED_QUESTION') {
    (async () => {
      try {
        const capture = await persistCapture('reviewed', message, sender);
        const backendResult = await sendToBackendIfConfigured(capture);
        sendResponse({ ok: true, ...backendResult });
      } catch (error) {
        console.error('Failed to save reviewed capture payload:', error);
        sendResponse({ ok: false, error: String(error) });
      }
    })();
    return true;
  }

  return false;
});
