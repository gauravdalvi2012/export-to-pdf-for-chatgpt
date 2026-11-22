import { describe, it, expect, vi } from 'vitest';
import { createConversationScanner } from '../../src/scanner/scroller.js';

describe('Conversation scanner', () => {
  it('generates viewport signature and tracks pending images', () => {
    const scrollHost = document.createElement('div');
    scrollHost.getBoundingClientRect = () => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const turn = document.createElement('div');
    turn.setAttribute('data-turn-key', 'turn-1');
    turn.textContent = 'Hello world from ChatGPT';
    turn.getBoundingClientRect = () => ({
      width: 800,
      height: 100,
      top: 50,
      left: 0,
      bottom: 150,
      right: 800,
      x: 0,
      y: 50,
      toJSON: () => {}
    });

    const img = document.createElement('img');
    Object.defineProperty(img, 'complete', { value: false });
    turn.appendChild(img);
    scrollHost.appendChild(turn);

    const scanStats = {
      steps: 0,
      slowSteps: 0,
      topReached: false,
      bottomReached: false
    };

    const scanner = createConversationScanner({
      scrollHost,
      scanStats,
      checkCancelled: vi.fn(),
      showProgress: vi.fn(),
      scanSummary: () => '1 turn',
      collectVisibleMessages: vi.fn().mockResolvedValue(undefined)
    });

    const signature = scanner.viewportSignature();
    expect(signature.pendingImages).toBe(1);
    expect(signature.value).toContain('turn-1');
  });

  it('runs a complete scan from top to bottom', async () => {
    const scrollHost = document.createElement('div');
    Object.defineProperty(scrollHost, 'clientHeight', {
      value: 500,
      configurable: true
    });
    Object.defineProperty(scrollHost, 'scrollHeight', {
      value: 500,
      configurable: true
    });
    scrollHost.scrollTop = 0;
    scrollHost.getBoundingClientRect = () => ({
      width: 800,
      height: 500,
      top: 0,
      left: 0,
      bottom: 500,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const scanStats = {
      steps: 0,
      slowSteps: 0,
      topReached: false,
      bottomReached: false
    };

    const scanner = createConversationScanner({
      scrollHost,
      scanStats,
      checkCancelled: vi.fn(),
      showProgress: vi.fn(),
      scanSummary: () => '1 message',
      collectVisibleMessages: vi.fn().mockResolvedValue(undefined)
    });

    const warnings = await scanner.scan();
    expect(scanStats.topReached).toBe(true);
    expect(Array.isArray(warnings)).toBe(true);
  });
});
