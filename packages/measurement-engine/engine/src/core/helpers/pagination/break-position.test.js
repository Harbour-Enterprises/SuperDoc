// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { getExactBreakPosition } from './break-position.js';
import * as PageBreaksHelpers from '../../../page-breaks/helpers/index.js';

describe('getExactBreakPosition', () => {
  describe('recursive block descent', () => {
    it('descends into block containers to find leaf blocks', () => {
      // Create a mock table structure: table → row → cell → paragraph
      const paragraphNode = {
        isBlock: true,
        childCount: 0, // Leaf block with inline content
        content: {},
      };

      const cellNode = {
        isBlock: true,
        childCount: 1,
        content: {},
        child: vi.fn(() => paragraphNode),
        nodeSize: 10,
      };

      const rowNode = {
        isBlock: true,
        childCount: 1,
        content: {},
        child: vi.fn(() => cellNode),
        nodeSize: 12,
      };

      const tableNode = {
        isBlock: true,
        childCount: 1,
        content: {},
        child: vi.fn(() => rowNode),
        nodeSize: 14,
      };

      const block = document.createElement('table');
      Object.defineProperty(block, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 200, bottom: 300 }),
      });

      const view = {
        posAtDOM: vi.fn(() => 50),
        nodeDOM: vi.fn((pos) => {
          // Return mock DOM elements with bounding rects
          const mockElement = {
            getBoundingClientRect: () => {
              // Table crosses boundary
              if (pos === 50) return { top: 200, bottom: 400 };
              // Row crosses boundary
              if (pos === 51) return { top: 250, bottom: 380 };
              // Cell crosses boundary
              if (pos === 52) return { top: 280, bottom: 360 };
              // Paragraph crosses boundary
              if (pos === 53) return { top: 290, bottom: 340 };
              return { top: 0, bottom: 100 };
            },
          };
          return mockElement;
        }),
        state: {
          doc: {
            nodeAt: vi.fn(() => tableNode),
            content: {
              size: 1000,
            },
          },
        },
      };

      const containerRect = { top: 0, left: 0 };
      const pagination = { pageStart: 100, lastBreakPos: null };

      // Mock safeCoordsAtPos to simulate overflow at different levels
      vi.spyOn(PageBreaksHelpers, 'safeCoordsAtPos').mockImplementation((view, pos) => {
        // Return coords that match the DOM rects above
        // Table
        if (pos === 50) return { top: 200, bottom: 400 };
        // Row
        if (pos === 51) return { top: 250, bottom: 380 };
        // Cell
        if (pos === 52) return { top: 280, bottom: 360 };
        // Paragraph (leaf)
        if (pos === 53) return { top: 290, bottom: 340 };
        // Row end (50 + 12 - 1 = 61)
        if (pos === 61) return { top: 250, bottom: 380 };
        // Cell end (51 + 10 - 1 = 60)
        if (pos === 60) return { top: 280, bottom: 360 };
        // Paragraph end (52 + 8 - 1 = 59)
        if (pos === 59) return { top: 290, bottom: 340 };
        return { top: 0, bottom: 100 };
      });

      vi.spyOn(PageBreaksHelpers, 'findBreakPosInBlock').mockReturnValue({
        pos: 55,
        top: 200,
        bottom: 250,
      });

      const result = getExactBreakPosition({
        view,
        block,
        containerRect,
        pageLimit: 300,
        pagination,
      });

      expect(result).toBeTruthy();
      expect(result.pos).toBe(55);
      expect(PageBreaksHelpers.findBreakPosInBlock).toHaveBeenCalled();
    });

    it('handles leaf blocks directly without recursion', () => {
      const paragraphNode = {
        isBlock: true,
        childCount: 0, // Leaf block
        content: {},
      };

      const block = document.createElement('p');
      Object.defineProperty(block, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 200, bottom: 250 }),
      });

      const view = {
        posAtDOM: vi.fn(() => 10),
        nodeDOM: vi.fn(() => null),
        state: {
          doc: {
            nodeAt: vi.fn(() => paragraphNode),
            content: {
              size: 1000,
            },
          },
        },
      };

      const containerRect = { top: 0, left: 0 };
      const pagination = { pageStart: 0, lastBreakPos: null };

      vi.spyOn(PageBreaksHelpers, 'safeCoordsAtPos').mockReturnValue({
        top: 200,
        bottom: 250,
      });

      vi.spyOn(PageBreaksHelpers, 'findBreakPosInBlock').mockReturnValue({
        pos: 15,
        top: 220,
        bottom: 230,
      });

      const result = getExactBreakPosition({
        view,
        block,
        containerRect,
        pageLimit: 300,
        pagination,
      });

      expect(result).toBeTruthy();
      expect(result.pos).toBe(15);
      expect(PageBreaksHelpers.findBreakPosInBlock).toHaveBeenCalledWith(view, 10, paragraphNode, 300, 11);
    });

    it('returns null when block position cannot be determined', () => {
      const block = document.createElement('div');

      const view = {
        posAtDOM: vi.fn(() => {
          throw new Error('Cannot determine position');
        }),
        posAtCoords: vi.fn(() => null),
        state: {
          doc: {},
        },
      };

      const result = getExactBreakPosition({
        view,
        block,
        containerRect: { top: 0, left: 0 },
        pageLimit: 300,
        pagination: { pageStart: 0 },
      });

      expect(result).toBeNull();
    });

    it('uses posAtCoords fallback when posAtDOM fails', () => {
      const paragraphNode = {
        isBlock: true,
        childCount: 0,
        content: {},
      };

      const block = document.createElement('p');
      Object.defineProperty(block, 'getBoundingClientRect', {
        value: () => ({ left: 10, top: 200, bottom: 250 }),
      });

      const view = {
        posAtDOM: vi.fn(() => {
          throw new Error('posAtDOM failed');
        }),
        posAtCoords: vi.fn(() => ({ pos: 20 })),
        nodeDOM: vi.fn(() => null),
        state: {
          doc: {
            nodeAt: vi.fn(() => paragraphNode),
            content: {
              size: 1000,
            },
          },
        },
      };

      const containerRect = { top: 0, left: 0 };
      const pagination = { pageStart: 0, lastBreakPos: null };

      vi.spyOn(PageBreaksHelpers, 'safeCoordsAtPos').mockReturnValue({
        top: 200,
        bottom: 250,
      });

      vi.spyOn(PageBreaksHelpers, 'findBreakPosInBlock').mockReturnValue({
        pos: 25,
        top: 220,
        bottom: 230,
      });

      const result = getExactBreakPosition({
        view,
        block,
        containerRect,
        pageLimit: 300,
        pagination,
      });

      expect(result).toBeTruthy();
      expect(view.posAtCoords).toHaveBeenCalled();
      expect(result.pos).toBe(25);
    });
  });

  describe('coordinate normalization', () => {
    it('clamps coordinates to page boundaries', () => {
      const paragraphNode = {
        isBlock: true,
        childCount: 0,
        content: {},
      };

      const block = document.createElement('p');
      Object.defineProperty(block, 'getBoundingClientRect', {
        value: () => ({ left: 0, top: 200, bottom: 250 }),
      });

      const view = {
        posAtDOM: vi.fn(() => 10),
        nodeDOM: vi.fn(() => null),
        state: {
          doc: {
            nodeAt: vi.fn(() => paragraphNode),
            content: {
              size: 1000,
            },
          },
        },
      };

      const containerRect = { top: 0, left: 0 };
      const pagination = { pageStart: 50, lastBreakPos: null };

      vi.spyOn(PageBreaksHelpers, 'safeCoordsAtPos').mockReturnValue({
        top: 30, // Below pageStart
        bottom: 400, // Beyond pageLimit
      });

      vi.spyOn(PageBreaksHelpers, 'findBreakPosInBlock').mockReturnValue({
        pos: 15,
        top: 30,
        bottom: 400,
      });

      const result = getExactBreakPosition({
        view,
        block,
        containerRect,
        pageLimit: 300,
        pagination,
      });

      expect(result.fittedTop).toBeGreaterThanOrEqual(pagination.pageStart);
      expect(result.fittedBottom).toBeLessThanOrEqual(300);
      expect(result.fittedTop).toBeLessThanOrEqual(result.fittedBottom);
    });
  });
});
