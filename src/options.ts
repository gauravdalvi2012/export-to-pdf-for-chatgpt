import { defaults } from './config.js';
import type { ExportSettings, PdfTheme, PaperFormat } from './types.js';

const SETTINGS_KEY = 'pdfExportSettings';

const form = document.getElementById('settings-form') as HTMLFormElement | null;
const status = document.getElementById('save-status');
const preview = document.getElementById('preview-paper') as HTMLElement | null;
let statusTimer: ReturnType<typeof setTimeout> | undefined;

function readSettings(): ExportSettings {
  if (!form) return defaults;
  const data = new FormData(form);
  const themeVal = data.get('theme') as string;
  const paperVal = data.get('paper') as string;

  const pageNumbersInput = form.elements.namedItem(
    'pageNumbers'
  ) as HTMLInputElement | null;
  const titleAndDateInput = form.elements.namedItem(
    'titleAndDate'
  ) as HTMLInputElement | null;
  const userBubblesInput = form.elements.namedItem(
    'userBubbles'
  ) as HTMLInputElement | null;
  const includeProgressInput = form.elements.namedItem(
    'includeProgress'
  ) as HTMLInputElement | null;

  return {
    theme: (['light', 'dark', 'black'].includes(themeVal)
      ? themeVal
      : defaults.theme) as PdfTheme,
    paper: (paperVal === 'Letter' ? 'Letter' : 'A4') as PaperFormat,
    pageNumbers: pageNumbersInput
      ? pageNumbersInput.checked
      : defaults.pageNumbers,
    titleAndDate: titleAndDateInput
      ? titleAndDateInput.checked
      : defaults.titleAndDate,
    userBubbles: userBubblesInput
      ? userBubblesInput.checked
      : defaults.userBubbles,
    includeProgress: includeProgressInput
      ? includeProgressInput.checked
      : defaults.includeProgress
  };
}

function applySettings(settings: ExportSettings): void {
  if (!form) return;
  const safeTheme = ['light', 'dark', 'black'].includes(settings.theme)
    ? settings.theme
    : defaults.theme;
  const safeSettings: ExportSettings = { ...settings, theme: safeTheme };

  for (const [key, value] of Object.entries(safeSettings)) {
    if (typeof value === 'boolean') {
      const el = form.elements.namedItem(key) as HTMLInputElement | null;
      if (el) el.checked = value;
    } else {
      const radio = form.querySelector(
        `input[name="${key}"][value="${value}"]`
      ) as HTMLInputElement | null;
      if (radio) radio.checked = true;
    }
  }
  updatePreview();
}

function updatePreview(): void {
  if (!preview) return;
  const settings = readSettings();
  preview.dataset.theme = settings.theme;
  preview.dataset.bubbles = String(settings.userBubbles);
  const pageNum = preview.querySelector(
    '.sample-page-number'
  ) as HTMLElement | null;
  if (pageNum) pageNum.hidden = !settings.pageNumbers;
  const meta = preview.querySelector('.sample-meta') as HTMLElement | null;
  if (meta) meta.hidden = !settings.titleAndDate;
}

async function save(): Promise<void> {
  const settings = readSettings();
  updatePreview();
  try {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    if (status) status.textContent = 'Saved';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (status) status.textContent = 'Settings are saved automatically';
    }, 2200);
  } catch (error) {
    if (status) status.textContent = 'Failed to save settings';
    console.error('Failed to save settings:', error);
  }
}

async function init(): Promise<void> {
  if (!form) return;
  try {
    const result = (await chrome.storage.sync.get(SETTINGS_KEY)) as {
      [key: string]: Partial<ExportSettings>;
    };
    applySettings({ ...defaults, ...(result[SETTINGS_KEY] || {}) });
  } catch {
    applySettings(defaults);
  }

  form.addEventListener('input', () => void save());
  form.addEventListener('change', () => void save());

  document.getElementById('reset')?.addEventListener('click', () => {
    applySettings(defaults);
    void save();
  });
}

document.addEventListener('DOMContentLoaded', () => void init());
