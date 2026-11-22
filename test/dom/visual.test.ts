import { describe, it, expect } from 'vitest';
import {
  isDownloadLabel,
  markChatOnlyLink,
  copyMediaDimensions,
  normalizeTableHeader,
  addVisualLayout,
  hasVisualBox,
  preserveVisualBox
} from '../../src/dom/visual.js';

describe('Visual & Download label utilities', () => {
  describe('isDownloadLabel', () => {
    it('detects download and view actions with filenames and types', () => {
      expect(isDownloadLabel('Download data.xlsx')).toBe(true);
      expect(isDownloadLabel('View PDF report.pdf')).toBe(true);
      expect(isDownloadLabel('Open file (zip)')).toBe(true);
      expect(isDownloadLabel('Download archive.zip')).toBe(true);
    });

    it('rejects internal browser navigation URLs and ordinary labels', () => {
      expect(isDownloadLabel('chrome://extensions')).toBe(false);
      expect(isDownloadLabel('brave://settings')).toBe(false);
      expect(isDownloadLabel('Click here to submit')).toBe(false);
    });
  });

  describe('markChatOnlyLink', () => {
    it('removes href and sets chat-only-download class and title', () => {
      const link = document.createElement('a');
      link.href = 'https://chatgpt.com/download/file';
      markChatOnlyLink(link);

      expect(link.hasAttribute('href')).toBe(false);
      expect(link.classList.contains('chat-only-download')).toBe(true);
      expect(link.getAttribute('title')).toBe(
        'Available in the original ChatGPT conversation'
      );
    });
  });

  describe('copyMediaDimensions', () => {
    it('adds export-image class and constrains width', () => {
      const img = document.createElement('img');
      img.setAttribute('width', '800');
      img.setAttribute('height', '600');

      const out = document.createElement('img');
      copyMediaDimensions(img, out, 'IMG');

      expect(out.classList.contains('export-image')).toBe(true);
      expect(out.style.width).toBe('760px');
    });
  });

  describe('addVisualLayout', () => {
    it('adds visual grid class when container displays grid with media children', () => {
      const container = document.createElement('div');
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '1fr 1fr';

      const child1 = document.createElement('img');
      const child2 = document.createElement('img');
      container.appendChild(child1);
      container.appendChild(child2);
      document.body.appendChild(container);

      const out = document.createElement('div');
      addVisualLayout(container, out);

      expect(out.classList.contains('export-visual-grid')).toBe(true);
      container.remove();
    });
  });

  describe('hasVisualBox and preserveVisualBox', () => {
    it('detects styled visual box and copies styles', () => {
      const parent = document.createElement('div');
      const box = document.createElement('div');
      box.style.backgroundColor = 'rgb(255, 0, 0)';
      box.style.borderRadius = '8px';
      box.getBoundingClientRect = () => ({
        width: 100,
        height: 50,
        top: 0,
        left: 0,
        bottom: 50,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => {}
      });
      parent.appendChild(box);
      document.body.appendChild(parent);

      expect(hasVisualBox(box)).toBe(true);

      const out = document.createElement('div');
      preserveVisualBox(box, out);
      expect(out.classList.contains('export-color-block')).toBe(true);
      expect(out.style.backgroundColor).toBe('rgb(255, 0, 0)');
      expect(out.style.borderRadius).toBe('8px');
    });
  });

  describe('normalizeTableHeader', () => {
    it('creates a thead element from the first row of tbody if missing', () => {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      const trHeader = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = 'Header Title';
      trHeader.appendChild(th);
      tbody.appendChild(trHeader);
      table.appendChild(tbody);

      normalizeTableHeader(table, document);
      expect(table.querySelector('thead')).not.toBeNull();
      expect(table.querySelector('thead th')?.textContent).toBe('Header Title');
    });
  });
});
