import { describe, it, expect } from 'vitest';
import { computePageWindow } from './compute-page-window.js';
import { PX } from './test-utils.js';

describe('computePageWindow', () => {
  it('calculates printable and content heights within page bounds', () => {
    const window = computePageWindow({
      pageHeightPx: 10 * PX,
      topMarginPx: PX,
      bottomMarginPx: PX,
    });

    expect(window).toEqual({
      safeTopMargin: PX,
      safeBottomMargin: PX,
      printableHeightPx: 8 * PX,
      contentHeightPx: 8 * PX,
      allowancePx: expect.any(Number),
    });
    expect(window.allowancePx).toBeLessThanOrEqual(window.contentHeightPx);
  });

  it('clamps negative inputs to zero', () => {
    const window = computePageWindow({ pageHeightPx: -10, topMarginPx: -20, bottomMarginPx: -30 });
    expect(window).toEqual({
      safeTopMargin: 0,
      safeBottomMargin: 0,
      printableHeightPx: 0,
      contentHeightPx: 0,
      allowancePx: 0,
    });
  });
});
