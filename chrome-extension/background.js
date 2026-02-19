chrome.runtime.onInstalled.addListener(() => {
  console.log('SSC Smart Tracker extension installed');
});

const MAX_CAPTURE_ENTRIES = 200;

async function saveQuestionCapture(message, sender) {
  const { sscQuestionCaptures = {}, sscQuestionCaptureOrder = [] } = await chrome.storage.local.get([
    'sscQuestionCaptures',
    'sscQuestionCaptureOrder'
  ]);

  const capture = {
    ...(message.payload || {}),
    tabUrl: sender?.tab?.url || null
  };

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
      console.error('Failed to store capture payload:', error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});