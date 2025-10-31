import { describe, it, expect } from 'vitest';
import { computePageWindow } from './compute-page-window.js';
import { PX } from './test-utils.js';
import {
  CONTENT_HEIGHT_ALLOWANCE_IN_PX,
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
} from '../../core/constants.js';

describe('computePageWindow', () => {
  describe('basic functionality', () => {
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

    it('returns correct structure with all required properties', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window).toHaveProperty('safeTopMargin');
      expect(window).toHaveProperty('safeBottomMargin');
      expect(window).toHaveProperty('printableHeightPx');
      expect(window).toHaveProperty('contentHeightPx');
      expect(window).toHaveProperty('allowancePx');
    });

    it('contentHeightPx equals printableHeightPx', () => {
      const window = computePageWindow({
        pageHeightPx: 200,
        topMarginPx: 20,
        bottomMarginPx: 30,
      });

      expect(window.contentHeightPx).toBe(window.printableHeightPx);
      expect(window.printableHeightPx).toBe(150); // 200 - 20 - 30
    });
  });

  describe('negative value handling', () => {
    it('clamps all negative inputs to zero', () => {
      const window = computePageWindow({ pageHeightPx: -10, topMarginPx: -20, bottomMarginPx: -30 });
      expect(window).toEqual({
        safeTopMargin: 0,
        safeBottomMargin: 0,
        printableHeightPx: 0,
        contentHeightPx: 0,
        allowancePx: 0,
      });
    });

    it('clamps negative page height to zero', () => {
      const window = computePageWindow({
        pageHeightPx: -100,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.safeTopMargin).toBe(10);
      expect(window.safeBottomMargin).toBe(10);
      expect(window.printableHeightPx).toBe(0);
    });

    it('clamps negative top margin to zero', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: -10,
        bottomMarginPx: 10,
      });

      expect(window.safeTopMargin).toBe(0);
      expect(window.printableHeightPx).toBe(90); // 100 - 0 - 10
    });

    it('clamps negative bottom margin to zero', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 10,
        bottomMarginPx: -10,
      });

      expect(window.safeBottomMargin).toBe(0);
      expect(window.printableHeightPx).toBe(90); // 100 - 10 - 0
    });
  });

  describe('default value handling', () => {
    it('uses default page height when pageHeightPx is null', () => {
      const window = computePageWindow({
        pageHeightPx: null,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(DEFAULT_PAGE_HEIGHT_IN_PX - 20);
    });

    it('uses default page height when pageHeightPx is undefined', () => {
      const window = computePageWindow({
        pageHeightPx: undefined,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(DEFAULT_PAGE_HEIGHT_IN_PX - 20);
    });

    it('uses default top margin when topMarginPx is null', () => {
      const window = computePageWindow({
        pageHeightPx: 1000,
        topMarginPx: null,
        bottomMarginPx: 10,
      });

      expect(window.safeTopMargin).toBe(DEFAULT_PAGE_MARGINS_IN_PX.top);
      expect(window.printableHeightPx).toBe(1000 - DEFAULT_PAGE_MARGINS_IN_PX.top - 10);
    });

    it('uses default bottom margin when bottomMarginPx is null', () => {
      const window = computePageWindow({
        pageHeightPx: 1000,
        topMarginPx: 10,
        bottomMarginPx: null,
      });

      expect(window.safeBottomMargin).toBe(DEFAULT_PAGE_MARGINS_IN_PX.bottom);
      expect(window.printableHeightPx).toBe(1000 - 10 - DEFAULT_PAGE_MARGINS_IN_PX.bottom);
    });

    it('uses all defaults when all parameters are null', () => {
      const window = computePageWindow({
        pageHeightPx: null,
        topMarginPx: null,
        bottomMarginPx: null,
      });

      expect(window.printableHeightPx).toBe(
        DEFAULT_PAGE_HEIGHT_IN_PX - DEFAULT_PAGE_MARGINS_IN_PX.top - DEFAULT_PAGE_MARGINS_IN_PX.bottom,
      );
    });

    it('uses all defaults when all parameters are undefined', () => {
      const window = computePageWindow({
        pageHeightPx: undefined,
        topMarginPx: undefined,
        bottomMarginPx: undefined,
      });

      expect(window.printableHeightPx).toBe(
        DEFAULT_PAGE_HEIGHT_IN_PX - DEFAULT_PAGE_MARGINS_IN_PX.top - DEFAULT_PAGE_MARGINS_IN_PX.bottom,
      );
    });
  });

  describe('zero value handling', () => {
    it('handles zero page height', () => {
      const window = computePageWindow({
        pageHeightPx: 0,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(0);
      expect(window.contentHeightPx).toBe(0);
      expect(window.allowancePx).toBe(0);
    });

    it('handles zero top margin', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 0,
        bottomMarginPx: 10,
      });

      expect(window.safeTopMargin).toBe(0);
      expect(window.printableHeightPx).toBe(90);
    });

    it('handles zero bottom margin', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 10,
        bottomMarginPx: 0,
      });

      expect(window.safeBottomMargin).toBe(0);
      expect(window.printableHeightPx).toBe(90);
    });

    it('handles all zero inputs', () => {
      const window = computePageWindow({
        pageHeightPx: 0,
        topMarginPx: 0,
        bottomMarginPx: 0,
      });

      expect(window).toEqual({
        safeTopMargin: 0,
        safeBottomMargin: 0,
        printableHeightPx: 0,
        contentHeightPx: 0,
        allowancePx: 0,
      });
    });
  });

  describe('margin edge cases', () => {
    it('handles margins equal to page height', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 50,
        bottomMarginPx: 50,
      });

      expect(window.printableHeightPx).toBe(0);
      expect(window.contentHeightPx).toBe(0);
      expect(window.allowancePx).toBe(0);
    });

    it('handles margins exceeding page height', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 60,
        bottomMarginPx: 60,
      });

      expect(window.printableHeightPx).toBe(0);
      expect(window.contentHeightPx).toBe(0);
      expect(window.allowancePx).toBe(0);
    });

    it('handles top margin exceeding page height', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 120,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(0);
      expect(window.contentHeightPx).toBe(0);
    });

    it('handles bottom margin exceeding remaining space', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 10,
        bottomMarginPx: 100,
      });

      expect(window.printableHeightPx).toBe(0);
    });
  });

  describe('fractional values', () => {
    it('handles fractional page height', () => {
      const window = computePageWindow({
        pageHeightPx: 100.5,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(80.5);
    });

    it('handles fractional margins', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 10.25,
        bottomMarginPx: 15.75,
      });

      expect(window.printableHeightPx).toBe(74);
    });

    it('handles all fractional values', () => {
      const window = computePageWindow({
        pageHeightPx: 100.8,
        topMarginPx: 10.3,
        bottomMarginPx: 15.2,
      });

      expect(window.printableHeightPx).toBeCloseTo(75.3, 10);
    });
  });

  describe('allowancePx calculation', () => {
    it('caps allowancePx at CONTENT_HEIGHT_ALLOWANCE_IN_PX when content is large', () => {
      const window = computePageWindow({
        pageHeightPx: 10000,
        topMarginPx: 100,
        bottomMarginPx: 100,
      });

      expect(window.allowancePx).toBe(CONTENT_HEIGHT_ALLOWANCE_IN_PX);
      expect(window.allowancePx).toBeLessThanOrEqual(window.contentHeightPx);
    });

    it('sets allowancePx to contentHeightPx when content is smaller than allowance', () => {
      const smallHeight = 50; // Assuming smaller than CONTENT_HEIGHT_ALLOWANCE_IN_PX
      const window = computePageWindow({
        pageHeightPx: smallHeight,
        topMarginPx: 0,
        bottomMarginPx: 0,
      });

      if (smallHeight < CONTENT_HEIGHT_ALLOWANCE_IN_PX) {
        expect(window.allowancePx).toBe(smallHeight);
      }
    });

    it('sets allowancePx to zero when no printable space', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 60,
        bottomMarginPx: 60,
      });

      expect(window.allowancePx).toBe(0);
    });

    it('allowancePx is never negative', () => {
      const window = computePageWindow({
        pageHeightPx: -100,
        topMarginPx: -50,
        bottomMarginPx: -50,
      });

      expect(window.allowancePx).toBeGreaterThanOrEqual(0);
    });
  });

  describe('non-finite value handling', () => {
    it('handles NaN pageHeightPx - propagates NaN', () => {
      const window = computePageWindow({
        pageHeightPx: NaN,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      // NaN is not null/undefined, so ?? doesn't trigger default
      // Math.max(0, NaN) returns NaN, which propagates through calculations
      expect(window.printableHeightPx).toBeNaN();
    });

    it('handles Infinity pageHeightPx', () => {
      const window = computePageWindow({
        pageHeightPx: Infinity,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(Infinity);
    });

    it('handles -Infinity pageHeightPx as zero', () => {
      const window = computePageWindow({
        pageHeightPx: -Infinity,
        topMarginPx: 10,
        bottomMarginPx: 10,
      });

      expect(window.printableHeightPx).toBe(0);
    });
  });

  describe('extreme values', () => {
    it('handles very large page height', () => {
      const window = computePageWindow({
        pageHeightPx: Number.MAX_SAFE_INTEGER,
        topMarginPx: 100,
        bottomMarginPx: 100,
      });

      expect(window.printableHeightPx).toBe(Number.MAX_SAFE_INTEGER - 200);
      expect(window.allowancePx).toBe(CONTENT_HEIGHT_ALLOWANCE_IN_PX);
    });

    it('handles very small fractional margins', () => {
      const window = computePageWindow({
        pageHeightPx: 100,
        topMarginPx: 0.001,
        bottomMarginPx: 0.001,
      });

      expect(window.printableHeightPx).toBeCloseTo(99.998, 3);
    });
  });
});
