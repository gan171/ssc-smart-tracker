// SSC Smart Tracker - Testbook Integration
// FINAL WORKING VERSION - Targets only actual questions

console.log('🎯 SSC Tracker: Extension loaded');

const CONFIG = {
  API_URL: 'http://127.0.0.1:8000',
  BUTTON_TEXT: '📌 Add to Tracker',
  CHECK_INTERVAL: 3000,

  SELECTORS: {
    // MAIN QUESTION AREA - Only the center content, not sidebars
    mainContent: 'main, [role="main"], .main-content, #main-content, .content-wrapper',

    // SPECIFIC: Only actual question containers in main area
    // Based on your scraper that works
    questionWrapper: '.question-wrapper',

    // Question text - try these in order
    questionText: [
      '.question-text-container',
      '.question-text',
      '.question-and-options--question-text',
      '.question-statement'
    ],

    // Options container
    optionsContainer: [
      '.options-container',
      '.question-and-options--options-container',
      '.options-list'
    ],

    // Individual option
    option: [
      '.question-and-options--option-container',
      '.option-item',
      '.option'
    ],

    // Correct answer
    correctAnswer: '.question-solution-body--header-left',

    // User answer
    userAnswer: '.user-answer .question-and-options--option-text',

    // Solution
    solution: '.question-solution-body--content',

    // Section header
    section: '.question-paper-section-header',

    // EXCLUSIONS - Never inject button here
    exclude: [
      '.question-palette',        // Right sidebar
      '.navigation',              // Navigation
      'nav',                      // Nav elements
      'header',                   // Header
      '[class*="palette"]',       // Any palette
      '[class*="navigation"]',    // Any navigation
      '[class*="sidebar"]'        // Any sidebar
    ]
  }
};

let processedQuestions = new Set();
let apiToken = null;
let buttonCount = 0;

// Get API token
chrome.storage.sync.get(['apiToken'], (result) => {
  apiToken = result.apiToken;
  console.log(apiToken ? '✅ API token loaded' : '⚠️ No API token');
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.apiToken) {
    apiToken = changes.apiToken.newValue;
  }
});

/**
 * Check if element should be excluded
 */
function shouldExclude(element) {
  for (const selector of CONFIG.SELECTORS.exclude) {
    if (element.closest(selector)) {
      return true;
    }
  }
  return false;
}

/**
 * Find main content area (excludes sidebars, navigation)
 */
function getMainContent() {
  // Try to find main content area
  for (const selector of CONFIG.SELECTORS.mainContent.split(', ')) {
    const main = document.querySelector(selector);
    if (main) {
      console.log('✅ Found main content:', selector);
      return main;
    }
  }

  // Fallback: use body but we'll be more careful
  console.log('⚠️ Using document.body as fallback');
  return document.body;
}

/**
 * Find question wrappers (ONLY in main content)
 */
function findQuestionWrappers() {
  const mainContent = getMainContent();

  // Find all .question-wrapper elements
  const wrappers = mainContent.querySelectorAll(CONFIG.SELECTORS.questionWrapper);

  // Filter out excluded elements (sidebar, navigation, palette)
  const validWrappers = Array.from(wrappers).filter(wrapper => {
    // Check if it's in an excluded area
    if (shouldExclude(wrapper)) {
      console.log('⏭️ Skipping wrapper in excluded area');
      return false;
    }

    // Check if it actually has question content
    const hasQuestionText = wrapper.querySelector('.question-text, .question-text-container, .question-and-options--question-text');
    if (!hasQuestionText) {
      console.log('⏭️ Skipping wrapper without question text');
      return false;
    }

    return true;
  });

  console.log(`✅ Found ${validWrappers.length} valid question wrappers`);
  return validWrappers;
}

/**
 * Find element using multiple selectors
 */
function findElement(container, selectors) {
  if (typeof selectors === 'string') {
    return container.querySelector(selectors);
  }

  for (const selector of selectors) {
    const element = container.querySelector(selector);
    if (element) return element;
  }
  return null;
}

/**
 * Clean text
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\u200b/g, '')
    .replace(/\ufeff/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get option text (remove "A. " prefix)
 */
function getOptionText(optionElement) {
  if (!optionElement) return null;

  let text = cleanText(optionElement.textContent);

  // Remove "A. ", "B. ", etc.
  if (text && /^[A-D]\.\s/.test(text)) {
    text = text.substring(3).trim();
  }

  return text;
}

/**
 * Extract question data
 */
function extractQuestionData(wrapper) {
  try {
    // 1. Question text
    const questionTextElem = findElement(wrapper, CONFIG.SELECTORS.questionText);
    if (!questionTextElem) {
      return null;
    }

    const questionText = cleanText(questionTextElem.textContent);
    if (!questionText || questionText.length < 10) {
      return null;
    }

    // 2. Options
    const optionsContainer = findElement(wrapper, CONFIG.SELECTORS.optionsContainer);
    const options = [];

    if (optionsContainer) {
      for (const selector of CONFIG.SELECTORS.option) {
        const found = optionsContainer.querySelectorAll(selector);
        if (found.length > 0) {
          found.forEach((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            const text = getOptionText(opt);
            if (text && text.length > 0 && text.length < 500) {
              options.push({ label, text });
            }
          });
          break;
        }
      }
    }

    // 3. User answer
    let userAnswer = null;
    const userAnswerElem = wrapper.querySelector(CONFIG.SELECTORS.userAnswer);
    if (userAnswerElem) {
      const userAnswerText = getOptionText(userAnswerElem);
      options.forEach(opt => {
        if (opt.text === userAnswerText) {
          userAnswer = opt.label;
        }
      });
    }

    // 4. Correct answer
    let correctAnswer = null;
    const correctAnswerElem = wrapper.querySelector(CONFIG.SELECTORS.correctAnswer);
    if (correctAnswerElem) {
      const fullText = cleanText(correctAnswerElem.textContent);
      const answerText = fullText.replace(/^The correct answer is/i, '').trim();

      options.forEach(opt => {
        if (opt.text === answerText || answerText.includes(opt.text)) {
          correctAnswer = opt.label;
        }
      });

      if (!correctAnswer) {
        const match = fullText.match(/\b([A-D])\b/);
        if (match) correctAnswer = match[1];
      }
    }

    // 5. Explanation
    let explanation = '';
    const solutionElem = wrapper.querySelector(CONFIG.SELECTORS.solution);
    if (solutionElem) {
      explanation = cleanText(solutionElem.textContent);
    }

    // 6. Section
    let subject = 'General';
    let prevElem = wrapper.previousElementSibling;
    while (prevElem) {
      if (prevElem.classList && prevElem.classList.contains('question-paper-section-header')) {
        subject = cleanText(prevElem.textContent);
        if (subject === 'Quantitative Aptitude') {
          subject = 'Maths';
        }
        break;
      }
      prevElem = prevElem.previousElementSibling;
    }

    // 7. Has image
    const hasImage = wrapper.querySelector('img') !== null;

    return {
      questionText,
      options,
      userAnswer,
      correctAnswer,
      explanation,
      subject,
      hasImage,
      element: wrapper
    };

  } catch (error) {
    console.error('❌ Error extracting:', error);
    return null;
  }
}

/**
 * Capture screenshot
 */
async function captureScreenshot(element) {
  try {
    if (typeof html2canvas === 'undefined') {
      await loadHtml2Canvas();
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch (error) {
    console.error('❌ Screenshot error:', error);
    return null;
  }
}

/**
 * Load html2canvas
 */
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (typeof html2canvas !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Send to backend
 */
async function sendToBackend(questionData) {
  if (!apiToken) {
    showNotification('❌ Please set API token in extension popup', 'error');
    return false;
  }

  try {
    showNotification('⏳ Uploading...', 'info');

    const payload = {
      question_text: questionData.questionText,
      options: questionData.options,
      correct_option: questionData.correctAnswer,
      user_answer: questionData.userAnswer,
      explanation: questionData.explanation,
      subject: questionData.subject,
      topic: 'General',
      source: 'testbook_extension',
      has_visual_elements: questionData.hasImage
    };

    // With image
    if (questionData.hasImage) {
      const screenshot = await captureScreenshot(questionData.element);
      if (screenshot) {
        const formData = new FormData();
        formData.append('file', screenshot, 'question.png');
        formData.append('metadata', JSON.stringify(payload));

        const response = await fetch(`${CONFIG.API_URL}/upload-screenshot/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiToken}` },
          body: formData
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        showNotification('✅ Added!', 'success');
        return true;
      }
    }

    // Without image
    const response = await fetch(`${CONFIG.API_URL}/import-question/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    showNotification('✅ Added!', 'success');
    return true;

  } catch (error) {
    console.error('❌ Upload failed:', error);
    showNotification('❌ Failed: ' + error.message, 'error');
    return false;
  }
}

/**
 * Inject button
 */
function injectButton(wrapper, questionData) {
  const questionId = btoa(questionData.questionText.substring(0, 100)).substring(0, 50);

  if (processedQuestions.has(questionId)) {
    return;
  }

  if (wrapper.querySelector('.ssc-tracker-button')) {
    return;
  }

  const button = document.createElement('button');
  button.className = 'ssc-tracker-button';
  button.innerHTML = `
    <span class="ssc-button-icon">📌</span>
    <span class="ssc-button-text">${CONFIG.BUTTON_TEXT}</span>
  `;

  button.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    button.disabled = true;
    button.innerHTML = '<span>⏳ Adding...</span>';

    const success = await sendToBackend(questionData);

    if (success) {
      processedQuestions.add(questionId);
      button.innerHTML = '<span>✅ Added!</span>';
      button.classList.add('ssc-button-success');

      setTimeout(() => {
        button.style.opacity = '0';
        setTimeout(() => button.remove(), 300);
      }, 2000);
    } else {
      button.disabled = false;
      button.innerHTML = `<span>📌</span><span>${CONFIG.BUTTON_TEXT}</span>`;
    }
  };

  wrapper.insertBefore(button, wrapper.firstChild);
  buttonCount++;

  console.log(`✅ Button ${buttonCount}:`, questionData.questionText.substring(0, 50));
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.ssc-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `ssc-notification ssc-notification-${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Process questions
 */
function processQuestions() {
  const wrappers = findQuestionWrappers();

  if (wrappers.length === 0) {
    console.log('ℹ️ No valid wrappers found');
    return;
  }

  console.log(`🔍 Processing ${wrappers.length} questions...`);

  wrappers.forEach((wrapper) => {
    const questionData = extractQuestionData(wrapper);

    if (questionData && questionData.questionText) {
      injectButton(wrapper, questionData);
    }
  });
}

/**
 * Initialize
 */
function init() {
  console.log('🚀 Initializing...');

  setTimeout(processQuestions, 2000);

  setInterval(processQuestions, CONFIG.CHECK_INTERVAL);

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(processQuestions, 500);
  });

  console.log('✅ Ready!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}