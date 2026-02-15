chrome.runtime.onInstalled.addListener(() => {
  console.log('SSC Smart Tracker extension installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'SSC_TRACKER_CAPTURE') {
    return false;
  }

  (async () => {
    try {
      const payload = {
        source: 'ssc-smart-tracker-extension',
        url: sender?.tab?.url || window?.location?.href || null,
        title: message.title || null,
        html: message.html || null,
        capturedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({
        sscLastCapture: payload
      });

      sendResponse({ ok: true });
    } catch (error) {
      console.error('Failed to store capture payload:', error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});
