chrome.runtime.onInstalled.addListener(() => {
  console.log('SSC Smart Tracker extension installed');
});

const MAX_CAPTURE_ENTRIES = 200;

// IMPORTANT: Paste your active Supabase JWT token here for testing
const SUPABASE_JWT_TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjVhNzczM2VhLTM3YWItNDAyNi04OTAwLWRjMjI3ZGYzNjEwYiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3JxbmJpb2ZqZ3RhaWRwZmlncHdpLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI2ZTQ1YjI0Zi1lNGZlLTQxM2ItOGY0Yi1mZWVhYzI2NDgzYzEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzcxNDkwMTQzLCJpYXQiOjE3NzE0ODY1NDMsImVtYWlsIjoiZ2FuZXNoLnNodWtsYTE3QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJnYW5lc2guc2h1a2xhMTdAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiNmU0NWIyNGYtZTRmZS00MTNiLThmNGItZmVlYWMyNjQ4M2MxIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NzE0NzkzMDZ9XSwic2Vzc2lvbl9pZCI6IjQ2MGVlYTlkLTA1YzMtNDVlOC04NWY0LTJjMTQzYzIyNDg2MCIsImlzX2Fub255bW91cyI6ZmFsc2V9.hRMY4xM9EljoKkHnCXciYNNTA8sn517p7cGKVzEoxe1jxUc_a07OCwUoIO9W3ygeVPUjzRIFwV947gEQ-Q_zIg";

async function saveQuestionCapture(message, sender) {
  const { sscQuestionCaptures = {}, sscQuestionCaptureOrder = [] } = await chrome.storage.local.get([
    'sscQuestionCaptures',
    'sscQuestionCaptureOrder'
  ]);

  const capture = {
    ...(message.payload || {}),
    tabUrl: sender?.tab?.url || null
  };

  // 1. Save to local storage (Keep as backup)
  sscQuestionCaptures[message.questionKey] = capture;
  const withoutCurrent = sscQuestionCaptureOrder.filter((key) => key !== message.questionKey);
  withoutCurrent.push(message.questionKey);

  while (withoutCurrent.length > MAX_CAPTURE_ENTRIES) {
    const evicted = withoutCurrent.shift();
    if (evicted) delete sscQuestionCaptures[evicted];
  }

  await chrome.storage.local.set({
    sscQuestionCaptures,
    sscQuestionCaptureOrder: withoutCurrent,
    sscLastCapture: capture
  });

  // 2. SEND TO BACKEND
  try {
    const labels = ["A", "B", "C", "D", "E", "F"];
    const formattedOptions = (capture.options || []).map((optText, index) => ({
      label: labels[index] || String(index + 1),
      text: optText
    }));

    // CHEAT CODE: Inject the scraped subject directly into the question text
    // so the backend AI knows exactly how to categorize it.
    const finalQuestionText = (capture.subject && capture.subject !== "Unknown")
        ? `[Section: ${capture.subject}]\n\n${capture.questionText}`
        : capture.questionText;

    const backendPayload = {
      question_text: finalQuestionText,
      options: formattedOptions,
      correct_option: "Unknown",
      source: "ssc-smart-tracker-extension",
      has_visual_elements: false
    };

    console.log("🚀 SENDING THIS TO BACKEND:", JSON.stringify(backendPayload, null, 2));

    const response = await fetch('http://localhost:8000/import-question/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_JWT_TOKEN}`
      },
      body: JSON.stringify(backendPayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Backend Error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    console.log("✅ Successfully saved to database!", responseData);

  } catch (error) {
    console.error('❌ Failed to send to backend:', error);
    throw error;
  }
  }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'SSC_TRACKER_CAPTURE_QUESTION') {
    return false;
  }

  (async () => {
    try {
      await saveQuestionCapture(message, sender);
      sendResponse({ ok: true });
    } catch (error) {
      console.error('Failed to process payload:', error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});