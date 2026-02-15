const BUTTON_ID = 'ssc-smart-tracker-add-btn';
const ANCHOR_SELECTORS = [
  '.test-details--title',
  '.test-details',
  '.test-analysis-header',
  'h1',
  'main'
];

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
  }, 2500);
}

function findAnchor() {
  for (const selector of ANCHOR_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      return el;
    }
  }
  return null;
}

function onButtonClick(button) {
  button.disabled = true;
  button.querySelector('.ssc-button-text').textContent = 'Saving...';

  chrome.runtime.sendMessage(
    {
      type: 'SSC_TRACKER_CAPTURE',
      title: document.title,
      html: document.documentElement.outerHTML
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        button.disabled = false;
        button.querySelector('.ssc-button-text').textContent = 'Add to Tracker';
        showNotification('Could not save test data. Try again.', 'error');
        return;
      }

      button.classList.add('ssc-button-success');
      button.querySelector('.ssc-button-text').textContent = 'Added';
      showNotification('Saved to SSC Smart Tracker cache.', 'success');
    }
  );
}

function injectButton() {
  if (document.getElementById(BUTTON_ID)) return;

  const anchor = findAnchor();
  if (!anchor) return;

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.className = 'ssc-tracker-button';
  button.innerHTML = '<span class="ssc-button-icon">📌</span><span class="ssc-button-text">Add to Tracker</span>';
  button.addEventListener('click', () => onButtonClick(button));

  if (anchor.tagName === 'MAIN') {
    anchor.prepend(button);
  } else {
    anchor.insertAdjacentElement('afterend', button);
  }
}

function shouldShowButton() {
  const url = window.location.href;
  return /testbook\.com/i.test(url) && /(test|analysis|result|review|solutions)/i.test(url);
}

function bootstrap() {
  if (!shouldShowButton()) {
    return;
  }

  injectButton();

  const observer = new MutationObserver(() => {
    if (!document.getElementById(BUTTON_ID)) {
      injectButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
