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
    tabUrl: sender?.tab?.url || null,
    capturedAt: new Date().toISOString()
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
  const { sscBackendUrl, sscBackendToken } = await getStoredState();

  // Fallback to localhost if not configured, but require the token
  const backendUrl = sscBackendUrl || 'https://ssc-smart-tracker.onrender.com/import-question/';

  if (!sscBackendToken) {
    throw new Error("Authentication token is missing. Please log in via the extension options.");
  }

  const labels = ["A", "B", "C", "D", "E", "F"];
  const formattedOptions = (capture.options || []).map((optText, index) => ({
    label: labels[index] || String(index + 1),
    text: optText
  }));

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

  // REMOVED the console.log that printed the payload here for security

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sscBackendToken}`
      },
      body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Backend error ${response.status}`); // Don't log the raw HTML/text error to console in production
    }

    return { sentToBackend: true };
  } catch (error) {
    console.error("❌ Fetch failed."); // Generalized error message
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
