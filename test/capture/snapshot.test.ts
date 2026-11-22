import { describe, it, expect, vi } from 'vitest';
import { createSnapshotManager } from '../../src/capture/snapshot.js';

describe('Snapshot manager', () => {
  it('creates an instance with empty cache and zero count', () => {
    const scrollHost = document.createElement('div');
    const scanStats = { visualCandidates: 0, visualSnapshots: 0 };
    const manager = createSnapshotManager({
      scrollHost,
      checkCancelled: vi.fn(),
      waitForSettled: vi.fn().mockResolvedValue(true),
      scanStats
    });

    expect(manager.getSnapshotCount()).toBe(0);
    expect(manager.pendingVisuals.size).toBe(0);
    expect(manager.snapshotCache).toBeDefined();
  });

  it('scans elements and detects snapshot candidates', async () => {
    const scrollHost = document.createElement('div');
    const scanStats = { visualCandidates: 0, visualSnapshots: 0 };
    const manager = createSnapshotManager({
      scrollHost,
      checkCancelled: vi.fn(),
      waitForSettled: vi.fn().mockResolvedValue(true),
      scanStats
    });

    const root = document.createElement('div');
    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container recharts-wrapper';
    chartDiv.setAttribute('role', 'region');
    // Mock getBoundingClientRect
    chartDiv.getBoundingClientRect = () => ({
      width: 400,
      height: 300,
      top: 10,
      left: 10,
      bottom: 310,
      right: 410,
      x: 10,
      y: 10,
      toJSON: () => {}
    });

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    canvas.toDataURL = () => 'data:image/png;base64,mockCanvasData';
    chartDiv.appendChild(canvas);
    root.appendChild(chartDiv);

    await manager.prepareVisualSnapshots(root);

    expect(scanStats.visualCandidates).toBeGreaterThan(0);
  });

  it('captures candidate snapshot when chrome.runtime.sendMessage succeeds', async () => {
    const scrollHost = document.createElement('div');
    scrollHost.getBoundingClientRect = () => ({
      width: 1000,
      height: 800,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1000,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const scanStats = { visualCandidates: 0, visualSnapshots: 0 };
    const manager = createSnapshotManager({
      scrollHost,
      checkCancelled: vi.fn(),
      waitForSettled: vi.fn().mockResolvedValue(true),
      scanStats
    });

    const root = document.createElement('div');
    const chart = document.createElement('figure');
    chart.className = 'recharts-wrapper';
    chart.setAttribute('role', 'img');
    chart.getBoundingClientRect = () => ({
      width: 500,
      height: 300,
      top: 50,
      left: 50,
      bottom: 350,
      right: 550,
      x: 50,
      y: 50,
      toJSON: () => {}
    });

    const canvas = document.createElement('canvas');
    chart.appendChild(canvas);
    root.appendChild(chart);
    document.body.appendChild(root);

    // Mock chrome.runtime
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          dataUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
      }
    };

    await manager.prepareVisualSnapshots(root);
    root.remove();
  });
});
