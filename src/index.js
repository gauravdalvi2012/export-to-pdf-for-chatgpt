/* Export to PDF for ChatGPT v1.0.0 — preserve code lines and remove source citations. */
import { defaults } from './config.js';
import { createProgressIndicator } from './ui/progress.js';
import { createSnapshotManager } from './capture/snapshot.js';
import { createDomCleaner } from './dom/cleaner.js';
import { extractAttachments, hasContent } from './dom/attachments.js';
import { createConversationScanner } from './scanner/scroller.js';
import { assembleDocument, openPrintWindow } from './print/document.js';

(async () => {
  if (window.__chatPdfExportRunning) return;
  window.__chatPdfExportRunning = true;
  let progress = null;

  try {
    const scrollHost = document.querySelector('[role="region"][aria-label="Conversation"]');
    if (!scrollHost) throw new Error('Conversation not found. Open a ChatGPT conversation first.');

    let saved = {};
    try {
      saved = (await chrome.storage.sync.get('pdfExportSettings')).pdfExportSettings || {};
    } catch (error) {
      console.warn('Using default PDF export settings:', error);
    }
    const opts = { ...defaults, ...saved };
    if (!['light', 'dark', 'black'].includes(opts.theme)) opts.theme = 'light';
    if (!['A4', 'Letter'].includes(opts.paper)) opts.paper = 'A4';

    // Isolated progress indicator. Lives outside the scroll host, so it does
    // not affect transcript heights or become part of the exported content.
    progress = createProgressIndicator();
    const { progressHost, showProgress, checkCancelled } = progress;

    const scanStats = {
      seenTurns: new Set(),
      visualCandidates: 0,
      visualSnapshots: 0,
      visualFallbacks: 0,
      steps: 0,
      slowSteps: 0,
      topReached: false,
      bottomReached: false
    };

    const rawTitle = (document.title || '').replace(/\s*[-|]\s*ChatGPT\s*$/, '').trim();
    const title = rawTitle && rawTitle !== 'ChatGPT' ? rawTitle : 'ChatGPT Conversation';
    const sourceURL = location.href;
    const exportedAt = new Date();
    const exportDate = exportedAt.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const collected = new Map();
    const doc = document.implementation.createHTMLDocument(title);

    // We cannot know the total number of conversation turns from the DOM alone:
    // virtualized turns may not yet exist. Never label scan position as completeness.
    function scanSummary() {
      const attachments = [...collected.values()].reduce((sum, section) =>
        sum + section.querySelectorAll('.attachment-pill').length, 0);
      return `${scanStats.seenTurns.size} turns detected · ${collected.size} messages · ${attachments} attachment pills`;
    }

    let scanner = null;
    const snapshotManager = createSnapshotManager({
      scrollHost,
      getProgressHost: () => progressHost,
      checkCancelled,
      waitForSettled: (args) => scanner.waitForSettled(args),
      scanStats
    });

    const userAttachmentNodes = new WeakSet();
    const clean = createDomCleaner({
      doc,
      snapshotCache: snapshotManager.snapshotCache,
      userAttachmentNodes
    });

    async function collectVisibleMessages() {
      // This is the actual ChatGPT turn boundary on the currently observed UI.
      // A single turn can contain BOTH a user message and an assistant response.
      for (const turn of scrollHost.querySelectorAll('[data-turn-key]')) {
        const key = turn.getAttribute('data-turn-key');
        if (!key) continue;
        scanStats.seenTurns.add(key);
        const user = turn.querySelector('[data-chatgpt-search-message-ids], .group\\/user-message');
        const userSource = user?.querySelector('.bg-user-message') || user?.querySelector('[dir="auto"]') || user;
        const candidates = [...turn.querySelectorAll(
          '[class*="entity-prose-inset"], .markdown, [class*="markdown"]'
        )].filter((element) => !user?.contains(element));
        const assistantSources = candidates.filter((element) =>
          !candidates.some((other) => other !== element && other.contains(element))
        );

        async function add(role, source, suffix) {
          const attachments = role === 'user'
            ? extractAttachments(doc, turn, user, source, assistantSources, userAttachmentNodes) : null;
          if (!hasContent(source) && !attachments?.childNodes.length) return;
          const section = doc.createElement('section');
          section.className = `message ${role}`;
          const roleLabel = doc.createElement('div');
          roleLabel.className = 'role';
          roleLabel.textContent = role === 'user' ? 'You' : 'ChatGPT';
          section.appendChild(roleLabel);
          const body = doc.createElement('div');
          body.className = 'message-content';
          if (role === 'assistant') await snapshotManager.prepareVisualSnapshots(source);
          body.appendChild(clean(source, false, role));
          if (attachments?.childNodes.length) body.appendChild(attachments);
          section.appendChild(body);
          // Only genuinely short messages stay intact. Do not treat longer
          // paragraphs or multiline configuration as unbreakable sections.
          const compactText = (source.innerText || '').trim();
          if (compactText.length < 230 && compactText.split(/\r?\n/).length <= 5 &&
              !source.querySelector('table, pre, img, svg, figure')) {
            section.classList.add('short-message');
            if (role === 'user') section.classList.add('keep-with-answer');
          }
          const id = `${key}:${suffix}`;
          const old = collected.get(id);
          if (!old || section.textContent.length > old.textContent.length ||
              section.querySelectorAll('img,.attachment-pill').length >
              old.querySelectorAll('img,.attachment-pill').length) {
            collected.set(id, section);
          }
        }

        await add('user', userSource, 'user');
        for (let index = 0; index < assistantSources.length; index++) {
          await add('assistant', assistantSources[index], `assistant:${index}`);
        }
      }
    }

    scanner = createConversationScanner({
      scrollHost,
      scanStats,
      checkCancelled,
      showProgress,
      scanSummary,
      collectVisibleMessages,
      pendingVisuals: snapshotManager.pendingVisuals
    });

    const scanWarnings = await scanner.scan();

    if (collected.size === 0) throw new Error('No conversation turns found to export.');
    if (scanWarnings.length) console.warn('ChatGPT PDF: incomplete scan:', scanWarnings.join(' '));
    else console.info(`ChatGPT PDF: visited top and bottom; ${scanSummary()}. ` +
      'Complete transcript coverage cannot be guaranteed from virtualized DOM alone.');

    const transcript = [...collected.values()];
    assembleDocument({
      doc,
      title,
      sourceURL,
      exportDate,
      opts,
      transcript,
      scanWarnings
    });

    if (snapshotManager.getSnapshotCount()) {
      console.info(`ChatGPT PDF: captured ${snapshotManager.getSnapshotCount()} static component snapshots.`);
    }

    showProgress('Preparing printable PDF', .98, scanSummary());
    console.info(`ChatGPT PDF scan: ${scanStats.steps} overlapping steps; ` +
      `${scanStats.slowSteps} steps needed extra loading time; ` +
      `${scanStats.visualSnapshots}/${scanStats.visualCandidates} visual snapshots, ` +
      `${snapshotManager.pendingVisuals.size} unresolved static snapshots.`);

    openPrintWindow(doc);
  } catch (error) {
    alert('ChatGPT PDF export: ' + error.message);
    console.error('ChatGPT PDF export failed:', error);
  } finally {
    progress?.remove();
    window.__chatPdfExportRunning = false;
  }
})();
