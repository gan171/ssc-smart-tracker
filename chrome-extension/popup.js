(async function initPopup() {
  const out = document.getElementById('last-capture');
  const { sscLastCapture } = await chrome.storage.local.get('sscLastCapture');

  if (!sscLastCapture) {
    out.textContent = 'No capture yet.';
    return;
  }

  out.textContent = `Last capture: ${sscLastCapture.title || 'Untitled'} at ${new Date(
    sscLastCapture.capturedAt
  ).toLocaleString()}`;
})();
