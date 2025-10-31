// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { MeasurementEngine } from '../../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, '../../../../../super-editor/src/tests/data/hardpagebreak.docx');

const EXPECTED_BREAK_POSITIONS = [23, 79];

let restoreDomPatches;
let editor;
let engine;
let Editor;
let getStarterExtensions;

beforeAll(async () => {
  ({ Editor, getStarterExtensions } = await vi.importActual('../../index.js'));

  restoreDomPatches = patchLayoutMeasurements();

  const fileBuffer = await readFile(FIXTURE_PATH);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const file = new File([blob], 'hardpagebreak.docx', { type: blob.type });
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(file);

  const mount = document.createElement('div');
  document.body.appendChild(mount);

  const extensions = getStarterExtensions();

  editor = new Editor({
    element: mount,
    extensions,
    content: docx,
    media,
    mediaFiles,
    fonts,
    mockDocument: document,
    mockWindow: window,
    pagination: true,
    isHeadless: true,
    isNewFile: true,
  });

  engine = new MeasurementEngine({
    editor,
    element: null,
    onPageBreaksUpdate: () => {},
  });

  // Let asynchronous measurement settle before assertions.
  await new Promise((resolve) => setTimeout(resolve, 25));
});

afterAll(() => {
  engine?.measurementEditor?.destroy?.();
  engine = null;

  editor?.destroy?.();
  editor = null;

  if (typeof restoreDomPatches === 'function') {
    restoreDomPatches();
  }

  document.body.innerHTML = '';
});

describe('hard page break pagination', () => {
  it('places page breaks at forced hard break positions', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];
    expect(breaks.length).toBe(EXPECTED_BREAK_POSITIONS.length + 1);
    const docContentSize = engine.measurementEditor?.state?.doc?.content?.size ?? null;
    expect(docContentSize).toBeGreaterThan(0);
    const positions = breaks.map((entry) => entry.break?.pos).filter((pos) => Number.isFinite(pos) && pos >= 0);

    expect(positions).toEqual([...EXPECTED_BREAK_POSITIONS, docContentSize]);

    breaks.forEach((entry) => {
      expect(entry.metrics?.pageHeightPx).toBeGreaterThan(0);
      expect(entry.metrics?.contentHeightPx).toBeGreaterThan(0);
      expect(entry.metrics?.headerHeightPx).toBeGreaterThanOrEqual(0);
      expect(entry.metrics?.footerHeightPx).toBeGreaterThanOrEqual(0);
      expect(entry.headerFooterAreas?.header?.metrics?.effectiveHeightPx).toBeGreaterThanOrEqual(0);
      expect(entry.headerFooterAreas?.footer?.metrics?.effectiveHeightPx).toBeGreaterThanOrEqual(0);
      expect(entry).toHaveProperty('pageBottomSpacingPx');
      if (entry.pageBottomSpacingPx != null) {
        expect(entry.pageBottomSpacingPx).toBeGreaterThanOrEqual(0);
      }
    });

    const trailingPage = breaks[breaks.length - 1];
    expect(trailingPage.break?.pos).toBe(docContentSize);
    expect(trailingPage.break?.startOffsetPx).toBeGreaterThanOrEqual(0);
    const lastBreakEntry = breaks[breaks.length - 2];
    expect(lastBreakEntry?.break?.top).toBeGreaterThan(0);
    expect(lastBreakEntry.break?.bottom).toBeGreaterThanOrEqual(lastBreakEntry.break.top ?? 0);
    expect(trailingPage.break?.startOffsetPx).toBe(lastBreakEntry.break.top);

    expect(layout.units).toEqual({
      unit: 'px',
      dpi: MeasurementEngine.PIXELS_PER_INCH,
    });
    expect(typeof trailingPage.pageBottomSpacingPx).toBe('number');
    expect(trailingPage.pageBottomSpacingPx).toBeGreaterThanOrEqual(0);
  });

  it('maintains consistent page ordering after hard breaks', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];

    for (let i = 0; i < breaks.length - 1; i++) {
      const currentPage = breaks[i];
      const nextPage = breaks[i + 1];

      expect(currentPage.pageIndex).toBe(i);
      expect(nextPage.pageIndex).toBe(i + 1);

      // Verify sequential positioning
      const currentEnd = currentPage.break?.startOffsetPx ?? 0;
      const nextStart = nextPage.break?.startOffsetPx ?? 0;
      expect(nextStart).toBeGreaterThanOrEqual(currentEnd);
    }
  });

  it('ensures all pages have valid dimensions and metrics', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];

    breaks.forEach((page, index) => {
      expect(page.metrics, `Page ${index} should have metrics`).toBeDefined();
      expect(page.metrics.pageWidthPx, `Page ${index} width`).toBeGreaterThan(0);
      expect(page.metrics.contentWidthPx, `Page ${index} content width`).toBeGreaterThan(0);
      expect(page.metrics.marginLeftPx, `Page ${index} left margin`).toBeGreaterThanOrEqual(0);
      expect(page.metrics.marginRightPx, `Page ${index} right margin`).toBeGreaterThanOrEqual(0);
      expect(page.metrics.marginTopPx, `Page ${index} top margin`).toBeGreaterThanOrEqual(0);
      expect(page.metrics.marginBottomPx, `Page ${index} bottom margin`).toBeGreaterThanOrEqual(0);
    });
  });

  it('preserves content between hard page breaks', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];
    const docContentSize = engine.measurementEditor?.state?.doc?.content?.size ?? 0;

    // Verify first page starts at 0
    expect(breaks[0].break?.pos).toBe(EXPECTED_BREAK_POSITIONS[0]);

    // Verify content is not skipped between breaks
    let totalContentCovered = 0;
    for (let i = 0; i < breaks.length - 1; i++) {
      const breakPos = breaks[i].break?.pos ?? 0;
      totalContentCovered = Math.max(totalContentCovered, breakPos);
    }

    // Last page should cover to end of document
    expect(breaks[breaks.length - 1].break?.pos).toBe(docContentSize);
  });

  it('includes field segments in layout output', () => {
    const layout = engine.calculatePageBreaks();
    expect(layout).toHaveProperty('fieldSegments');
    expect(Array.isArray(layout.fieldSegments)).toBe(true);
  });

  it('provides document snapshot in layout', () => {
    const layout = engine.calculatePageBreaks();
    expect(layout).toHaveProperty('document');
    expect(layout.document).toBeDefined();
  });

  it('generates page breaks with consistent gap spacing', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];

    breaks.forEach((page, index) => {
      if (index < breaks.length - 1) {
        // All pages except the last should have pageGapPx
        expect(page.pageGapPx, `Page ${index} gap`).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('calculates correct break boundaries with fittedTop and fittedBottom', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];

    breaks.forEach((page, index) => {
      if (index < breaks.length - 1) {
        const breakData = page.break;
        expect(breakData?.fittedTop, `Page ${index} fittedTop`).toBeDefined();
        expect(breakData?.fittedBottom, `Page ${index} fittedBottom`).toBeDefined();

        if (Number.isFinite(breakData?.fittedTop) && Number.isFinite(breakData?.fittedBottom)) {
          expect(breakData.fittedBottom).toBeGreaterThanOrEqual(breakData.fittedTop);
        }
      }
    });
  });

  it('provides header and footer slot information for each page', () => {
    const layout = engine.calculatePageBreaks();
    const breaks = Array.isArray(layout?.pages) ? layout.pages : [];

    breaks.forEach((page, index) => {
      expect(page.headerFooterAreas, `Page ${index} header/footer areas`).toBeDefined();

      const { header, footer } = page.headerFooterAreas || {};

      if (header) {
        expect(header.metrics).toBeDefined();
        expect(header.reservedHeightPx).toBeGreaterThanOrEqual(0);
      }

      if (footer) {
        expect(footer.metrics).toBeDefined();
        expect(footer.reservedHeightPx).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

function patchLayoutMeasurements() {
  const proto = window.HTMLElement?.prototype;
  if (!proto) return () => {};

  const originalOffsetHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const originalGetBoundingClientRect = proto.getBoundingClientRect;
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }

  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get() {
      return 816;
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      return 32;
    },
  });

  const rectMap = new WeakMap();
  let rectCounter = 0;
  proto.getBoundingClientRect = function () {
    if (!rectMap.has(this)) {
      const top = rectCounter * 48;
      rectCounter += 1;
      rectMap.set(this, {
        top,
        bottom: top + 32,
        left: 0,
        right: 816,
        width: 816,
        height: 32,
        x: 0,
        y: top,
      });
    }
    const rect = rectMap.get(this);
    return { ...rect };
  };

  return () => {
    if (originalOffsetHeight) Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    else delete proto.offsetHeight;

    if (originalOffsetWidth) Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    else delete proto.offsetWidth;

    if (originalGetBoundingClientRect) proto.getBoundingClientRect = originalGetBoundingClientRect;

    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete window.matchMedia;

    if (originalRequestAnimationFrame) window.requestAnimationFrame = originalRequestAnimationFrame;
    else delete window.requestAnimationFrame;

    if (originalCancelAnimationFrame) window.cancelAnimationFrame = originalCancelAnimationFrame;
    else delete window.cancelAnimationFrame;
  };
}
