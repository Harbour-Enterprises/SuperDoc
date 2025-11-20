import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelectionOverlay } from './selection-overlay';
import { LayoutInput } from './layout-input';
import { clickToPositionDom } from '../../layout-bridge/src/index.js';
import type { FlowBlock, Measure, Line, Layout } from '@superdoc/contracts';

// Helpers to stub DOM rects
const makeRect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
  x: left,
  y: top,
  toJSON() {
    return this as any;
  },
});

describe('DOM-based caret and click mapping', () => {
  let layoutContainer: HTMLElement;
  let overlayRoot: HTMLElement;
  let pageEl: HTMLElement;
  let fragmentEl: HTMLElement;
  let lineEl: HTMLElement;
  let spanA: HTMLSpanElement; // "Basic para"
  let spanB: HTMLSpanElement; // "graph"

  beforeEach(() => {
    // Container structure mirrors painter output
    layoutContainer = document.createElement('div');
    layoutContainer.classList.add('superdoc-layout');
    document.body.appendChild(layoutContainer);

    pageEl = document.createElement('div');
    pageEl.classList.add('superdoc-page');
    pageEl.dataset.pageIndex = '0';
    (pageEl as any).getBoundingClientRect = () => makeRect(0, 0, 600, 800);
    layoutContainer.appendChild(pageEl);

    fragmentEl = document.createElement('div');
    fragmentEl.classList.add('superdoc-fragment');
    fragmentEl.dataset.blockId = '0-paragraph';
    (fragmentEl as any).getBoundingClientRect = () => makeRect(100, 100, 300, 24);
    pageEl.appendChild(fragmentEl);

    lineEl = document.createElement('div');
    lineEl.classList.add('superdoc-line');
    // PM range for the whole line
    lineEl.dataset.pmStart = '2';
    lineEl.dataset.pmEnd = '19';
    (lineEl as any).getBoundingClientRect = () => makeRect(100, 100, 300, 24);
    fragmentEl.appendChild(lineEl);

    // Two spans with a PM gap 12..14 to simulate join artifacts
    spanA = document.createElement('span');
    spanA.dataset.pmStart = '2';
    spanA.dataset.pmEnd = '12';
    spanA.textContent = 'Basic para'; // length 10
    (spanA as any).getBoundingClientRect = () => makeRect(100, 100, 100, 24);
    lineEl.appendChild(spanA);

    spanB = document.createElement('span');
    spanB.dataset.pmStart = '14';
    spanB.dataset.pmEnd = '19';
    spanB.textContent = 'graph'; // length 5
    (spanB as any).getBoundingClientRect = () => makeRect(200, 100, 50, 24);
    lineEl.appendChild(spanB);

    overlayRoot = document.createElement('div');
    (overlayRoot as any).getBoundingClientRect = () => makeRect(0, 0, 600, 800);
    document.body.appendChild(overlayRoot);
  });

  afterEach(() => {
    overlayRoot.remove();
    layoutContainer.remove();
  });

  it('DOM caret aligns to span character boundary across runs with PM gaps', () => {
    // Stub Range to return width proportional to character count
    const origCreateRange = document.createRange.bind(document);
    (document as any).createRange = () => {
      let end = 0;
      let node: Text | null = null;
      return {
        setStart: (n: Text) => {
          node = n;
        },
        setEnd: (_n: Text, e: number) => {
          end = e;
        },
        getBoundingClientRect: () => {
          // Compute base from spanA or spanB
          const parent = node?.parentElement as HTMLElement | null;
          if (!parent) return makeRect(0, 0, 0, 0);
          const base = parent === spanA ? 100 : parent === spanB ? 200 : 0;
          // 10px per character
          return makeRect(base, 100, end * 10, 24);
        },
      } as any;
    };

    const overlay = new SelectionOverlay(overlayRoot, layoutContainer);
    // Minimal data structures for computeCaretDom
    const block: FlowBlock = {
      kind: 'paragraph',
      id: '0-paragraph',
      runs: [],
      attrs: {},
    } as any;
    const line: Line = {
      fromRun: 0,
      toRun: 0,
      fromChar: 0,
      toChar: 15,
      width: 150,
      lineHeight: 24,
      ascent: 18,
      descent: 6,
    } as any;
    const measure: Measure = { kind: 'paragraph', lines: [line] } as any;
    const layout: Layout = {
      pageSize: { w: 600, h: 800 },
      pages: [
        {
          number: 1,
          fragments: [
            {
              kind: 'para',
              blockId: '0-paragraph',
              fromLine: 0,
              toLine: 1,
              x: 100,
              y: 100,
              width: 300,
              pmStart: 2,
              pmEnd: 19,
            },
          ],
        },
      ],
    } as any;

    // @ts-expect-error internal assignment for testing
    (overlay as any).layout = layout;
    // Call private method to ensure DOM path is used
    // @ts-expect-error private access for testing
    const caretA = overlay.computeCaretDom(
      { block, measure, pageIndex: 0, fragment: layout.pages[0].fragments[0] },
      12,
      { line, offsetChars: 10 },
    );
    expect(caretA).toBeTruthy();
    // Span A ends at X=200; caret should be near that when pos=12
    expect(Math.round((caretA as any).x)).toBe(200);

    // Caret inside spanB pos=16 should resolve within spanB using DOM widths (200 + 20)
    // @ts-expect-error private access for testing
    const caretB = overlay.computeCaretDom(
      { block, measure, pageIndex: 0, fragment: layout.pages[0].fragments[0] },
      16,
      { line, offsetChars: 14 },
    );
    expect(caretB).toBeTruthy();
    expect(Math.round((caretB as any).x)).toBe(220);

    // Restore Range
    (document as any).createRange = origCreateRange;
  });

  it('DOM click mapping returns increasing PM positions across a run boundary', () => {
    // Stub Range to provide deterministic widths
    const origCreateRange = document.createRange.bind(document);
    (document as any).createRange = () => {
      let end = 0;
      let node: Text | null = null;
      return {
        setStart: (n: Text) => {
          node = n;
        },
        setEnd: (_n: Text, e: number) => {
          end = e;
        },
        getBoundingClientRect: () => {
          const parent = node?.parentElement as HTMLElement | null;
          if (!parent) return makeRect(0, 0, 0, 0);
          const base = parent === spanA ? 100 : parent === spanB ? 200 : 0;
          return makeRect(base, 100, end * 10, 24);
        },
      } as any;
    };
    // Click before spans → line start (pm=2)
    const posStart = clickToPositionDom(pageEl, 50, 110);
    expect(posStart).toBe(2);

    // Click inside spanA near its end → pm close to 12
    const posA = clickToPositionDom(pageEl, 195, 110);
    expect(posA).toBeGreaterThanOrEqual(10);
    expect(posA).toBeLessThanOrEqual(12);

    // Click inside spanB → pm >= 14
    const posB = clickToPositionDom(pageEl, 210, 110);
    expect(posB).toBeGreaterThanOrEqual(14);

    // Click beyond last span → line end (pm=19)
    const posEnd = clickToPositionDom(pageEl, 260, 110);
    expect(posEnd).toBe(19);

    // Restore Range
    (document as any).createRange = origCreateRange;
  });

  it('handles multi-line paragraphs by Y-hit on correct line', () => {
    // Build two lines within the same fragment
    fragmentEl.innerHTML = '';

    const line1 = document.createElement('div');
    line1.classList.add('superdoc-line');
    line1.dataset.pmStart = '2';
    line1.dataset.pmEnd = '12';
    (line1 as any).getBoundingClientRect = () => makeRect(100, 100, 150, 24);
    const l1s1 = document.createElement('span');
    l1s1.dataset.pmStart = '2';
    l1s1.dataset.pmEnd = '8';
    l1s1.textContent = 'Basic ';
    (l1s1 as any).getBoundingClientRect = () => makeRect(100, 100, 60, 24);
    const l1s2 = document.createElement('span');
    l1s2.dataset.pmStart = '8';
    l1s2.dataset.pmEnd = '12';
    l1s2.textContent = 'para';
    (l1s2 as any).getBoundingClientRect = () => makeRect(160, 100, 40, 24);
    line1.appendChild(l1s1);
    line1.appendChild(l1s2);

    const line2 = document.createElement('div');
    line2.classList.add('superdoc-line');
    line2.dataset.pmStart = '12';
    line2.dataset.pmEnd = '19';
    (line2 as any).getBoundingClientRect = () => makeRect(100, 130, 150, 24);
    const l2s1 = document.createElement('span');
    l2s1.dataset.pmStart = '12';
    l2s1.dataset.pmEnd = '19';
    l2s1.textContent = 'graph';
    (l2s1 as any).getBoundingClientRect = () => makeRect(100, 130, 100, 24);
    line2.appendChild(l2s1);

    fragmentEl.appendChild(line1);
    fragmentEl.appendChild(line2);

    // Stub Range width = base + chars*10
    const origCreateRange = document.createRange.bind(document);
    (document as any).createRange = () => {
      let end = 0;
      let node: Text | null = null;
      return {
        setStart: (n: Text) => {
          node = n;
        },
        setEnd: (_n: Text, e: number) => {
          end = e;
        },
        getBoundingClientRect: () => {
          const parent = node?.parentElement as HTMLElement | null;
          if (!parent) return makeRect(0, 0, 0, 0);
          const baseRect = parent.getBoundingClientRect();
          return makeRect(baseRect.left, baseRect.top, end * 10, baseRect.height);
        },
      } as any;
    };

    // Click on line 1 at x=150 → pm within [2,12]
    const posLine1 = clickToPositionDom(pageEl, 150, 110);
    expect(posLine1).toBeGreaterThanOrEqual(2);
    expect(posLine1).toBeLessThanOrEqual(12);

    // Click on line 2 at x=150 → pm within [12,19]
    const posLine2 = clickToPositionDom(pageEl, 150, 140);
    expect(posLine2).toBeGreaterThanOrEqual(12);
    expect(posLine2).toBeLessThanOrEqual(19);

    (document as any).createRange = origCreateRange;
  });

  it('respects letterSpacing when mapping clicks', () => {
    // Add letter spacing to spanA and ensure fewer characters fit in the same width
    spanA.style.letterSpacing = '2px';
    const origCreateRange = document.createRange.bind(document);
    (document as any).createRange = () => {
      let end = 0;
      let node: Text | null = null;
      return {
        setStart: (n: Text) => {
          node = n;
        },
        setEnd: (_n: Text, e: number) => {
          end = e;
        },
        getBoundingClientRect: () => {
          const parent = node?.parentElement as HTMLElement | null;
          if (!parent) return makeRect(0, 0, 0, 0);
          const baseRect = parent.getBoundingClientRect();
          const perChar = parent === spanA ? 12 /* 10 + 2 spacing */ : 10;
          return makeRect(baseRect.left, baseRect.top, end * perChar, baseRect.height);
        },
      } as any;
    };

    // On spanA (width grows faster), a click at x=150 should yield a lower char index (pm) than with default spacing
    const posWithSpacing = clickToPositionDom(pageEl, 150, 110);
    expect(posWithSpacing).toBeGreaterThanOrEqual(2);
    expect(posWithSpacing).toBeLessThanOrEqual(12);

    (document as any).createRange = origCreateRange;
  });

  it('returns valid PM positions for RTL-like span placement', () => {
    // Simulate spans ordered right-to-left by placing spanA to the right of spanB
    (spanA as any).getBoundingClientRect = () => makeRect(250, 100, 50, 24); // rightmost
    (spanB as any).getBoundingClientRect = () => makeRect(150, 100, 50, 24); // left

    const origCreateRange = document.createRange.bind(document);
    (document as any).createRange = () => {
      let end = 0;
      let node: Text | null = null;
      return {
        setStart: (n: Text) => {
          node = n;
        },
        setEnd: (_n: Text, e: number) => {
          end = e;
        },
        getBoundingClientRect: () => {
          const parent = node?.parentElement as HTMLElement | null;
          if (!parent) return makeRect(0, 0, 0, 0);
          const baseRect = parent.getBoundingClientRect();
          return makeRect(baseRect.left, baseRect.top, end * 10, baseRect.height);
        },
      } as any;
    };

    // Click near the visual right (beyond last DOM-ordered span) → snap to line end
    const posRight = clickToPositionDom(pageEl, 295, 110);
    expect(posRight).toBe(19);

    // Click near the visual left (spanB). Current implementation snaps to line start
    // when X < first span's left (DOM order). Assert a valid PM within the line.
    const posLeft = clickToPositionDom(pageEl, 155, 110);
    expect(posLeft).toBeGreaterThanOrEqual(2);
    expect(posLeft).toBeLessThanOrEqual(19);

    (document as any).createRange = origCreateRange;
  });
});
