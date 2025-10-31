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

  it('includes all expected section IDs in metrics map', () => {
    const metrics = summary.sectionMetricsById;
    const expectedIds = ['rId10', 'rId6', 'rId7', 'rId11', 'rId8', 'rId9'];

    expectedIds.forEach((id) => {
      expect(metrics.has(id), `Should have metrics for ${id}`).toBe(true);
    });
  });

  it('ensures all metrics have valid positive dimensions', () => {
    const metrics = summary.sectionMetricsById;

    metrics.forEach((metric, id) => {
      expect(metric.contentHeightPx, `${id} content height`).toBeGreaterThanOrEqual(0);
      expect(metric.effectiveHeightPx, `${id} effective height`).toBeGreaterThanOrEqual(0);
      expect(metric.distancePx, `${id} distance`).toBeGreaterThanOrEqual(0);
      expect(metric.effectiveHeightPx, `${id} effective >= content`).toBeGreaterThanOrEqual(metric.contentHeightPx);
    });
  });

  it('verifies variant lookup contains both header and footer sections', () => {
    expect(summary.variantLookup).toBeDefined();
    expect(summary.variantLookup.header).toBeInstanceOf(Map);
    expect(summary.variantLookup.footer).toBeInstanceOf(Map);

    expect(summary.variantLookup.header.size).toBeGreaterThan(0);
    expect(summary.variantLookup.footer.size).toBeGreaterThan(0);
  });

  it('ensures header and footer variants map to valid section IDs', () => {
    const { variantLookup, sectionMetricsById } = summary;

    const headerIds = Array.from(variantLookup.header.values());
    const footerIds = Array.from(variantLookup.footer.values());

    headerIds.forEach((id) => {
      expect(sectionMetricsById.has(id), `Header ${id} should have metrics`).toBe(true);
    });

    footerIds.forEach((id) => {
      expect(sectionMetricsById.has(id), `Footer ${id} should have metrics`).toBe(true);
    });
  });

  it('calculates effective height as distance plus content height', () => {
    const metrics = summary.sectionMetricsById;

    metrics.forEach((metric, id) => {
      const expectedEffective = metric.distancePx + metric.contentHeightPx;
      expect(metric.effectiveHeightPx, `${id} effective height calculation`).toBe(expectedEffective);
    });
  });

  it('provides consistent distances across all sections', () => {
    const metrics = summary.sectionMetricsById;
    const distances = Array.from(metrics.values()).map((m) => m.distancePx);
    const uniqueDistances = [...new Set(distances)];

    // All sections in this fixture should have the same distance
    expect(uniqueDistances.length).toBe(1);
    expect(uniqueDistances[0]).toBe(SECTION_DISTANCE_PX);
  });

  it('measures header variants with different paragraph counts accurately', () => {
    const metrics = summary.sectionMetricsById;

    // rId7 has 7 paragraphs (default header)
    const defaultHeader = metrics.get('rId7');
    expect(defaultHeader.contentHeightPx).toBe(BASELINE_LINE_HEIGHT * 7);

    // rId6 has 2 paragraphs (even header)
    const evenHeader = metrics.get('rId6');
    expect(evenHeader.contentHeightPx).toBe(BASELINE_LINE_HEIGHT * 2);

    // rId10 has 1 paragraph (first header)
    const firstHeader = metrics.get('rId10');
    expect(firstHeader.contentHeightPx).toBe(BASELINE_LINE_HEIGHT);
  });

  it('measures footer variants with different paragraph counts accurately', () => {
    const metrics = summary.sectionMetricsById;

    // rId9 has 6 paragraphs (default footer)
    const defaultFooter = metrics.get('rId9');
    expect(defaultFooter.contentHeightPx).toBe(BASELINE_LINE_HEIGHT * 6);

    // rId8 has 1 paragraph (even footer)
    const evenFooter = metrics.get('rId8');
    expect(evenFooter.contentHeightPx).toBe(BASELINE_LINE_HEIGHT);

    // rId11 has 1 paragraph (first footer)
    const firstFooter = metrics.get('rId11');
    expect(firstFooter.contentHeightPx).toBe(BASELINE_LINE_HEIGHT);
  });

  it('returns summary object with all expected top-level properties', () => {
    expect(summary).toHaveProperty('contentWidthPx');
    expect(summary).toHaveProperty('distancesPx');
    expect(summary).toHaveProperty('variantLookup');
    expect(summary).toHaveProperty('sectionMetricsById');

    expect(typeof summary.contentWidthPx).toBe('number');
    expect(typeof summary.distancesPx).toBe('object');
    expect(summary.variantLookup).toBeInstanceOf(Object);
    expect(summary.sectionMetricsById).toBeInstanceOf(Map);
  });
});
