import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./helpers/index.js', () => ({
  normalizeVerticalBounds: vi.fn((value, baseline) => value - baseline),
  isTableNode: vi.fn(),
  findBreakPosInTable: vi.fn(),
  isTableRowNode: vi.fn(),
  findBreakPosInTableRow: vi.fn(),
  findBreakPosInBlock: vi.fn(),
}));

vi.mock('../core/field-annotations-measurements/index.js', () => ({
  isHtmlFieldNode: vi.fn(),
}));

import {
  resolveBreakPos,
  getSafeBounds,
  createHtmlFieldBreakPoint,
  findOverflowBreakPoint,
  shouldUseForcedBreak,
  selectBreakPoint,
  ensureOverflowBlock,
  buildBoundaryInfo,
} from './page-breaks-helpers.js';
import {
  normalizeVerticalBounds,
  isTableNode,
  findBreakPosInTable,
  isTableRowNode,
  findBreakPosInTableRow,
  findBreakPosInBlock,
} from './helpers/index.js';
import { isHtmlFieldNode } from '../core/field-annotations-measurements/index.js';

describe('page-breaks helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveBreakPos', () => {
    it('returns the numeric pos when provided directly', () => {
      expect(resolveBreakPos({ pos: 42 })).toBe(42);
    });

    it('prefers the primary.pos when available', () => {
      expect(resolveBreakPos({ primary: { pos: 24 } })).toBe(24);
    });

    it('returns null when no position can be resolved', () => {
      expect(resolveBreakPos({})).toBeNull();
    });
  });

  describe('getSafeBounds', () => {
    it('normalizes top and bottom when overflow metadata is missing', () => {
      const bounds = getSafeBounds({}, 500);
      expect(bounds).toEqual({ top: 500, bottom: 500 });
    });

    it('clamps the bottom to the provided value when negative heights arise', () => {
      const bounds = getSafeBounds({ pageBottomLimitY: 200, pageBottomY: 100 }, 500);
      expect(bounds).toEqual({ top: 200, bottom: 200 });
    });
  });

  describe('createHtmlFieldBreakPoint', () => {
    it('returns null when the break position does not advance', () => {
      const result = createHtmlFieldBreakPoint(
        { pageBottomLimitY: 100, pageBottomY: 150 },
        10,
        { nodeSize: 0 },
        400,
        10,
        50,
      );
      expect(result).toBeNull();
    });

    it('builds a break point and clamps the rect when needed', () => {
      const result = createHtmlFieldBreakPoint(
        { pageBottomLimitY: 80, pageBottomY: 120, rect: { top: 70, bottom: 200, left: 1, right: 3 } },
        10,
        { nodeSize: 30 },
        400,
        5,
        100,
      );

      expect(result?.breakPoint).toEqual({ pos: 40, top: 80, bottom: 120 });
      expect(result?.overflowBlock).toEqual({
        node: { nodeSize: 30 },
        pos: 10,
        rect: { top: 70, bottom: 120, left: 1, right: 3, height: 50 },
      });
    });
  });

  describe('findOverflowBreakPoint', () => {
    const view = {};
    const limit = 500;

    it('returns empty result when overflow is not provided', () => {
      expect(findOverflowBreakPoint(view, null, limit, 0, 100)).toEqual({
        breakPoint: null,
        overflowBlock: null,
      });
    });

    it('delegates to html field handling when applicable', () => {
      isHtmlFieldNode.mockReturnValue(true);
      const overflow = {
        node: { nodeSize: 12 },
        pos: 5,
        pageBottomLimitY: 120,
        pageBottomY: 160,
      };

      const result = findOverflowBreakPoint(view, overflow, limit, 0, 100);

      expect(result.breakPoint?.pos).toBe(17);
      expect(result.overflowBlock?.node).toEqual(overflow.node);
      expect(isHtmlFieldNode).toHaveBeenCalledWith(overflow.node);
    });

    it('fallbacks to table helpers when not an html field', () => {
      isHtmlFieldNode.mockReturnValue(false);
      isTableNode.mockReturnValue(true);
      findBreakPosInTable.mockReturnValue({ pos: 60 });

      const overflow = { node: { type: { name: 'table' } }, pos: 20, rect: { top: 0, bottom: 10 } };
      const result = findOverflowBreakPoint(view, overflow, limit, 0, 100);

      expect(findBreakPosInTable).toHaveBeenCalled();
      expect(result.breakPoint).toEqual({ pos: 60 });
      expect(result.overflowBlock).toEqual({ node: overflow.node, pos: 20, rect: overflow.rect });
    });

    it('uses generic block helper when table helpers do not produce a break', () => {
      isHtmlFieldNode.mockReturnValue(false);
      isTableNode.mockReturnValue(false);
      isTableRowNode.mockReturnValue(false);
      findBreakPosInBlock.mockReturnValue({ pos: 45 });

      const overflow = { node: { type: { name: 'paragraph' } }, pos: 22, rect: null };
      const result = findOverflowBreakPoint(view, overflow, limit, 0, 100);

      expect(findBreakPosInBlock).toHaveBeenCalled();
      expect(result.breakPoint).toEqual({ pos: 45 });
    });
  });

  describe('shouldUseForcedBreak', () => {
    it('returns true when forced break is earlier or equal to natural break', () => {
      expect(shouldUseForcedBreak(30, 40, 10)).toBe(true);
      expect(shouldUseForcedBreak(30, null, 10)).toBe(true);
    });

    it('returns false when forced break is invalid or after natural break', () => {
      expect(shouldUseForcedBreak(null, 40, 10)).toBe(false);
      expect(shouldUseForcedBreak(5, 6, 10)).toBe(false);
      expect(shouldUseForcedBreak(50, 40, 10)).toBe(false);
    });
  });

  describe('selectBreakPoint', () => {
    it('prefers forced break data when instructed', () => {
      const forced = { breakPoint: { pos: 20 }, overflowBlock: { node: 'forced' } };
      const natural = { breakPoint: { pos: 30 }, overflowBlock: { node: 'natural' } };
      expect(selectBreakPoint(forced, natural, true)).toEqual({
        breakPoint: forced.breakPoint,
        overflowBlock: forced.overflowBlock,
      });
    });

    it('falls back to natural break when forced should not win', () => {
      const forced = { breakPoint: { pos: 20 }, overflowBlock: { node: 'forced' } };
      const natural = { breakPoint: { pos: 30 }, overflowBlock: { node: 'natural' } };
      expect(selectBreakPoint(forced, natural, false)).toEqual(natural);
    });
  });

  describe('ensureOverflowBlock', () => {
    it('returns the existing overflow block when present', () => {
      const overflow = { pos: 10 };
      expect(ensureOverflowBlock(overflow, { pos: 20 }, null, 0)).toBe(overflow);
    });

    it('creates a fallback overflow block when needed', () => {
      const fallback = ensureOverflowBlock(
        null,
        { pos: 50 },
        { node: { type: { name: 'hardBreak' } }, pos: 40, rect: { top: 0, bottom: 10 } },
        10,
      );
      expect(fallback).toEqual({
        node: { type: { name: 'hardBreak' } },
        pos: 40,
        rect: { top: 0, bottom: 10 },
      });
    });
  });

  describe('buildBoundaryInfo', () => {
    it('normalizes vertical bounds and copies measurement metadata', () => {
      const boundary = buildBoundaryInfo({
        pageTopY: 120,
        pageBottomLimit: 480,
        safePageHeightPx: 720,
        marginsPx: { top: 60, bottom: 60 },
        printableHeightPx: 600,
        contentHeightPx: 540,
        footerReservePx: 40,
        safeColumnIndex: 0,
        safeColumnCount: 1,
        overflowAllowancePx: 12,
        baselineOffset: 100,
      });

      expect(normalizeVerticalBounds).toHaveBeenCalledWith(120, 100);
      expect(normalizeVerticalBounds).toHaveBeenCalledWith(480, 100);
      expect(boundary).toMatchObject({
        pageTop: 20,
        pageBottom: 380,
        pageHeightPx: 720,
        marginsPx: { top: 60, bottom: 60 },
        contentHeightPx: 540,
        allowancePx: 12,
      });
    });
  });
});
