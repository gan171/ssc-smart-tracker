const BUTTON_ID = 'ssc-active-question-track-btn';
const BUTTON_CLASS = 'ssc-tracker-button';
const QUESTION_BUTTON_CLASS = 'ssc-question-track-btn';

const QUESTION_ROOT_SELECTORS = [
  '.question-wrapper',
  '.question-panel',
  '.questionView',
  '.solutions-question',
  '.question-and-options',
  '.question-area',
  '.test-body'
];

const QUESTION_HEADER_SELECTORS = [
  '.question-status-and-marks',
  '.question-header',
  '.question-title',
  '.question-number',
  '[class*="question-no"]'
];

const QUESTION_TEXT_SELECTORS = [
  '.question-and-options--question-text',
  '.question-text',
  '.question-statement',
  '.question-body',
  'p'
];

let activeQuestionKey = null;

function showNotification(text, type = 'info') {
  const existing = document.querySelector('.ssc-notification');
  if (existing) existing.remove();

  const node = document.createElement('div');
  node.className = `ssc-notification ssc-notification-${type}`;
  node.textContent = text;
  document.body.appendChild(node);

  setTimeout(() => {
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 350);
  }, 2200);
}

function isTestbookSolutionPage() {
  const url = window.location.href;
  return /testbook\.com/i.test(url) && /(solution|solutions|analysis|result|review|attemptNo|tests\/)/i.test(url);
}

function textOf(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findQuestionNo(text) {
  const match = text.match(/Question\s*No\.?\s*(\d+)/i) || text.match(/Q\.?\s*(\d+)/i);
  return match ? match[1] : null;
}

function getQuestionRootCandidates() {
  for (const selector of QUESTION_ROOT_SELECTORS) {
    const list = Array.from(document.querySelectorAll(selector));
    if (list.length > 0) return list;
  }

  return Array.from(document.querySelectorAll('div, section')).filter((el) => /Question\s*No\.?\s*\d+/i.test(textOf(el)));
}

function resolveCurrentQuestionRoot() {
  const candidates = getQuestionRootCandidates();
  if (!candidates.length) return null;

  const withQuestionNo = candidates.find((el) => findQuestionNo(textOf(el)));
  return withQuestionNo || candidates[0];
}

function findQuestionHeader(root) {
  if (!root) return null;

  for (const selector of QUESTION_HEADER_SELECTORS) {
    const found = root.querySelector(selector);
    if (found) return found;
  }

  return root.querySelector('div, header') || root;
}

function extractQuestionText(root) {
  if (!root) return '';

  for (const selector of QUESTION_TEXT_SELECTORS) {
    const found = root.querySelector(selector);
    const value = textOf(found);
    if (value.length > 10) return value;
  }

  return textOf(root).slice(0, 1000);
}

function buildQuestionPayload(root) {
  const rootText = textOf(root);
  const questionNumber = findQuestionNo(rootText);
  const questionText = extractQuestionText(root);

  return {
    source: 'ssc-smart-tracker-extension',
    url: window.location.href,
    title: document.title,
    questionNumber,
    questionText,
    questionSnippet: rootText.slice(0, 2000),
    capturedAt: new Date().toISOString()
  };
}

function getQuestionKey(payload) {
  const textFingerprint = (payload.questionText || '').slice(0, 80);
  return `${payload.url}::${payload.questionNumber || 'unknown'}::${textFingerprint}`;
}

function setButtonLabel(button, text) {
  const label = button.querySelector('.ssc-button-text');
  if (label) label.textContent = text;
}

function onQuestionButtonClick(button) {
  const root = resolveCurrentQuestionRoot();
  if (!root) {
    showNotification('Question not detected on this screen.', 'error');
    return;
  }

  const payload = buildQuestionPayload(root);
  const questionKey = getQuestionKey(payload);

  button.disabled = true;
  setButtonLabel(button, 'Saving...');

  chrome.runtime.sendMessage(
    {
      type: 'SSC_TRACKER_CAPTURE_QUESTION',
      questionKey,
      payload
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        button.disabled = false;
        setButtonLabel(button, 'Add to Tracker');
        showNotification('Could not save this question. Try again.', 'error');
        return;
      }

      button.classList.add('ssc-button-success');
      setButtonLabel(button, 'Added');
      showNotification(`Question ${payload.questionNumber || ''} saved.`, 'success');
    }
  );
}

function removeDuplicateButtons() {
  const buttons = Array.from(document.querySelectorAll(`.${QUESTION_BUTTON_CLASS}`));
  if (buttons.length <= 1) return;

  buttons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });
}

function ensureSingleQuestionButton() {
  const root = resolveCurrentQuestionRoot();
  if (!root) return;

  const header = findQuestionHeader(root);
  if (!header) return;

  const payload = buildQuestionPayload(root);
  const questionKey = getQuestionKey(payload);

  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = `${BUTTON_CLASS} ${QUESTION_BUTTON_CLASS}`;
    button.innerHTML = '<span class="ssc-button-icon">📌</span><span class="ssc-button-text">Add to Tracker</span>';
    button.addEventListener('click', () => onQuestionButtonClick(button));
  }

  if (!header.contains(button)) {
    header.appendChild(button);
  }

  if (activeQuestionKey !== questionKey) {
    activeQuestionKey = questionKey;
    button.disabled = false;
    button.classList.remove('ssc-button-success');
    setButtonLabel(button, 'Add to Tracker');
  }

  removeDuplicateButtons();
}

function bootstrap() {
  if (!isTestbookSolutionPage()) return;

  ensureSingleQuestionButton();

  let rafId = null;
  const observer = new MutationObserver(() => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      ensureSingleQuestionButton();
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}