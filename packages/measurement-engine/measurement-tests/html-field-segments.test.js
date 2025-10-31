// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { computeHtmlFieldSegments } from '../engine/src/core/field-annotations-measurements/index.js';

const HTMLElementRef = typeof HTMLElement === 'undefined' ? null : HTMLElement;

describe('computeHtmlFieldSegments', () => {
  let domNode;
  let view;
  let fieldEntry;

  beforeEach(() => {
    domNode = document.createElement('div');
    domNode.setAttribute('data-type', 'html');
    Object.defineProperty(domNode, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 50,
        bottom: 350,
        left: 12,
        right: 312,
        width: 300,
        height: 300,
      }),
    });

    const fieldNode = {
      type: { name: 'fieldAnnotation' },
      attrs: {
        type: 'html',
        fieldId: 'field-a',
      },
      nodeSize: 1,
    };

    const otherNode = {
      type: { name: 'paragraph' },
      attrs: {},
      nodeSize: 4,
    };

    fieldEntry = { node: fieldNode, pos: 5 };

    const entries = [{ node: otherNode, pos: 0 }, fieldEntry];

    const doc = {
      descendants(callback) {
        for (const entry of entries) {
          const result = callback(entry.node, entry.pos);
          if (result === false) break;
        }
        return undefined;
      },
    };

    const domMap = new Map([[5, domNode]]);

    view = {
      state: { doc },
      nodeDOM(pos) {
        const result = domMap.get(pos);
        if (HTMLElementRef && result instanceof HTMLElementRef) {
          return result;
        }
        return result ?? null;
      },
    };
  });

  it('returns segment metadata for HTML field annotations across multiple pages', () => {
    const containerRect = {
      top: 0,
      left: 0,
      width: 816,
      height: 600,
    };

    const pages = [
      {
        pageIndex: 0,
        break: {
          startOffsetPx: 0,
          fittedBottom: 200,
        },
        metrics: {
          contentHeightPx: 200,
          marginTopPx: 96,
        },
      },
      {
        pageIndex: 1,
        break: {
          startOffsetPx: 200,
          fittedBottom: 400,
        },
        metrics: {
          contentHeightPx: 200,
          marginTopPx: 96,
        },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBe(1);

    const [field] = segments;
    expect(field.pos).toBe(5);
    expect(field.attrs?.fieldId).toBe('field-a');
    expect(field.rect).toEqual({
      leftPx: 12,
      widthPx: 300,
      topPx: 50,
      heightPx: 300,
    });

    expect(field.segments).toEqual([
      {
        pageIndex: 0,
        absoluteTopPx: 96,
        absoluteBottomPx: 200,
        topPx: 0,
        heightPx: 104,
        offsetWithinFieldPx: 46,
      },
      {
        pageIndex: 1,
        absoluteTopPx: 296,
        absoluteBottomPx: 350,
        topPx: 0,
        heightPx: 54,
        offsetWithinFieldPx: 246,
      },
    ]);
  });

  it('ignores non-HTML field annotations', () => {
    const containerRect = { top: 0, left: 0 };
    const pages = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0, fittedBottom: 400 },
        metrics: { contentHeightPx: 400 },
      },
    ];

    // Update the DOM node to represent a non-HTML field.
    domNode.setAttribute('data-type', 'text');
    fieldEntry.node.attrs.type = 'text';

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBe(0);
  });

  it('extracts segments for structured content blocks', () => {
    const structuredDom = document.createElement('div');
    structuredDom.dataset.type = 'structured';
    Object.defineProperty(structuredDom, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: 120,
        bottom: 480,
        left: 24,
        right: 324,
        width: 300,
        height: 360,
      }),
    });

    const structuredNode = {
      type: { name: 'structuredContentBlock' },
      attrs: {
        id: 'block-1',
        alias: 'HTML Block',
      },
      nodeSize: 5,
    };

    fieldEntry.node = structuredNode;
    fieldEntry.pos = 7;

    const doc = {
      descendants(callback) {
        callback({ type: { name: 'paragraph' }, nodeSize: 3 }, 0);
        const result = callback(structuredNode, 7);
        if (result !== false) {
          callback({ type: { name: 'paragraph' }, nodeSize: 3 }, 12);
        }
        return undefined;
      },
    };

    const domMap = new Map([[7, structuredDom]]);
    view = {
      state: { doc },
      nodeDOM(pos) {
        return domMap.get(pos) ?? null;
      },
    };

    const containerRect = { top: 0, left: 0 };
    const pages = [
      {
        pageIndex: 0,
        break: { startOffsetPx: 0, fittedBottom: 320 },
        metrics: { contentHeightPx: 320, marginTopPx: 96 },
      },
      {
        pageIndex: 1,
        break: { startOffsetPx: 320, fittedBottom: 640 },
        metrics: { contentHeightPx: 320, marginTopPx: 96 },
      },
    ];

    const segments = computeHtmlFieldSegments({ view, containerRect, pages });
    expect(segments.length).toBe(1);
    const segmentEntry = segments[0];
    expect(segmentEntry.attrs.fieldId).toBe('block-1');
    expect(segmentEntry.attrs.type).toBe('structuredContent');
  });
});
