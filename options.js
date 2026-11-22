const SETTINGS_KEY = 'pdfExportSettings';
const defaults = Object.freeze({
  theme: 'light',
  paper: 'A4',
  pageNumbers: true,
  titleAndDate: true,
  userBubbles: true,
  includeProgress: false
});

const form = document.getElementById('settings-form');
const status = document.getElementById('save-status');
const preview = document.getElementById('preview-paper');
let statusTimer;

function readSettings() {
  const data = new FormData(form);
  return {
    theme: ['light', 'dark', 'black'].includes(data.get('theme'))
      ? data.get('theme')
      : defaults.theme,
    paper: data.get('paper') || defaults.paper,
    pageNumbers: form.elements.pageNumbers.checked,
    titleAndDate: form.elements.titleAndDate.checked,
    userBubbles: form.elements.userBubbles.checked,
    includeProgress: form.elements.includeProgress.checked
  };
}

function applySettings(settings) {
  settings = {
    ...settings,
    theme: ['light', 'dark', 'black'].includes(settings.theme)
      ? settings.theme
      : defaults.theme
  };
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'boolean') {
      form.elements[key].checked = value;
    } else {
      const radio = form.querySelector(
        `input[name="${key}"][value="${value}"]`
      );
      if (radio) radio.checked = true;
    }
  }
  updatePreview();
}

function updatePreview() {
  const settings = readSettings();
  preview.dataset.theme = settings.theme;
  preview.dataset.bubbles = settings.userBubbles;
  preview.querySelector('.sample-page-number').hidden = !settings.pageNumbers;
  preview.querySelector('.sample-meta').hidden = !settings.titleAndDate;
}

async function save() {
  const settings = readSettings();
  updatePreview();
  try {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    status.textContent = 'Saved';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = 'Settings are saved automatically';
    }, 1600);
  } catch (error) {
    console.error('Unable to save export preferences:', error);
    status.textContent = 'Could not save settings';
  }
}

form.addEventListener('change', save);
document.getElementById('reset').addEventListener('click', async () => {
  applySettings(defaults);
  await save();
});

(async () => {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    applySettings({ ...defaults, ...(result[SETTINGS_KEY] || {}) });
  } catch (error) {
    console.error('Unable to load export preferences:', error);
    applySettings(defaults);
    status.textContent = 'Using defaults — settings not loaded';
  }
})();
