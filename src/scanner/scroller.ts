import { sleep, afterPaint } from '../utils.js';

export interface ScannerScanStats {
  steps: number;
  slowSteps: number;
  topReached: boolean;
  bottomReached: boolean;
  [key: string]: unknown;
}

export interface ConversationScannerOptions {
  scrollHost: HTMLElement;
  scanStats: ScannerScanStats;
  checkCancelled: () => void;
  showProgress: (label: string, fraction: number, description?: string) => void;
  scanSummary: () => string;
  collectVisibleMessages: () => Promise<void>;
  pendingVisuals?: Set<string>;
}

export function createConversationScanner({
  scrollHost,
  scanStats,
  checkCancelled,
  showProgress,
  scanSummary,
  collectVisibleMessages,
  pendingVisuals
}: ConversationScannerOptions) {
  function viewportSignature() {
    const hostRect = scrollHost.getBoundingClientRect();
    const visible: string[] = [];
    let pendingImages = 0;
    for (const turn of Array.from(scrollHost.querySelectorAll('[data-turn-key]'))) {
      const r = turn.getBoundingClientRect();
      if (r.bottom < hostRect.top - 2 || r.top > hostRect.bottom + 2) continue;
      const key = turn.getAttribute('data-turn-key') || '';
      const turnText = turn.textContent || '';
      const textLength = turnText.length;
      let images = 0;
      for (const img of Array.from(turn.querySelectorAll('img'))) {
        images++;
        if (!img.complete) pendingImages++;
      }
      visible.push(`${key}:${textLength}:${images}:${turnText.slice(0, 32)}:${turnText.slice(-32)}`);
    }
    return {
      value: `${scrollHost.scrollHeight}|${visible.join('|')}|pending=${pendingImages}`,
      pendingImages
    };
  }

  async function waitForSettled({ minimum = 450, maximum = 3000 } = {}): Promise<boolean> {
    // Dynamic content, lazy images, and virtualized turns can settle later than
    // an arbitrary 120 ms timer. Require multiple unchanged samples.
    const began = performance.now();
    let previous = '';
    let quiet = 0;
    while (performance.now() - began < maximum) {
      checkCancelled();
      await sleep(145);
      const observed = viewportSignature();
      quiet = observed.value === previous ? quiet + 1 : 0;
      previous = observed.value;
      const elapsed = performance.now() - began;
      if (elapsed >= minimum && quiet >= 2 &&
         (observed.pendingImages === 0 || elapsed >= 1350)) {
        // An image may never load. Avoid imposing a multi-second penalty on
        // every overlapping scroll window when its DOM is already steady.
        await afterPaint();
        return observed.pendingImages === 0;
      }
    }
    scanStats.slowSteps++;
    await afterPaint();
    return false;
  }

  async function scan(): Promise<string[]> {
    // Deliberately overlap scan windows to avoid skipping short virtualized
    // turns. Stabilize DOM content BEFORE copying each newly visible window.
    const originalTop = scrollHost.scrollTop;
    const scanWarnings: string[] = [];
    try {
      showProgress('Moving to the start of the conversation', 0, scanSummary());
      for (let retry = 0; retry < 6; retry++) {
        checkCancelled();
        scrollHost.scrollTop = 0;
        await waitForSettled({ minimum: 500, maximum: 2700 });
        if (scrollHost.scrollTop <= 2) {
          scanStats.topReached = true;
          break;
        }
      }
      await collectVisibleMessages();
      const scanStep = Math.max(180, Math.min(520, Math.floor(scrollHost.clientHeight * 0.5)));
      let unchangedBottom = 0;
      let previousBottomSignature = '';
      for (let i = 0; i < 750; i++) {
        checkCancelled();
        scanStats.steps++;
        const maxTop = Math.max(0, scrollHost.scrollHeight - scrollHost.clientHeight);
        const next = Math.min(maxTop, scrollHost.scrollTop + scanStep);
        scrollHost.scrollTop = next;
        await waitForSettled({ minimum: 480, maximum: 2800 });
        await collectVisibleMessages();
        const atBottom = scrollHost.scrollTop + scrollHost.clientHeight >= scrollHost.scrollHeight - 3;
        const bottomSignature = `${scrollHost.scrollHeight}:${scrollHost.scrollTop}:${scanSummary()}`;
        unchangedBottom = atBottom && bottomSignature === previousBottomSignature ? unchangedBottom + 1 : 0;
        previousBottomSignature = bottomSignature;
        const position = scrollHost.scrollTop / Math.max(1, scrollHost.scrollHeight - scrollHost.clientHeight);
        showProgress('Scanning conversation · scroll position ' + Math.round(position * 100) + '%',
          Math.min(.9, position * .9), scanSummary());
        if (unchangedBottom >= 3) {
          scanStats.bottomReached = true;
          break;
        }
        // The bottom is where ChatGPT may render its newest lazy-loaded turns.
        // Check more than once instead of ending on first contact.
      }
      if (!scanStats.topReached) scanWarnings.push('The beginning of the conversation could not be confirmed.');
      if (!scanStats.bottomReached) scanWarnings.push('The end of the conversation could not be confirmed.');
      showProgress('Finishing transcript capture', .94, scanSummary());
      await waitForSettled({ minimum: 550, maximum: 2300 });
      await collectVisibleMessages();
      if (pendingVisuals?.size) {
        scanWarnings.push(`${pendingVisuals.size} visual component(s) used the HTML fallback; static snapshot unavailable.`);
      }
    } finally {
      scrollHost.scrollTop = originalTop;
    }
    return scanWarnings;
  }

  return {
    viewportSignature,
    waitForSettled,
    scan
  };
}
