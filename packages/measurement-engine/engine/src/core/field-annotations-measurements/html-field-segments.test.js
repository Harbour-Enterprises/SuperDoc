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
});
