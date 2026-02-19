document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('backendUrl');
  const tokenInput = document.getElementById('jwtToken');
  const saveBtn = document.getElementById('saveBtn');
  const statusTxt = document.getElementById('status');

  const totalAddedEl = document.getElementById('totalAdded');
  const lastAddedEl = document.getElementById('lastAdded');

  // 1. Fetch settings AND stats from storage
  chrome.storage.local.get([
    'sscBackendUrl',
    'sscBackendToken',
    'sscQuestionCaptureOrder',
    'sscLastCapture'
  ], (result) => {

    // Populate form fields
    if (result.sscBackendUrl) urlInput.value = result.sscBackendUrl;
    if (result.sscBackendToken) tokenInput.value = result.sscBackendToken;

    // Populate Statistics
    const totalCount = result.sscQuestionCaptureOrder ? result.sscQuestionCaptureOrder.length : 0;
    totalAddedEl.textContent = totalCount;

    if (result.sscLastCapture && result.sscLastCapture.capturedAt) {
      // Format the date to look nice (e.g., "12/15/2023, 10:30 AM")
      const date = new Date(result.sscLastCapture.capturedAt);
      lastAddedEl.textContent = date.toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
      });
    }
  });

  // 2. Save settings when button is clicked
  saveBtn.addEventListener('click', () => {
    const backendUrl = urlInput.value.trim() || 'http://127.0.0.1:8000';
    const backendToken = tokenInput.value.trim();

    chrome.storage.local.set({
      sscBackendUrl: backendUrl,
      sscBackendToken: backendToken
    }, () => {
      statusTxt.style.display = 'block';
      setTimeout(() => {
        statusTxt.style.display = 'none';
      }, 2000);
    });
  });
});