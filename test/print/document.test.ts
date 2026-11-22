import { describe, it, expect, vi } from 'vitest';
import {
  isTransientProgress,
  assembleDocument,
  openPrintWindow
} from '../../src/print/document.js';
import { defaults } from '../../src/config.js';

describe('Document assembly & Transient progress detection', () => {
  describe('isTransientProgress', () => {
    it('detects intermediate status updates when followed by another assistant message', () => {
      const item = document.createElement('div');
      item.className = 'message assistant';
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = "I'll update the configuration and run the tests.";
      item.appendChild(content);

      const next = document.createElement('div');
      next.className = 'message assistant';

      expect(isTransientProgress(item, next, false)).toBe(true);
    });

    it('does not filter messages if includeProgress is true or no next assistant message follows', () => {
      const item = document.createElement('div');
      item.className = 'message assistant';
      const content = document.createElement('div');
      content.className = 'message-content';
      content.textContent = "I'll update the configuration.";
      item.appendChild(content);

      const next = document.createElement('div');
      next.className = 'message assistant';

      expect(isTransientProgress(item, next, true)).toBe(false);
      expect(isTransientProgress(item, null, false)).toBe(false);
    });
  });

  describe('assembleDocument', () => {
    it('constructs a complete print document with header, metadata and transcript', () => {
      const doc = document.implementation.createHTMLDocument('Test Print');
      const section1 = doc.createElement('section');
      section1.className = 'message user';
      section1.textContent = 'Hello ChatGPT';

      const section2 = doc.createElement('section');
      section2.className = 'message assistant';
      section2.textContent = 'Hello! How can I assist you today?';

      assembleDocument({
        doc,
        title: 'Project Discussion',
        sourceURL: 'https://chatgpt.com/c/12345',
        exportDate: 'Nov 22, 2026',
        opts: defaults,
        transcript: [section1, section2],
        scanWarnings: []
      });

      expect(doc.head.querySelector('style')).not.toBeNull();
      expect(doc.body.querySelector('header.doc-header h1')?.textContent).toBe(
        'Project Discussion'
      );
      expect(
        doc.body.querySelector('header.doc-header .doc-meta')?.textContent
      ).toContain('Nov 22, 2026');
      expect(doc.body.querySelectorAll('.message').length).toBe(2);
    });

    it('renders scan warnings when present', () => {
      const doc = document.implementation.createHTMLDocument('Warning Test');
      assembleDocument({
        doc,
        title: 'Warning Title',
        sourceURL: 'https://chatgpt.com/c/12345',
        exportDate: 'Nov 22, 2026',
        opts: defaults,
        transcript: [],
        scanWarnings: ['Beginning not reached.']
      });

      const warning = doc.body.querySelector('.export-scan-warning');
      expect(warning).not.toBeNull();
      expect(warning?.textContent).toContain('Beginning not reached.');
    });
  });

  describe('openPrintWindow', () => {
    it('throws error when popup is blocked', () => {
      const doc = document.implementation.createHTMLDocument('Print Blocked');
      vi.spyOn(window, 'open').mockReturnValue(null);

      expect(() => openPrintWindow(doc)).toThrow(
        'Allow pop-ups for chatgpt.com to print the conversation.'
      );
    });

    it('opens print window and attaches load event listener', () => {
      const doc = document.implementation.createHTMLDocument('Print Success');
      const addEventListener = vi.fn();
      const mockWin = {
        addEventListener,
        document: { images: [] },
        focus: vi.fn(),
        print: vi.fn()
      } as unknown as Window;

      vi.spyOn(window, 'open').mockReturnValue(mockWin);

      openPrintWindow(doc);
      expect(window.open).toHaveBeenCalled();
      expect(addEventListener).toHaveBeenCalledWith(
        'load',
        expect.any(Function),
        {
          once: true
        }
      );
    });
  });
});
