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
  '[data-testid="question-text"]'
];

const OPTION_SELECTORS = [
  '.question-and-options--option-container',
  '.question-and-options--option',
  '.option-item',
  '.option-container',
  'li.option',
  'label.option',
  '.each-option'
];

const SOLUTION_BLOCKLIST_SELECTORS = [
  '.question-solution',
  '.solution',
  '[class*="solution"]',
  '.question-paper-solution',
  '.question-solution-body--content'
];

const QUESTION_END_MARKERS = [
  'Your first attempt',
  'My Answer',
  'Re-attempt',
  'View Solution',
  'Your First Attempt Answers',
  'Solution',
  'Was the solution helpful'
];

let activeQuestionKey = null;
let isModalOpen = false;

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
  }, 2400);
}

function isTestbookSolutionPage() {
  const url = window.location.href;
  return /testbook\.com/i.test(url) && /(solution|solutions|analysis|result|review|attemptNo|tests\/)/i.test(url);
}

function cleanText(text) {
  return (text || '').replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
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

function extractQuestionTextFromSelectors(root) {
  for (const selector of QUESTION_TEXT_SELECTORS) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      if (isInsideSolution(node)) continue;
      const value = textOf(node);
      if (value.length > 12) return value;
    }
  }
  return '';
}

function extractQuestionTextBySlicing(rootText) {
  const questionTagIndex = rootText.search(/Question\s*:/i);
  if (questionTagIndex === -1) return '';

  let sliced = rootText.slice(questionTagIndex).replace(/^Question\s*:\s*/i, '');
  const cutPositions = QUESTION_END_MARKERS.map((marker) => sliced.search(new RegExp(marker, 'i'))).filter((pos) => pos > -1);
  if (cutPositions.length) {
    sliced = sliced.slice(0, Math.min(...cutPositions));
  }

  return cleanText(sliced);
}

function normalizeOptionText(text) {
  return cleanText(text.replace(/^([A-Da-d]|\(?\d+\)?)[\).:\-\s]+/, ''));
}

function extractOptions(root) {
  for (const selector of OPTION_SELECTORS) {
    const optionNodes = Array.from(root.querySelectorAll(selector)).filter((node) => !isInsideSolution(node));
    const options = optionNodes.map((node) => normalizeOptionText(textOf(node))).filter((text) => text && text.length < 300);

    if (options.length >= 2) {
      return options.slice(0, 4);
    }
  }

  const rootText = textOf(root);
  const questionSlice = extractQuestionTextBySlicing(rootText);
  if (!questionSlice) return [];

  const lines = questionSlice.split(/\n|\s{2,}/).map(cleanText).filter(Boolean);
  const parsed = lines
    .map((line) => {
      const m = line.match(/^([A-Da-d]|\(?[1-6]\)?)[\).:\-\s]+(.+)/);
      return m ? normalizeOptionText(m[2]) : '';
    })
    .filter(Boolean);

  return Array.from(new Set(parsed)).slice(0, 4);
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

  const questionText = extractQuestionTextFromSelectors(root) || extractQuestionTextBySlicing(rootText) || rootText.slice(0, 300);
  const options = extractOptions(root);
  const timing = extractTimeMetrics(root);

  return {
    source: 'ssc-smart-tracker-extension',
    url: window.location.href,
    title: document.title,
    questionNumber,
    questionText,
    options,
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


function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setButtonLabel(button, text) {
  const label = button.querySelector('.ssc-button-text');
  if (label) label.textContent = text;
}

function closeReviewModal() {
  const modal = document.getElementById('ssc-review-modal-overlay');
  if (modal) modal.remove();
  isModalOpen = false;
}

function buildReviewedPayloadFromForm(form, scrapedPayload) {
  const options = ['A', 'B', 'C', 'D'].map((label) => cleanText(form.querySelector(`[name="option${label}"]`)?.value || ''));
  const filteredOptions = options.filter(Boolean);
  const correctAnswer = form.querySelector('input[name="correctAnswer"]:checked')?.value || '';

  return {
    ...scrapedPayload,
    questionText: cleanText(form.querySelector('[name="questionText"]')?.value || scrapedPayload.questionText || ''),
    options,
    subject: cleanText(form.querySelector('[name="subject"]')?.value || ''),
    subTopic: cleanText(form.querySelector('[name="subTopic"]')?.value || ''),
    examTag: cleanText(form.querySelector('[name="examTag"]')?.value || ''),
    difficulty: form.querySelector('[name="difficulty"]')?.value || 'Medium',
    markedForReview: Boolean(form.querySelector('[name="markedForReview"]')?.checked),
    fixLater: Boolean(form.querySelector('[name="fixLater"]')?.checked),
    correctAnswer,
    correctAnswerIndex: correctAnswer ? ['A', 'B', 'C', 'D'].indexOf(correctAnswer) : null,
    screenshotDataUrl: form.querySelector('[name="screenshotDataUrl"]')?.value || '',
    screenshotProvided: Boolean(form.querySelector('[name="screenshotDataUrl"]')?.value),
    optionsCount: filteredOptions.length,
    reviewedAt: new Date().toISOString()
  };
}

function createReviewModal(scrapedPayload, questionKey, button) {
  closeReviewModal();
  isModalOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'ssc-review-modal-overlay';
  overlay.className = 'ssc-review-modal-overlay';

  const options = [...scrapedPayload.options || []];
  while (options.length < 4) options.push('');

  overlay.innerHTML = `
    <div class="ssc-review-modal" role="dialog" aria-modal="true">
      <div class="ssc-review-modal-header">
        <h3>Review & Edit Before Save</h3>
        <button type="button" class="ssc-modal-close" aria-label="Close">✕</button>
      </div>
      <form class="ssc-review-form">
        <label>Question Text
          <textarea name="questionText" rows="5" required>${escapeHtml(scrapedPayload.questionText || '')}</textarea>
        </label>

        <div class="ssc-grid-two">
          <label>Option A <input name="optionA" type="text" value="${escapeHtml(options[0] || '')}" /></label>
          <label>Option B <input name="optionB" type="text" value="${escapeHtml(options[1] || '')}" /></label>
          <label>Option C <input name="optionC" type="text" value="${escapeHtml(options[2] || '')}" /></label>
          <label>Option D <input name="optionD" type="text" value="${escapeHtml(options[3] || '')}" /></label>
        </div>

        <div class="ssc-grid-two">
          <label>Subject <input name="subject" type="text" placeholder="Quantitative Aptitude" /></label>
          <label>Sub-topic <input name="subTopic" type="text" placeholder="Time & Distance" /></label>
        </div>

        <div class="ssc-grid-two">
          <label>Exam Tag <input name="examTag" type="text" placeholder="SSC CGL Full Mock 1" value="${escapeHtml(scrapedPayload.title || '')}" /></label>
          <label>Difficulty
            <select name="difficulty">
              <option>Easy</option>
              <option selected>Medium</option>
              <option>Hard</option>
            </select>
          </label>
        </div>

        <div class="ssc-meta-row">
          <span>Time: You ${scrapedPayload.userTimeTaken || '--:--'} | Avg ${scrapedPayload.avgTimeTaken || '--:--'}</span>
          <span>Question #${scrapedPayload.questionNumber || '?'}</span>
        </div>

        <fieldset class="ssc-correct-answer">
          <legend>Select Correct Answer</legend>
          <label><input type="radio" name="correctAnswer" value="A" /> A</label>
          <label><input type="radio" name="correctAnswer" value="B" /> B</label>
          <label><input type="radio" name="correctAnswer" value="C" /> C</label>
          <label><input type="radio" name="correctAnswer" value="D" /> D</label>
        </fieldset>

        <div class="ssc-checks">
          <label><input type="checkbox" name="markedForReview" /> Marked for Review</label>
          <label><input type="checkbox" name="fixLater" /> Fix Later</label>
        </div>

        <input type="hidden" name="screenshotDataUrl" value="" />
        <div class="ssc-screenshot-row">
          <button type="button" class="ssc-secondary-btn" data-action="capture">Capture Screenshot</button>
          <input type="file" accept="image/*" data-action="upload" />
          <span class="ssc-screenshot-status">No screenshot</span>
        </div>

        <div class="ssc-modal-actions">
          <button type="button" class="ssc-secondary-btn" data-action="cancel">Cancel</button>
          <button type="submit" class="ssc-primary-btn">Save</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector('.ssc-review-form');
  const closeBtn = overlay.querySelector('.ssc-modal-close');
  const cancelBtn = overlay.querySelector('[data-action="cancel"]');
  const captureBtn = overlay.querySelector('[data-action="capture"]');
  const uploadInput = overlay.querySelector('[data-action="upload"]');
  const screenshotField = form.querySelector('[name="screenshotDataUrl"]');
  const screenshotStatus = overlay.querySelector('.ssc-screenshot-status');

  const onClose = () => {
    closeReviewModal();
    button.disabled = false;
    button.classList.remove('ssc-button-success');
    setButtonLabel(button, 'Add to Tracker');
  };

  closeBtn.addEventListener('click', onClose);
  cancelBtn.addEventListener('click', onClose);

  captureBtn.addEventListener('click', () => {
    captureBtn.disabled = true;
    captureBtn.textContent = 'Capturing...';

    safeSendMessage({ type: 'SSC_TRACKER_CAPTURE_SCREENSHOT' }, (resp) => {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture Screenshot';

      if (!resp?.ok || !resp?.dataUrl) {
        showNotification('Screenshot capture failed. You can upload manually.', 'error');
        return;
      }

      screenshotField.value = resp.dataUrl;
      screenshotStatus.textContent = 'Screenshot attached';
      showNotification('Screenshot captured.', 'success');
    });
  });

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      screenshotField.value = typeof reader.result === 'string' ? reader.result : '';
      screenshotStatus.textContent = 'Uploaded image attached';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const reviewedPayload = buildReviewedPayloadFromForm(form, scrapedPayload);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    safeSendMessage(
      {
        type: 'SSC_TRACKER_SAVE_REVIEWED_QUESTION',
        questionKey,
        payload: reviewedPayload,
        rawPayload: scrapedPayload
      },
      (response) => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';

        if (!response?.ok) {
          showNotification('Save failed. Check backend URL or try again.', 'error');
          return;
        }

        closeReviewModal();
        button.classList.add('ssc-button-success');
        setButtonLabel(button, 'Added');

        if (response.sentToBackend) {
          showNotification('Saved to tracker backend.', 'success');
        } else {
          showNotification('Saved locally. Configure backend URL in storage to sync.', 'info');
        }
      }
    );
  });
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
  setButtonLabel(button, 'Reviewing...');

  createReviewModal(payload, questionKey, button);
}

function removeDuplicateButtons() {
  const buttons = Array.from(document.querySelectorAll(`.${QUESTION_BUTTON_CLASS}`));
  if (buttons.length <= 1) return;

  buttons.forEach((btn, index) => {
    if (index > 0) btn.remove();
  });
}

function ensureSingleQuestionButton() {
  if (isModalOpen) return;

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
