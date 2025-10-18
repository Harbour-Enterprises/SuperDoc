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
    expect(trailingPage.break?.startOffsetPx).toBe(lastBreakEntry.break.bottom);

    expect(layout.units).toEqual({
      unit: 'px',
      dpi: MeasurementEngine.PIXELS_PER_INCH,
    });
    expect(typeof trailingPage.pageBottomSpacingPx).toBe('number');
    expect(trailingPage.pageBottomSpacingPx).toBeGreaterThanOrEqual(0);
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
