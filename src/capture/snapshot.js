import { sleep, afterPaint } from '../utils.js';

export function createSnapshotManager({
  scrollHost,
  getProgressHost,
  checkCancelled,
  waitForSettled,
  scanStats
}) {
  const snapshotCache = new WeakMap();
  const pendingVisuals = new Set();
  let lastCaptureAt = 0;
  let snapshotCount = 0;

  // A color/chart component is not guaranteed to contain an <img> or <svg>.
  // Detect only bounded, visually meaningful containers; never screenshot the
  // full assistant answer, which would destroy selectable/searchable text.
  function colorfulDescendant(element) {
    const descendants = [element, ...Array.from(element.querySelectorAll('*')).slice(0, 36)];
    return descendants.some(child => {
      if (child.tagName === 'IMG' || child.tagName === 'CANVAS' || child.tagName === 'SVG') return true;
      const r = child.getBoundingClientRect();
      if (r.width < 12 || r.height < 8) return false;
      const st = getComputedStyle(child);
      const parentBg = child.parentElement ? getComputedStyle(child.parentElement).backgroundColor : '';
      return st.backgroundImage !== 'none' ||
        (st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'transparent' && st.backgroundColor !== parentBg);
    });
  }

  function isSnapshotCandidate(element, root) {
    if (element === root || !['DIV','SECTION','FIGURE'].includes(element.tagName)) return false;
    if (element.closest('.group\\/user-message, .turn-action-controls')) return false;
    if (element.querySelector('table, pre, textarea, input')) return false;
    // Native images/SVGs retain better quality when copied directly. Only
    // rasterize unsupported CSS/canvas-based visuals.
    if (element.querySelector('img, svg') && !element.querySelector('canvas')) return false;
    const r = element.getBoundingClientRect();
    if (r.width < 70 || r.height < 35 || r.width > 1300 || r.height > 950) return false;
    if ((element.innerText || '').length > 1700) return false;
    const hint = [element.className, element.getAttribute('data-testid'),
      element.getAttribute('role'), element.getAttribute('aria-label')]
      .filter(v => typeof v === 'string').join(' ');
    const specialized = /(?:chart|plot|graph|diagram|visuali[sz]|recharts|highcharts|plotly|echarts|map-widget|flowchart|app-block|static-visual|custom-widget)/i.test(hint);
    const style = getComputedStyle(element);
    const children = Array.from(element.children);
    const gallery = children.length >= 2 && children.length <= 5 &&
      (style.display.includes('grid') || (style.display.includes('flex') && style.flexDirection === 'row')) &&
      children.filter(child => colorfulDescendant(child)).length >= 2 &&
      r.height < 480 && (element.innerText || '').length < 480;
    return (specialized && colorfulDescendant(element)) || gallery;
  }

  // Capture only a visible, bounded assistant widget through Chrome's
  // activeTab screenshot permission and crop to its DOM rectangle. This
  // avoids tainted canvases from SVG foreignObject and works with CSS-only
  // visualizations. Widgets outside the viewport keep their HTML fallback.
  async function snapshotElement(element) {
    const viewportW = document.documentElement.clientWidth;
    const viewportH = window.innerHeight;
    const hostRect = scrollHost.getBoundingClientRect();
    const previousTop = scrollHost.scrollTop;
    let rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10 || rect.width * rect.height > 850000 ||
        rect.height > hostRect.height-8 || !chrome.runtime?.sendMessage) return null;
    const progressHost = getProgressHost?.();
    try {
      // A virtualized turn may be rendered but partly clipped by the
      // transcript's scroll host. Center the widget just for its capture.
      if (rect.top < hostRect.top+2 || rect.bottom > hostRect.bottom-2) {
        scrollHost.scrollTop += rect.top - hostRect.top - (hostRect.height-rect.height)/2;
        await waitForSettled({minimum:400,maximum:1800});
        rect = element.getBoundingClientRect();
      }
      if (!element.isConnected || rect.left < 0 || rect.top < hostRect.top-2 ||
          rect.right > viewportW || rect.bottom > hostRect.bottom+2 ||
          rect.bottom > viewportH) return null;
      // Never paint the export-progress overlay into the widget snapshot.
      if (progressHost) progressHost.style.visibility = 'hidden';
      await afterPaint();
      // Chrome rate-limits activeTab screenshots; never burst several captures.
      const remaining = Math.max(0, 650 - (performance.now() - lastCaptureAt));
      if (remaining) await sleep(remaining);
      checkCancelled();
      lastCaptureAt = performance.now();
      const response = await chrome.runtime.sendMessage({type: 'CHAT_PDF_CAPTURE_WIDGET'});
      if (!response?.dataUrl) return null;
      const screenshot = new Image();
      await new Promise((resolve, reject) => {
        screenshot.onload = resolve;
        screenshot.onerror = reject;
        screenshot.src = response.dataUrl;
      });
      const scaleX = screenshot.naturalWidth / window.innerWidth;
      const scaleY = screenshot.naturalHeight / window.innerHeight;
      const crop = document.createElement('canvas');
      crop.width = Math.max(1, Math.round(rect.width * scaleX));
      crop.height = Math.max(1, Math.round(rect.height * scaleY));
      const ctx = crop.getContext('2d');
      ctx.drawImage(screenshot, Math.round(rect.x * scaleX), Math.round(rect.y * scaleY),
        crop.width, crop.height, 0, 0, crop.width, crop.height);
      return crop.toDataURL('image/png');
    } catch (error) {
      console.debug('ChatGPT PDF: static widget capture unavailable; preserving HTML.', error);
      return null;
    } finally {
      scrollHost.scrollTop = previousTop;
      if (progressHost) progressHost.style.visibility = 'visible';
    }
  }

  async function prepareVisualSnapshots(root) {
    const all = [...root.querySelectorAll('div,section,figure')];
    const selected = [];
    for (const element of all) {
      if (!isSnapshotCandidate(element, root) || selected.some(parent => parent.contains(element))) continue;
      selected.push(element);
      if (selected.length >= 12) break;
    }
    for (let index = 0; index < selected.length; index++) {
      const element = selected[index];
      if (snapshotCache.has(element)) continue;
      checkCancelled();
      const turnKey = element.closest('[data-turn-key]')?.getAttribute('data-turn-key') || 'unknown';
      const visualKey = `${turnKey}:${index}:${(element.textContent || '').slice(0, 90)}`;
      scanStats.visualCandidates++;
      if (snapshotCount >= 90) {
        pendingVisuals.add(visualKey);
        continue;
      }
      const image = await snapshotElement(element);
      if (image) {
        snapshotCache.set(element, image);
        snapshotCount++;
        scanStats.visualSnapshots++;
        pendingVisuals.delete(visualKey);
      } else {
        pendingVisuals.add(visualKey);
      }
    }
  }

  return {
    snapshotCache,
    pendingVisuals,
    getSnapshotCount: () => snapshotCount,
    prepareVisualSnapshots
  };
}
