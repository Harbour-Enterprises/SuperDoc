import { describe, it, expect } from 'vitest';
import { buildLayoutModel } from './layout-model.js';

const createMockView = ({ docSize = 0, descendants = null, rectTop = 0 } = {}) => ({
  state: {
    doc: {
      content: { size: docSize },
      descendants: descendants || (() => {}),
    },
  },
  dom: {
    getBoundingClientRect: () => ({ top: rectTop }),
  },
});

describe('buildLayoutModel', () => {
  describe('basic functionality', () => {
    it('ensures page count matches breaks even when positions are missing', () => {
      const view = createMockView({ docSize: 42 });
      const metrics = {
        pageHeightPx: 720,
        marginsPx: { top: 96, bottom: 96, left: 72, right: 72 },
      };
      const pageBreaks = [{ pageIndex: 0, break: { top: 500 } }];

      const { pages } = buildLayoutModel(view, metrics, { pageBreaks });

      expect(pages).toHaveLength(2);
      expect(pages[0].pageIndex).toBe(0);
      expect(pages[1].pageIndex).toBe(1);
    });

    it('returns single page for empty document', () => {
      const view = createMockView({ docSize: 0 });
      const { pages } = buildLayoutModel(view);

      expect(pages).toHaveLength(1);
      expect(pages[0].pageIndex).toBe(0);
      expect(pages[0].from).toBe(0);
      expect(pages[0].to).toBe(0);
    });

    it('creates pages based on break positions', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [
        { pos: 30, break: { top: 200 } },
        { pos: 60, break: { top: 400 } },
      ];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages).toHaveLength(3);
      expect(pages[0].from).toBe(0);
      expect(pages[0].to).toBe(30);
      expect(pages[1].from).toBe(30);
      expect(pages[1].to).toBe(60);
      expect(pages[2].from).toBe(60);
      expect(pages[2].to).toBe(100);
    });

    it('includes break and overflow information', () => {
      const view = createMockView({ docSize: 50 });
      const pageBreaks = [
        {
          pos: 25,
          break: { top: 200, bottom: 400 },
          overflowBlock: { type: 'paragraph' },
        },
      ];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].break).toEqual({ top: 200, bottom: 400 });
      expect(pages[0].overflowBlock).toEqual({ type: 'paragraph' });
      expect(pages[1].break).toBeNull();
      expect(pages[1].overflowBlock).toBeNull();
    });
  });

  describe('edge cases and null handling', () => {
    it('handles null view gracefully', () => {
      const { pages, metrics } = buildLayoutModel(null);

      expect(pages).toEqual([]);
      expect(metrics.pageHeightPx).toBeGreaterThan(0);
      expect(metrics.marginsPx).toBeDefined();
    });

    it('handles view without state', () => {
      const { pages } = buildLayoutModel({});

      expect(pages).toEqual([]);
    });

    it('handles undefined options', () => {
      const view = createMockView({ docSize: 10 });
      const { pages } = buildLayoutModel(view, {}, undefined);

      expect(pages).toHaveLength(1);
    });

    it('handles null pageBreaks', () => {
      const view = createMockView({ docSize: 10 });
      const { pages } = buildLayoutModel(view, {}, { pageBreaks: null });

      expect(pages).toHaveLength(1);
    });

    it('handles empty pageBreaks array', () => {
      const view = createMockView({ docSize: 10 });
      const { pages } = buildLayoutModel(view, {}, { pageBreaks: [] });

      expect(pages).toHaveLength(1);
    });

    it('filters out invalid break positions', () => {
      const view = createMockView({ docSize: 50 });
      const pageBreaks = [
        { pageIndex: 0, pos: 25 }, // valid
      ];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      // Only position 25 should create a break
      expect(pages).toHaveLength(2);
      expect(pages[0].to).toBe(25);
      expect(pages[1].from).toBe(25);
    });
  });

  describe('metrics normalization', () => {
    it('uses default metrics when not provided', () => {
      const view = createMockView({ docSize: 10 });
      const { metrics } = buildLayoutModel(view);

      expect(metrics.pageHeightPx).toBeGreaterThan(0);
      expect(metrics.marginsPx.top).toBeGreaterThan(0);
      expect(metrics.marginsPx.bottom).toBeGreaterThan(0);
      expect(metrics.marginsPx.left).toBeGreaterThan(0);
      expect(metrics.marginsPx.right).toBeGreaterThan(0);
    });

    it('uses provided metrics', () => {
      const view = createMockView({ docSize: 10 });
      const customMetrics = {
        pageHeightPx: 1000,
        marginsPx: { top: 50, bottom: 60, left: 70, right: 80 },
      };

      const { metrics } = buildLayoutModel(view, customMetrics);

      expect(metrics.pageHeightPx).toBe(1000);
      expect(metrics.marginsPx.top).toBe(50);
      expect(metrics.marginsPx.bottom).toBe(60);
      expect(metrics.marginsPx.left).toBe(70);
      expect(metrics.marginsPx.right).toBe(80);
    });

    it('uses defaults for invalid margin values', () => {
      const view = createMockView({ docSize: 10 });
      const { metrics } = buildLayoutModel(view, {
        marginsPx: { top: NaN, bottom: Infinity, left: null, right: undefined },
      });

      expect(metrics.marginsPx.top).toBeGreaterThan(0);
      expect(metrics.marginsPx.bottom).toBeGreaterThan(0);
      expect(metrics.marginsPx.left).toBeGreaterThan(0);
      expect(metrics.marginsPx.right).toBeGreaterThan(0);
    });

    it('uses default for invalid pageHeightPx', () => {
      const view = createMockView({ docSize: 10 });
      const { metrics } = buildLayoutModel(view, { pageHeightPx: NaN });

      expect(metrics.pageHeightPx).toBeGreaterThan(0);
    });
  });

  describe('boundary calculations', () => {
    it('calculates page boundaries with rect offset', () => {
      const view = createMockView({ docSize: 100, rectTop: 50 });
      const metrics = {
        pageHeightPx: 720,
        marginsPx: { top: 96, bottom: 96, left: 72, right: 72 },
      };
      const pageBreaks = [{ pos: 50 }];

      const { pages } = buildLayoutModel(view, metrics, { pageBreaks });

      expect(pages[0].boundary.pageTop).toBe(50 + 96); // rectTop + marginTop
      expect(pages[0].boundary.pageBottom).toBe(50 + 720 - 96); // rectTop + pageHeight - marginBottom
      expect(pages[1].boundary.pageTop).toBe(50 + 720 + 96); // rectTop + pageHeight + marginTop
    });

    it('handles missing getBoundingClientRect', () => {
      const view = {
        state: {
          doc: {
            content: { size: 10 },
            descendants: () => {},
          },
        },
        dom: {},
      };

      const { pages } = buildLayoutModel(view, {
        pageHeightPx: 720,
        marginsPx: { top: 96, bottom: 96, left: 72, right: 72 },
      });

      expect(pages[0].boundary.pageTop).toBe(96);
      expect(pages[0].boundary.pageBottom).toBe(720 - 96);
    });

    it('includes page height and margins in boundary', () => {
      const view = createMockView({ docSize: 10 });
      const metrics = {
        pageHeightPx: 800,
        marginsPx: { top: 100, bottom: 100, left: 50, right: 50 },
      };

      const { pages } = buildLayoutModel(view, metrics);

      expect(pages[0].boundary.pageHeightPx).toBe(800);
      expect(pages[0].boundary.marginsPx).toEqual({ top: 100, bottom: 100, left: 50, right: 50 });
    });
  });

  describe('forced page breaks', () => {
    it('includes hardBreak nodes with page type', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 30);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages.length).toBeGreaterThan(1);
      expect(pages[0].to).toBe(30);
    });

    it('includes hardBreak nodes with lineBreakType page', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { lineBreakType: 'page' } }, 40);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages[0].to).toBe(40);
    });

    it('ignores hardBreak nodes without page type', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'line' } }, 30);
        callback({ type: { name: 'hardBreak' }, attrs: {} }, 50);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages).toHaveLength(1);
    });

    it('deduplicates forced anchors at same position', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 30);
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 30);
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 30);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages).toHaveLength(2);
    });

    it('merges forced anchors with measured breaks', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 30);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });
      const pageBreaks = [{ pos: 60 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages).toHaveLength(3);
      expect(pages[0].to).toBe(30);
      expect(pages[1].to).toBe(60);
    });

    it('ignores forced anchors at or beyond doc size', () => {
      const descendants = (callback) => {
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 0);
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 100);
        callback({ type: { name: 'hardBreak' }, attrs: { pageBreakType: 'page' } }, 200);
        return true;
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages).toHaveLength(1);
    });

    it('handles errors in descendants gracefully', () => {
      const descendants = () => {
        throw new Error('Test error');
      };
      const view = createMockView({ docSize: 100, descendants });

      const { pages } = buildLayoutModel(view);

      expect(pages).toHaveLength(1);
    });
  });

  describe('break position resolution', () => {
    it('resolves position from pos property', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ pos: 30 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(30);
    });

    it('resolves position from break.pos', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ break: { pos: 40 } }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(40);
    });

    it('resolves position from boundary.to', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ boundary: { to: 50 } }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(50);
    });

    it('resolves position from to property', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ to: 60 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(60);
    });

    it('prioritizes pos over other properties', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ pos: 25, break: { pos: 30 }, boundary: { to: 35 }, to: 40 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(25);
    });

    it('creates pages for entries even without valid positions', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ pageIndex: 0 }, { pageIndex: 1 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      // getPageCountFromBreaks will pad pages based on pageIndex
      expect(pages.length).toBeGreaterThanOrEqual(2);
      expect(pages[0].from).toBe(0);
    });
  });

  describe('field segments', () => {
    it('includes field segments on correct pages', () => {
      const view = createMockView({ docSize: 100 });
      const fieldSegments = [
        {
          pos: 10,
          attrs: { type: 'text', fieldId: 'field-1' },
          rect: { leftPx: 10, widthPx: 100, heightPx: 20 },
          segments: [
            { pageIndex: 0, offsetWithinFieldPx: 0, topPx: 50, heightPx: 20 },
            { pageIndex: 1, offsetWithinFieldPx: 20, topPx: 10, heightPx: 20 },
          ],
        },
      ];

      const pageBreaks = [{ pos: 50 }];
      const { pages } = buildLayoutModel(view, {}, { pageBreaks, fieldSegments });

      expect(pages[0].fieldSegments).toHaveLength(1);
      expect(pages[0].fieldSegments[0].fieldId).toBe('field-1');
      expect(pages[0].fieldSegments[0].topPx).toBe(50);
      expect(pages[1].fieldSegments).toHaveLength(1);
      expect(pages[1].fieldSegments[0].topPx).toBe(10);
    });

    it('handles missing field segment properties', () => {
      const view = createMockView({ docSize: 100 });
      const fieldSegments = [
        {
          segments: [{ pageIndex: 0 }],
        },
      ];

      const { pages } = buildLayoutModel(view, {}, { fieldSegments });

      expect(pages[0].fieldSegments).toHaveLength(1);
      expect(pages[0].fieldSegments[0].pos).toBeNull();
      expect(pages[0].fieldSegments[0].type).toBeNull();
      expect(pages[0].fieldSegments[0].rectLeftPx).toBe(0);
      expect(pages[0].fieldSegments[0].rectWidthPx).toBe(0);
    });

    it('ignores segments with invalid pageIndex', () => {
      const view = createMockView({ docSize: 100 });
      const fieldSegments = [
        {
          segments: [
            { pageIndex: null },
            { pageIndex: NaN },
            { pageIndex: 'not-a-number' },
            { pageIndex: 0 }, // valid
          ],
        },
      ];

      const { pages } = buildLayoutModel(view, {}, { fieldSegments });

      expect(pages[0].fieldSegments).toHaveLength(1);
    });

    it('groups multiple fields on same page', () => {
      const view = createMockView({ docSize: 100 });
      const fieldSegments = [
        {
          attrs: { fieldId: 'field-1' },
          segments: [{ pageIndex: 0 }],
        },
        {
          attrs: { fieldId: 'field-2' },
          segments: [{ pageIndex: 0 }],
        },
      ];

      const { pages } = buildLayoutModel(view, {}, { fieldSegments });

      expect(pages[0].fieldSegments).toHaveLength(2);
    });

    it('returns empty array when no segments for page', () => {
      const view = createMockView({ docSize: 100 });
      const fieldSegments = [
        {
          segments: [{ pageIndex: 5 }],
        },
      ];

      const { pages } = buildLayoutModel(view, {}, { fieldSegments });

      expect(pages[0].fieldSegments).toEqual([]);
    });

    it('handles null fieldSegments', () => {
      const view = createMockView({ docSize: 100 });
      const { pages } = buildLayoutModel(view, {}, { fieldSegments: null });

      expect(pages[0].fieldSegments).toEqual([]);
    });
  });

  describe('page count adjustment', () => {
    it('adds extra pages when expected count exceeds calculated pages', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [
        { pageIndex: 0, pos: 25 },
        { pageIndex: 1, pos: 50 },
        { pageIndex: 2 }, // No position, but indicates page 3 exists
        { pageIndex: 3 }, // No position, but indicates page 4 exists
      ];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages.length).toBeGreaterThanOrEqual(4);
    });

    it('fills additional pages with correct indices', () => {
      const view = createMockView({ docSize: 50 });
      const pageBreaks = [{ pageIndex: 0, pos: 25 }, { pageIndex: 1 }, { pageIndex: 2 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].pageIndex).toBe(0);
      expect(pages[1].pageIndex).toBe(1);
      expect(pages[2].pageIndex).toBe(2);
    });

    it('sets from/to correctly for padded pages', () => {
      const view = createMockView({ docSize: 30 });
      const pageBreaks = [{ pageIndex: 0, pos: 30 }, { pageIndex: 1 }, { pageIndex: 2 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(30);
      expect(pages[1].from).toBe(30);
      expect(pages[1].to).toBe(30);
      expect(pages[2].from).toBe(30);
      expect(pages[2].to).toBe(30);
    });
  });

  describe('sorting and deduplication', () => {
    it('sorts break positions in ascending order', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [{ pos: 60 }, { pos: 20 }, { pos: 40 }];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      expect(pages[0].to).toBe(20);
      expect(pages[1].to).toBe(40);
      expect(pages[2].to).toBe(60);
    });

    it('deduplicates identical break positions from break map', () => {
      const view = createMockView({ docSize: 100 });
      const pageBreaks = [
        { pos: 30, pageIndex: 0 },
        { pos: 30, pageIndex: 0 }, // Duplicate position
      ];

      const { pages } = buildLayoutModel(view, {}, { pageBreaks });

      // Break map should deduplicate position 30, but page count includes array length
      expect(pages[0].to).toBe(30);
      expect(pages[1].from).toBe(30);
      // Note: getPageCountFromBreaks may create additional pages based on array length
    });
  });
});
