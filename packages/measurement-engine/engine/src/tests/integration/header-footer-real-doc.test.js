// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { measureHeaderFooterSections } from '../../core/headers-footers/index.js';
import { createHeaderFooterRepository } from '@extensions/pagination/header-footer-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../super-editor/src/tests/data/pagination-first-odd-even-headers-mixed-sizes.docx',
);

const BASELINE_LINE_HEIGHT = 18;
const PAGE_CONTENT_WIDTH_PX = 624;
const SECTION_DISTANCE_PX = 48;

let restoreDomPatches;
let editor;
let summary;
let Editor;
let getStarterExtensions;

const patchMeasurementEnvironment = () => {
  const proto = window.HTMLElement?.prototype;
  if (!proto) return () => {};

  const originalOffsetHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const originalMatchMedia = window.matchMedia;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }

  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get() {
      return 816; // default page width in px (8.5")
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      if (!this.querySelectorAll) return BASELINE_LINE_HEIGHT;
      const paragraphCount = this.querySelectorAll('p').length || 1;
      return paragraphCount * BASELINE_LINE_HEIGHT;
    },
  });

  return () => {
    if (originalOffsetHeight) Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    else delete proto.offsetHeight;

    if (originalOffsetWidth) Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    else delete proto.offsetWidth;

    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
    else delete window.matchMedia;

    if (originalRequestAnimationFrame) window.requestAnimationFrame = originalRequestAnimationFrame;
    else delete window.requestAnimationFrame;

    if (originalCancelAnimationFrame) window.cancelAnimationFrame = originalCancelAnimationFrame;
    else delete window.cancelAnimationFrame;
  };
};

beforeAll(async () => {
  ({ Editor, getStarterExtensions } = await vi.importActual('../../index.js'));

  restoreDomPatches = patchMeasurementEnvironment();

  const fileBuffer = await readFile(FIXTURE_PATH);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const file = new File([blob], 'pagination-first-odd-even-headers-mixed-sizes.docx', { type: blob.type });
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(file);

  const mount = document.createElement('div');
  document.body.appendChild(mount);

  const extensions = getStarterExtensions().filter((extension) => extension?.name !== 'pagination');

  editor = new Editor({
    element: mount,
    extensions,
    content: docx,
    media,
    mediaFiles,
    fonts,
    mockDocument: document,
    mockWindow: window,
    pagination: false,
    isHeadless: true,
    isNewFile: true,
  });

  const repository = createHeaderFooterRepository({ converter: editor.converter });
  summary = await measureHeaderFooterSections({ editor, repository });
});

afterAll(() => {
  editor?.destroy?.();
  editor = null;

  if (typeof restoreDomPatches === 'function') {
    restoreDomPatches();
  }

  document.body.innerHTML = '';
});

describe('header/footer measurements with real docx fixtures', () => {
  it('maps first, even, and odd variants to distinct section ids', () => {
    expect(summary).toBeTruthy();

    const headerVariants = summary.variantLookup?.header;
    const footerVariants = summary.variantLookup?.footer;

    expect(headerVariants.get('first')).toBe('rId10');
    expect(headerVariants.get('even')).toBe('rId6');
    expect(headerVariants.get('default')).toBe('rId7');

    expect(footerVariants.get('first')).toBe('rId11');
    expect(footerVariants.get('even')).toBe('rId8');
    expect(footerVariants.get('default')).toBe('rId9');
  });

  it('produces differentiated content heights for mixed header/footer layouts', () => {
    const metrics = summary.sectionMetricsById;
    expect(metrics.size).toBeGreaterThanOrEqual(6);

    const expectMetrics = (id, expectedContent, expectedEffective) => {
      const entry = metrics.get(id);
      expect(entry?.contentHeightPx).toBe(expectedContent);
      expect(entry?.distancePx).toBe(SECTION_DISTANCE_PX);
      expect(entry?.effectiveHeightPx).toBe(expectedEffective);
    };

    expectMetrics('rId10', BASELINE_LINE_HEIGHT, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT);
    expectMetrics('rId6', BASELINE_LINE_HEIGHT * 2, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT * 2);
    expectMetrics('rId7', BASELINE_LINE_HEIGHT * 7, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT * 7);

    expectMetrics('rId11', BASELINE_LINE_HEIGHT, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT);
    expectMetrics('rId8', BASELINE_LINE_HEIGHT, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT);
    expectMetrics('rId9', BASELINE_LINE_HEIGHT * 6, SECTION_DISTANCE_PX + BASELINE_LINE_HEIGHT * 6);
  });

  it('reports the document content width and margin distances from the converter', () => {
    expect(summary.contentWidthPx).toBe(PAGE_CONTENT_WIDTH_PX);
    expect(summary.distancesPx).toEqual({ header: SECTION_DISTANCE_PX, footer: SECTION_DISTANCE_PX });
  });
});
