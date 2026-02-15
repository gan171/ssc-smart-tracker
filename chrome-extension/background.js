// Background service worker for SSC Tracker extension

console.log('🎯 SSC Tracker: Background service worker loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadQuestion') {
    handleQuestionUpload(request.data, sender.tab.id);
  }
});

// Handle question upload
async function handleQuestionUpload(questionData, tabId) {
  try {
    // Get API token from storage
    const { apiToken, apiUrl } = await chrome.storage.sync.get(['apiToken', 'apiUrl']);

    if (!apiToken) {
      notifyTab(tabId, '❌ No API token found. Please configure extension.', 'error');
      return;
    }

    const endpoint = `${apiUrl || 'http://127.0.0.1:8000'}/import-question/`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(questionData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    // Update stats
    updateStats();

    notifyTab(tabId, '✅ Question added to your tracker!', 'success');
  } catch (error) {
    console.error('Upload error:', error);
    notifyTab(tabId, '❌ Failed to upload: ' + error.message, 'error');
  }
}

// Send notification to tab
function notifyTab(tabId, message, type) {
  chrome.tabs.sendMessage(tabId, {
    action: 'showNotification',
    message,
    type
  });
}

// Update stats in storage
async function updateStats() {
  const { stats } = await chrome.storage.sync.get(['stats']);
  const currentStats = stats || { total: 0, addedToday: 0 };

  currentStats.total++;
  currentStats.addedToday++;

  chrome.storage.sync.set({ stats: currentStats });
}

// Reset daily stats at midnight
function scheduleDailyReset() {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // Tomorrow
    0, 0, 0 // Midnight
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    chrome.storage.sync.get(['stats'], (result) => {
      if (result.stats) {
        result.stats.addedToday = 0;
        chrome.storage.sync.set({ stats: result.stats });
      }
    });

    // Schedule next reset
    scheduleDailyReset();
  }, msToMidnight);
}

// Initialize
scheduleDailyReset();