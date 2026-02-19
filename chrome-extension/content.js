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

const SOLUTION_BLOCKLIST_SELECTORS = [
  '.question-solution',
  '.solution',
  '[class*="solution"]',
  '.question-paper-solution',
  '.question-solution-body--content'
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

// Preserves Line Breaks (\n) so options don't squish together
function cleanText(text) {
  return (text || '')
    .replace(/[ \t\r\f\v]+/g, ' ') // Collapse horizontal spaces
    .replace(/ \n /g, '\n')        // Clean spaces around newlines
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/\n+/g, '\n')         // Collapse multiple newlines into one
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove invisible characters
    .trim();
}

function textOf(el) {
  return cleanText(el?.innerText || el?.textContent || '');
}

function findQuestionNo(text) {
  const match = text.match(/Question\s*No\.?\s*(\d+)/i) || text.match(/Q\.?\s*(\d+)/i);
  return match ? match[1] : null;
}

function isLikelyQuestionRoot(el) {
  const text = textOf(el);
  if (!text || text.length < 40 || text.length > 6500) return false;
  return /Question\s*No\.?\s*\d+/i.test(text) || /\bQuestion\s*:/i.test(text);
}

function getQuestionRootCandidates() {
  for (const selector of QUESTION_ROOT_SELECTORS) {
    const list = Array.from(document.querySelectorAll(selector)).filter(isLikelyQuestionRoot);
    if (list.length > 0) return list;
  }
  return Array.from(document.querySelectorAll('div, section, article')).filter(isLikelyQuestionRoot);
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

function isInsideSolution(el) {
  return SOLUTION_BLOCKLIST_SELECTORS.some((selector) => el.closest(selector));
}

function extractQuestionText(root) {
  if (!root) return '';

  const exactSelectors = [
    '.question-and-options--question-text',
    '.question-text',
    '.question-statement',
    '.question-body',
    '[data-testid="question-text"]'
  ];

  for (const selector of exactSelectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (!isInsideSolution(node)) {
        const text = (node.innerText || '').trim();
        if (text.length > 10) return cleanText(text);
      }
    }
  }

  const rawText = root.innerText || '';
  let startIdx = -1;
  const startMatch = rawText.match(/(?:Question:|Save\s*Report(?:ed)?|Others|Text Size A-\s*A\+)\s*\n+/i);
  if (startMatch) {
    startIdx = startMatch.index + startMatch[0].length;
  }

  if (startIdx !== -1) {
    let sliced = rawText.substring(startIdx).trim();
    const cutMatch = sliced.search(/\n\s*(?:Not Attempted|Your first attempt|My Answer|Re-attempt|Solution)/i);
    if (cutMatch !== -1) {
      sliced = sliced.substring(0, cutMatch);
    }
    return cleanText(sliced);
  }

  return cleanText(rawText.slice(0, 500));
}

function normalizeOptionText(text) {
  // Strictly matches "1)", "1.", "(1)", "A)", "A.", "(A)" followed by space.
  // Prevents destroying math formulas like "1 - c" or "1 + c"
  return cleanText(text.replace(/^(\([A-Ea-e1-5]\)|[A-Ea-e1-5][\)\.])\s+/, ''));
}
function extractSubject() {
  const rawText = document.body.innerText || '';
  // Looks for "Section: Quantitative Aptitude" or similar headers
  const match = rawText.match(/(?:Section|Subject)\s*:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : "Unknown";
}
// Sibling structural search + text-based fallback
function extractOptions(root, questionText = '') {
  const selectors = [
    '[data-testid="option"]',
    '[data-testid="option-container"]',
    '.question-and-options--option',
    '.option-item',
    '.option-container',
    '.each-option',
    'label.option',
    'li.option',
    '[class*="option" i]',
    '[class*="Option" i]',
    '.radio-label',
    '.test-option'
  ];

  for (const sel of selectors) {
    let nodes = Array.from(root.querySelectorAll(sel)).filter(n => !isInsideSolution(n));
    // Filter out wrappers that hold other options inside them
    nodes = nodes.filter(n => !nodes.some(child => child !== n && n.contains(child)));
    const extractedTexts = nodes.map(n => normalizeOptionText(n.innerText)).filter(t => t.length > 0);

    if (extractedTexts.length >= 2 && extractedTexts.length <= 6) {
      return extractedTexts;
    }
  }

  // STRUCTURAL FALLBACK: Look for 4 identical siblings
  // NEW: Exclude MathJax, KaTeX, and math tags so it doesn't parse equations as options
  const possibleContainers = Array.from(root.querySelectorAll('div, ul, ol, form')).filter(n => {
      return !isInsideSolution(n) && !n.closest('math, mjx-container, .katex, .mjx-chtml');
  });

  for (const container of possibleContainers) {
      const children = Array.from(container.children);
      if (children.length >= 4 && children.length <= 6) {
          const firstTag = children[0].tagName;
          const allSameTag = children.every(c => c.tagName === firstTag);

          if (allSameTag) {
              const texts = children.map(c => normalizeOptionText(c.innerText)).filter(t => t.length > 0);
              const allShort = texts.every(t => t.length < 250);
              if (texts.length === children.length && allShort) {
                  return texts;
              }
          }
      }
  }

  // TEXT-BASED FALLBACK: If DOM is completely flat
  if (questionText) {
    const lines = questionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const numOptions of [5, 4]) {
      if (lines.length > numOptions) {
        const possibleOptions = lines.slice(-numOptions);
        const allShort = possibleOptions.every(opt => opt.length < 150 && !opt.toLowerCase().includes('question'));

        // FIX: Removed the "notAllTiny" restriction. We will trust the slicing math
        // to grab the bottom 4 lines, even if they are single numbers like "5" or "1/4".

        if (allShort) {
          return possibleOptions.map(normalizeOptionText);
        }
      }
    }
  }

  return [];
}

function extractTimeMetrics(root) {
  const text = textOf(root);
  const userMatch = text.match(/You\s*:\s*(\d{2}:\d{2})/i);
  const avgMatch = text.match(/Avg\s*:\s*(\d{2}:\d{2})/i);

  const toSeconds = (time) => {
    if (!time) return null;
    const [mm, ss] = time.split(':').map(Number);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  };

  return {
    userTimeTaken: userMatch ? userMatch[1] : null,
    avgTimeTaken: avgMatch ? avgMatch[1] : null,
    userTimeTakenSec: toSeconds(userMatch ? userMatch[1] : null),
    avgTimeTakenSec: toSeconds(avgMatch ? avgMatch[1] : null)
  };
}

function buildQuestionPayload(root) {
  const rootText = textOf(root);
  const questionNumber = findQuestionNo(rootText);

  let questionText = extractQuestionText(root);
  const options = extractOptions(root, questionText);
  const timing = extractTimeMetrics(root);
  const subject = extractSubject();

  // If options were found, peel them off the bottom of the questionText
  if (options.length > 0) {
    let cleanedQText = questionText;
    for (let i = options.length - 1; i >= 0; i--) {
       const optText = options[i];

       const escapedOpt = optText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       // NEW: Added an optional group at the end to catch trailing math debris like "/" or "-"
       const regex = new RegExp('(?:[A-Da-d]|\\(?\\d+\\)?)[\\).:\\-\\s]*' + escapedOpt + '\\s*(?:[/\\-–√]*\\s*)*$');

       if (regex.test(cleanedQText)) {
           cleanedQText = cleanedQText.replace(regex, '').trim();
       } else if (cleanedQText.trim().endsWith(optText)) {
           cleanedQText = cleanedQText.substring(0, cleanedQText.lastIndexOf(optText)).trim();
       }
    }

    // NEW: Final sweep to delete stray math operators left dangling at the very bottom
    questionText = cleanedQText.replace(/[\n\s/\\-–√]+$/, '').trim();
  }

  return {
    source: 'ssc-smart-tracker-extension',
    url: window.location.href,
    title: document.title,
    questionNumber,
    questionText,
    options,
    subject,
    ...timing,
    capturedAt: new Date().toISOString()
  };
}

function getQuestionKey(payload) {
  const textFingerprint = (payload.questionText || '').slice(0, 80);
  return `${payload.url}::${payload.questionNumber || 'unknown'}::${textFingerprint}`;
}

function hasRuntimeContext() {
  return Boolean(globalThis.chrome && chrome.runtime && chrome.runtime.id);
}

function safeSendMessage(message, onDone) {
  if (!hasRuntimeContext()) {
    onDone({ ok: false, error: 'Extension context invalidated' });
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      try {
        const runtimeError = chrome?.runtime?.lastError;
        if (runtimeError) {
          onDone({ ok: false, error: runtimeError.message || String(runtimeError) });
          return;
        }

        onDone(response || { ok: false, error: 'No response from extension background' });
      } catch (callbackError) {
        onDone({ ok: false, error: String(callbackError) });
      }
    });
  } catch (sendError) {
    onDone({ ok: false, error: String(sendError) });
  }
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

  safeSendMessage(
    {
      type: 'SSC_TRACKER_CAPTURE_QUESTION',
      questionKey,
      payload
    },
    (response) => {
      if (!response?.ok) {
        button.disabled = false;
        setButtonLabel(button, 'Add to Tracker');
        showNotification('Could not save this question. Please refresh extension and try again.', 'error');
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