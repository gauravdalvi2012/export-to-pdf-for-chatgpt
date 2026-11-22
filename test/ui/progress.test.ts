import { describe, it, expect } from 'vitest';
import { createProgressIndicator } from '../../src/ui/progress.js';

describe('Progress indicator HUD', () => {
  it('creates an isolated shadow DOM progress indicator', () => {
    const indicator = createProgressIndicator();
    expect(indicator.progressHost).toBeDefined();
    expect(indicator.progressHost.id).toBe('chatpdf-export-progress');

    // Update progress
    indicator.showProgress('Scanning messages', 0.5, '5 turns detected');

    // Remove
    indicator.remove();
    expect(document.getElementById('chatpdf-export-progress')).toBeNull();
  });

  it('handles cancellation checks without throwing when active', () => {
    const indicator = createProgressIndicator();
    expect(() => indicator.checkCancelled()).not.toThrow();
    indicator.remove();
  });
});
