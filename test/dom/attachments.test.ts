import { describe, it, expect } from 'vitest';
import {
  extractNames,
  attachmentPill,
  extractAttachments,
  isUserAttachmentShell
} from '../../src/dom/attachments.js';

describe('Attachment badge extraction', () => {
  describe('extractNames', () => {
    it('extracts single and multi-line file names', () => {
      expect(extractNames('my_report.pdf')).toEqual(['my_report.pdf']);
      expect(extractNames('DOWNLOAD FILE quarterly_analysis.xlsx')).toEqual(['quarterly_analysis.xlsx']);
      expect(extractNames('PDF\nproject_spec_v2.pdf')).toEqual(['project_spec_v2.pdf']);
      expect(extractNames('backup.zip\nimage.png\nnotes.txt')).toEqual(['backup.zip', 'image.png', 'notes.txt']);
    });

    it('ignores non-filename text and overly long strings', () => {
      expect(extractNames('Just some normal text without file extensions')).toEqual([]);
      expect(extractNames('a'.repeat(300) + '.pdf')).toEqual([]);
    });
  });

  describe('attachmentPill', () => {
    it('creates a formatted attachment pill element', () => {
      const pill = attachmentPill(document, 'research.pdf', 'PDF');
      expect(pill.className).toBe('attachment-pill');
      expect(pill.querySelector('.attachment-type')?.textContent).toBe('PDF');
      expect(pill.textContent).toContain('research.pdf');
    });
  });

  describe('isUserAttachmentShell', () => {
    it('identifies attachment shells and rejects user message containers', () => {
      const shell = document.createElement('div');
      shell.className = 'uploaded-file-card';
      shell.textContent = 'document.pdf';
      expect(isUserAttachmentShell(shell)).toBe(true);

      const userBubble = document.createElement('div');
      userBubble.className = 'bg-user-message';
      expect(isUserAttachmentShell(userBubble)).toBe(false);
    });
  });

  describe('extractAttachments', () => {
    it('extracts explicit user file attachment cards into attachment pills', () => {
      const turn = document.createElement('div');
      turn.setAttribute('data-turn-key', 'turn-1');

      const user = document.createElement('div');
      user.className = 'group/user-message';

      const fileCard = document.createElement('div');
      fileCard.className = 'uploaded-file-tile';
      fileCard.setAttribute('data-filename', 'financials.pdf');
      fileCard.textContent = 'PDF financials.pdf';

      const userText = document.createElement('p');
      userText.textContent = 'Please analyze these numbers.';

      user.append(fileCard, userText);
      turn.appendChild(user);

      const userAttachmentNodes = new Set<Element>();
      const result = extractAttachments(document, turn, user, user, [], userAttachmentNodes);

      expect(result.className).toBe('message-attachments');
      const pills = result.querySelectorAll('.attachment-pill');
      expect(pills.length).toBe(1);
      expect(pills[0].textContent).toContain('financials.pdf');
      expect(userAttachmentNodes.has(fileCard)).toBe(true);
    });

    it('does NOT capture external prose links to PDF files as uploaded attachments', () => {
      const turn = document.createElement('div');
      turn.setAttribute('data-turn-key', 'turn-2');

      const user = document.createElement('div');
      user.className = 'group/user-message';

      const p = document.createElement('p');
      p.className = 'markdown';
      const link = document.createElement('a');
      link.href = 'https://example.com/whitepaper.pdf';
      link.textContent = 'Read the whitepaper at https://example.com/whitepaper.pdf';
      p.appendChild(link);
      user.appendChild(p);
      turn.appendChild(user);

      const userAttachmentNodes = new Set<Element>();
      const result = extractAttachments(document, turn, user, user, [], userAttachmentNodes);

      expect(result.querySelectorAll('.attachment-pill').length).toBe(0);
      expect(userAttachmentNodes.size).toBe(0);
    });

    it('creates Image attachment pills for user-uploaded images', () => {
      const turn = document.createElement('div');
      const user = document.createElement('div');
      user.className = 'group/user-message';

      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'image-preview';
      imgWrapper.setAttribute('data-filename', 'screenshot.png');
      const img = document.createElement('img');
      img.setAttribute('alt', 'screenshot.png');
      Object.defineProperty(img, 'naturalWidth', { value: 600 });
      Object.defineProperty(img, 'naturalHeight', { value: 400 });
      imgWrapper.appendChild(img);
      user.appendChild(imgWrapper);
      turn.appendChild(user);

      const userAttachmentNodes = new Set<Element>();
      const result = extractAttachments(document, turn, user, user, [], userAttachmentNodes);

      const pills = result.querySelectorAll('.attachment-pill');
      expect(pills.length).toBe(1);
      expect(pills[0].textContent).toContain('screenshot.png');
    });

    it('falls back to "Image attachment" when user-uploaded image has no filename', () => {
      const turn = document.createElement('div');
      const user = document.createElement('div');
      user.className = 'group/user-message';

      const img = document.createElement('img');
      Object.defineProperty(img, 'naturalWidth', { value: 600 });
      Object.defineProperty(img, 'naturalHeight', { value: 400 });
      user.appendChild(img);
      turn.appendChild(user);

      const userAttachmentNodes = new Set<Element>();
      const result = extractAttachments(document, turn, user, user, [], userAttachmentNodes);

      const pills = result.querySelectorAll('.attachment-pill');
      expect(pills.length).toBe(1);
      expect(pills[0].textContent).toContain('Image attachment');
    });
  });
});
