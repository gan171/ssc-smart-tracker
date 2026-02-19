(async function initPopup() {
  const out = document.getElementById('last-capture');
  const { sscLastCapture, sscQuestionCaptures = {} } = await chrome.storage.local.get([
    'sscLastCapture',
    'sscQuestionCaptures'
  ]);

  const count = Object.keys(sscQuestionCaptures).length;

  if (!sscLastCapture) {
    out.textContent = `No capture yet. Saved questions: ${count}`;
    return;
  }

  out.textContent = `Saved questions: ${count}. Last capture: Q${sscLastCapture.questionNumber || '?'} at ${new Date(
    sscLastCapture.capturedAt
  ).toLocaleString()}`;
})();