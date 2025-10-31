// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeHtmlFieldSegments } from './html-field-segments.js';

describe('computeHtmlFieldSegments', () => {
  let containerRect;
  let pages;
  let domNode;
  let view;

  beforeEach(() => {
    containerRect = { top: 10, left: 20 };
    pages = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0 },
        metrics: { contentHeightPx: 400, marginTopPx: 0 },
      },
    ];

    domNode = document.createElement('div');
    Object.defineProperty(domNode, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 50,
        bottom: 250,
        left: 120,
        right: 320,
        width: 200,
        height: 200,
      }),
    });

    const htmlNode = {
      type: { name: 'fieldAnnotation' },
      attrs: { type: 'html', fieldId: 'field-1', alias: 'fieldAlias' },
      nodeSize: 2,
    };

    const otherNode = {
      type: { name: 'paragraph' },
      attrs: {},
      nodeSize: 3,
    };

    const docNodes = [
      { pos: 0, node: htmlNode },
      { pos: 5, node: otherNode },
    ];

    const doc = {
      descendants(callback) {
        docNodes.forEach(({ node, pos }) => callback(node, pos));
      },
      content: { size: 10 },
    };

    view = {
      state: { doc },
      nodeDOM: vi.fn((pos) => {
        if (pos === 0) return domNode;
        return null;
      }),
    };
  });

  it('returns empty array when prerequisites missing', () => {
    expect(computeHtmlFieldSegments({ view: null, containerRect, pages })).toEqual([]);
    expect(computeHtmlFieldSegments({ view, containerRect: null, pages })).toEqual([]);
    expect(computeHtmlFieldSegments({ view, containerRect, pages: null })).toEqual([]);
  });

  it('computes segments for html field nodes', () => {
    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments).toHaveLength(1);

    const fieldMeasurement = segments[0];
    expect(fieldMeasurement.pos).toBe(0);
    expect(fieldMeasurement.attrs).toEqual({
      type: 'html',
      fieldId: 'field-1',
      alias: 'fieldAlias',
    });
    expect(fieldMeasurement.rect).toEqual({
      leftPx: 100,
      widthPx: 200,
      topPx: 40,
      heightPx: 200,
    });

    expect(fieldMeasurement.segments).toEqual([
      {
        pageIndex: 0,
        absoluteTopPx: 40,
        absoluteBottomPx: 240,
        topPx: 40,
        heightPx: 200,
        offsetWithinFieldPx: 0,
      },
    ]);
  });

  it('skips nodes without measurable DOM references', () => {
    view.nodeDOM.mockReturnValueOnce(null);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('handles exception when calling nodeDOM', () => {
    view.nodeDOM.mockImplementationOnce(() => {
      throw new Error('nodeDOM failed');
    });
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('skips nodes without getBoundingClientRect method', () => {
    const invalidNode = { nodeType: 1 };
    view.nodeDOM.mockReturnValueOnce(invalidNode);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('skips nodes that are not HTMLElement instances when HTMLElement is available', () => {
    const textNode = document.createTextNode('text');
    view.nodeDOM.mockReturnValueOnce(textNode);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('skips nodes with non-element nodeType', () => {
    const commentNode = document.createComment('comment');
    view.nodeDOM.mockReturnValueOnce(commentNode);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('skips when getBoundingClientRect returns null', () => {
    const invalidDomNode = document.createElement('div');
    Object.defineProperty(invalidDomNode, 'getBoundingClientRect', {
      value: () => null,
    });
    view.nodeDOM.mockReturnValueOnce(invalidDomNode);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('skips when field positions are non-finite', () => {
    const badRectNode = document.createElement('div');
    Object.defineProperty(badRectNode, 'getBoundingClientRect', {
      value: () => ({
        top: NaN,
        bottom: 250,
        left: 120,
        right: 320,
        width: 200,
        height: 200,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(badRectNode);
    expect(computeHtmlFieldSegments({ view, containerRect, pages })).toEqual([]);
  });

  it('computes segments for fields spanning multiple pages', () => {
    const multiPageNode = document.createElement('div');
    Object.defineProperty(multiPageNode, 'getBoundingClientRect', {
      value: () => ({
        top: 50,
        bottom: 650, // Spans across two pages
        left: 120,
        right: 320,
        width: 200,
        height: 600,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(multiPageNode);

    const multiPages = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0 },
        metrics: { contentHeightPx: 400, marginTopPx: 0 },
      },
      {
        pageIndex: 1,
        break: { startOffsetPx: 400 },
        metrics: { contentHeightPx: 400, marginTopPx: 0 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: multiPages });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments).toHaveLength(2);
    expect(segments[0].segments[0].pageIndex).toBe(0);
    expect(segments[0].segments[1].pageIndex).toBe(1);
    expect(segments[0].segments[0].heightPx).toBe(360); // 400 - 40
    expect(segments[0].segments[1].heightPx).toBe(240); // 640 - 400
  });

  it('uses fittedBottom when available to constrain page end', () => {
    const pagesWithFittedBottom = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0, fittedBottom: 300 },
        metrics: { contentHeightPx: 400, marginTopPx: 0 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: pagesWithFittedBottom });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments[0].absoluteBottomPx).toBe(240); // Limited by field bottom, not fittedBottom
  });

  it('skips pages where pageEnd <= pageStart', () => {
    const invalidPages = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 500 },
        metrics: { contentHeightPx: 0, marginTopPx: 0 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: invalidPages });
    expect(segments).toEqual([]);
  });

  it('skips pages where field is completely outside page bounds (displayBottom <= displayTop)', () => {
    const highFieldNode = document.createElement('div');
    Object.defineProperty(highFieldNode, 'getBoundingClientRect', {
      value: () => ({
        top: 5000, // Way below the page
        bottom: 5200,
        left: 120,
        right: 320,
        width: 200,
        height: 200,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(highFieldNode);

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments).toEqual([]);
  });

  it('excludes field from results when no page segments are created', () => {
    const outOfBoundsNode = document.createElement('div');
    Object.defineProperty(outOfBoundsNode, 'getBoundingClientRect', {
      value: () => ({
        top: -1000,
        bottom: -800,
        left: 120,
        right: 320,
        width: 200,
        height: 200,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(outOfBoundsNode);

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments).toEqual([]);
  });

  it('handles pages with missing pageIndex', () => {
    const pagesWithoutIndex = [
      {
        break: { startOffsetPx: 0 },
        metrics: { contentHeightPx: 400, marginTopPx: 0 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: pagesWithoutIndex });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments[0].pageIndex).toBe(0);
  });

  it('uses fallback values from page.from when break.startOffsetPx is missing', () => {
    const pagesWithFrom = [
      {
        pageIndex: 0,
        from: 50,
        metrics: { contentHeightPx: 400, marginTopPx: 20 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: pagesWithFrom });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments[0].pageIndex).toBe(0);
  });

  it('handles missing metrics with default values', () => {
    const pagesWithoutMetrics = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: pagesWithoutMetrics });
    expect(segments).toHaveLength(0); // No content height means no visible segments
  });

  it('computes offsetWithinFieldPx correctly for fields starting above page', () => {
    const earlyFieldNode = document.createElement('div');
    Object.defineProperty(earlyFieldNode, 'getBoundingClientRect', {
      value: () => ({
        top: 0, // Starts before first visible content
        bottom: 250,
        left: 120,
        right: 320,
        width: 200,
        height: 250,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(earlyFieldNode);

    const pagesWithMargin = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0 },
        metrics: { contentHeightPx: 400, marginTopPx: 50 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages: pagesWithMargin });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments[0].offsetWithinFieldPx).toBe(60); // displayTop (50) - fieldTop (-10)
  });

  it('handles structuredContent node types', () => {
    const structuredNode = {
      type: { name: 'structuredContent' },
      attrs: { id: 'sc-1' },
      nodeSize: 5,
    };

    const scDoc = {
      descendants(callback) {
        callback(structuredNode, 0);
      },
      content: { size: 10 },
    };

    const scView = {
      state: { doc: scDoc },
      nodeDOM: vi.fn(() => domNode),
    };

    const segments = computeHtmlFieldSegments({ view: scView, containerRect, pages });
    expect(segments).toHaveLength(1);
    expect(segments[0].attrs.type).toBe('structuredContent');
  });

  it('handles structuredContentBlock node types', () => {
    const blockNode = {
      type: { name: 'structuredContentBlock' },
      attrs: { fieldId: 'block-1' },
      nodeSize: 4,
    };

    const blockDoc = {
      descendants(callback) {
        callback(blockNode, 0);
      },
      content: { size: 10 },
    };

    const blockView = {
      state: { doc: blockDoc },
      nodeDOM: vi.fn(() => domNode),
    };

    const segments = computeHtmlFieldSegments({ view: blockView, containerRect, pages });
    expect(segments).toHaveLength(1);
    expect(segments[0].attrs.type).toBe('structuredContent');
  });

  it('includes nodeSize in segment output', () => {
    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments).toHaveLength(1);
    expect(segments[0].nodeSize).toBe(2);
  });

  it('handles empty pages array', () => {
    const segments = computeHtmlFieldSegments({ view, containerRect, pages: [] });
    expect(segments).toEqual([]);
  });

  it('calculates segment heights correctly when field is clipped by page boundary', () => {
    const clippedFieldNode = document.createElement('div');
    Object.defineProperty(clippedFieldNode, 'getBoundingClientRect', {
      value: () => ({
        top: 350, // Near bottom of page
        bottom: 550, // Extends beyond page
        left: 120,
        right: 320,
        width: 200,
        height: 200,
      }),
    });
    view.nodeDOM.mockReturnValueOnce(clippedFieldNode);

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments).toHaveLength(1);
    expect(segments[0].segments[0].heightPx).toBe(60); // 400 - 340 (displayTop relative to page)
  });
});
