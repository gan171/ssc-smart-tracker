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

// RESTORED: Preserves Line Breaks (\n) so options don't squish together
function cleanText(text) {
  return (text || '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/ \n /g, '\n')
    .replace(/ \n/g, '\n')
    .replace(/\n /g, '\n')
    .replace(/\n+/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
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

// RESTORED: Scrapes "Quantitative Aptitude" etc.
function extractSubject() {
  const rawText = document.body.innerText || '';
  const match = rawText.match(/(?:Section|Subject)\s*:\s*(.+?)(?=\n|$)/i);
  return match ? match[1].trim() : "Unknown";
}

// RESTORED: The robust question text extractor
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

// RESTORED: Strict Math Normalizer (protects "1 - c")
function normalizeOptionText(text) {
  return cleanText(text.replace(/^(\([A-Ea-e1-5]\)|[A-Ea-e1-5][\)\.])\s+/, ''));
}

// RESTORED: The Structural & Text-based Option Extractor
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
    nodes = nodes.filter(n => !nodes.some(child => child !== n && n.contains(child)));
    const extractedTexts = nodes.map(n => normalizeOptionText(n.innerText)).filter(t => t.length > 0);

    if (extractedTexts.length >= 2 && extractedTexts.length <= 6) {
      return extractedTexts;
    }
  }

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
              if (texts.length === children.length && allShort) return texts;
          }
      }
  }

  if (questionText) {
    const lines = questionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const numOptions of [5, 4]) {
      if (lines.length > numOptions) {
        const possibleOptions = lines.slice(-numOptions);
        const allShort = possibleOptions.every(opt => opt.length < 150 && !opt.toLowerCase().includes('question'));
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

// RESTORED: Peeling Logic & Payload Builder
function buildQuestionPayload(root) {
  const rootText = textOf(root);
  const questionNumber = findQuestionNo(rootText);

  let questionText = extractQuestionText(root);
  const options = extractOptions(root, questionText);
  const timing = extractTimeMetrics(root);
  const subject = extractSubject();

  if (options.length > 0) {
    let cleanedQText = questionText;
    for (let i = options.length - 1; i >= 0; i--) {
       const optText = options[i];
       const escapedOpt = optText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const regex = new RegExp('(?:[A-Da-d]|\\(?\\d+\\)?)[\\).:\\-\\s]*' + escapedOpt + '\\s*(?:[/\\-–√]*\\s*)*$');

       if (regex.test(cleanedQText)) {
           cleanedQText = cleanedQText.replace(regex, '').trim();
       } else if (cleanedQText.trim().endsWith(optText)) {
           cleanedQText = cleanedQText.substring(0, cleanedQText.lastIndexOf(optText)).trim();
       }
    }
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

// IMPORTANT: We kept your UI builder exactly as your PR made it!
function buildReviewedPayloadFromForm(form, scrapedPayload) {
  const options = ['A', 'B', 'C', 'D'].map((label) => cleanText(form.querySelector(`[name="option${label}"]`)?.value || ''));
  const filteredOptions = options.filter(Boolean);
  const correctAnswer = form.querySelector('input[name="correctAnswer"]:checked')?.value || '';

  return {
    ...scrapedPayload,
    questionText: cleanText(form.querySelector('[name="questionText"]')?.value || scrapedPayload.questionText || ''),
    options,
    subject: cleanText(form.querySelector('[name="subject"]')?.value || scrapedPayload.subject || ''),
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

// IMPORTANT: We kept your Modal exactly as your PR made it!
function createReviewModal(scrapedPayload, questionKey, button) {
  closeReviewModal();
  isModalOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'ssc-review-modal-overlay';
  overlay.className = 'ssc-review-modal-overlay';

  const options = [...(scrapedPayload.options || [])];
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
          <label>Subject <input name="subject" type="text" placeholder="Quantitative Aptitude" value="${escapeHtml(scrapedPayload.subject || '')}"/></label>
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
    captureBtn.textContent = 'Capturing & Cropping...';

    safeSendMessage({ type: 'SSC_TRACKER_CAPTURE_SCREENSHOT' }, (resp) => {
      if (!resp?.ok || !resp?.dataUrl) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture Screenshot';
        showNotification('Screenshot capture failed. You can upload manually.', 'error');
        return;
      }

      // ==========================================
      // FEATURE: Auto-Crop Screenshot
      // ==========================================
      const root = resolveCurrentQuestionRoot();

      // If no question root is found, just use the full screenshot
      if (!root) {
        finishCapture(resp.dataUrl);
        return;
      }

      // Get the exact coordinates of the question block
      const rect = root.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Load the full screenshot into an image object
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Add 20px of padding around the question so it doesn't look cramped
        const pad = 20;

        // Calculate crop coordinates (adjusting for high-res Retina displays)
        let sx = (rect.left - pad) * dpr;
        let sy = (rect.top - pad) * dpr;
        let sWidth = (rect.width + pad * 2) * dpr;
        let sHeight = (rect.height + pad * 2) * dpr;

        // Prevent cropping outside the bounds of the image
        if (sx < 0) { sWidth += sx; sx = 0; }
        if (sy < 0) { sHeight += sy; sy = 0; }
        if (sx + sWidth > img.width) sWidth = img.width - sx;
        if (sy + sHeight > img.height) sHeight = img.height - sy;

        canvas.width = sWidth;
        canvas.height = sHeight;

        // Draw only the cropped portion to the invisible canvas
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        // Convert the cropped canvas back to a base64 image URL
        finishCapture(canvas.toDataURL('image/png'));
      };

      img.src = resp.dataUrl; // Trigger the image load

      // Helper function to update the UI once the crop is done
      function finishCapture(finalDataUrl) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture Screenshot';
        screenshotField.value = finalDataUrl;
        screenshotStatus.textContent = 'Auto-cropped screenshot attached!';
        screenshotStatus.style.color = "green";
        showNotification('Question auto-cropped successfully.', 'success');
      }
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
// ==========================================
// FEATURE: Ninja Mode (Keyboard Shortcut)
// ==========================================
document.addEventListener('keydown', (e) => {
  // Listen for Alt + S (or Option + S on Mac)
  if (e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault(); // Stop default browser saving behavior

    // Find the button and click it
    const trackBtn = document.getElementById(BUTTON_ID);
    if (trackBtn && !trackBtn.disabled) {
      trackBtn.click();
    } else if (!isModalOpen) {
      // If the button hasn't injected yet, force it and click
      ensureSingleQuestionButton();
      const injectedBtn = document.getElementById(BUTTON_ID);
      if (injectedBtn) injectedBtn.click();
    }
  }
});
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