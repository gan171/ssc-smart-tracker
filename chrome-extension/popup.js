// Popup script for SSC Tracker extension

document.addEventListener('DOMContentLoaded', () => {
  const apiTokenInput = document.getElementById('apiToken');
  const apiUrlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const statusMessage = document.getElementById('statusMessage');
  const questionsAddedEl = document.getElementById('questionsAdded');
  const questionsTotalEl = document.getElementById('questionsTotal');

  // Load saved settings
  chrome.storage.sync.get(['apiToken', 'apiUrl', 'stats'], (result) => {
    if (result.apiToken) {
      apiTokenInput.value = result.apiToken;
    }
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
    if (result.stats) {
      updateStats(result.stats);
    }
  });

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiToken = apiTokenInput.value.trim();
    const apiUrl = apiUrlInput.value.trim() || 'http://127.0.0.1:8000';

    if (!apiToken) {
      showStatus('Please enter your API token', 'error');
      return;
    }

    // Save to storage
    chrome.storage.sync.set({ apiToken, apiUrl }, () => {
      showStatus('✅ Settings saved successfully!', 'success');

      // Test connection
      testConnection(apiUrl, apiToken);
    });
  });

  // Test backend connection
  async function testConnection(apiUrl, apiToken) {
    try {
      const response = await fetch(`${apiUrl}/mistakes/`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const stats = {
          total: data.length,
          addedToday: 0 // We'll track this separately
        };

        // Update stats
        chrome.storage.sync.set({ stats });
        updateStats(stats);

        showStatus(`✅ Connected! You have ${data.length} questions`, 'success');
      } else {
        showStatus('⚠️ Connection failed. Check your token.', 'error');
      }
    } catch (error) {
      showStatus('❌ Could not connect to backend', 'error');
      console.error(error);
    }
  }

  // Update stats display
  function updateStats(stats) {
    questionsTotalEl.textContent = stats.total || 0;
    questionsAddedEl.textContent = stats.addedToday || 0;
  }

  // Show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status status-${type}`;
    statusMessage.classList.remove('hidden');

    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 3000);
  }

  // Dashboard link
  document.getElementById('dashboardLink').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' }); // Your frontend URL
  });

  // GitHub link (optional)
  document.getElementById('githubLink').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/yourusername/ssc-tracker' });
  });
});