// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { measureHeaderFooterSections } from '../../core/headers-footers/index.js';
import { createHeaderFooterRepository } from '@extensions/pagination/header-footer-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, '../../../../../super-editor/src/tests/data/header-footer-expands.docx');

const BASELINE_LINE_HEIGHT = 24;
const HEADER_LINE_COUNT = 6;
const FOOTER_LINE_COUNT = 7;

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
  const originalGetBoundingClientRect = proto.getBoundingClientRect;
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
      return 816;
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      if (!this.querySelectorAll) return BASELINE_LINE_HEIGHT;
      const paragraphs = this.querySelectorAll('p, tr, li');
      const counted = paragraphs.length || 1;
      return counted * BASELINE_LINE_HEIGHT;
    },
  });

  proto.getBoundingClientRect = function getBoundingClientRect() {
    const height = Number.isFinite(this.offsetHeight) ? this.offsetHeight : BASELINE_LINE_HEIGHT;
    const width = Number.isFinite(this.offsetWidth) ? this.offsetWidth : 816;
    return {
      x: 0,
      y: 0,
      top: 0,
      bottom: height,
      left: 0,
      right: width,
      width,
      height,
      toJSON() {
        return this;
      },
    };
  };

  return () => {
    if (originalOffsetHeight) Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    else delete proto.offsetHeight;

    if (originalOffsetWidth) Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    else delete proto.offsetWidth;

    if (originalGetBoundingClientRect) proto.getBoundingClientRect = originalGetBoundingClientRect;
    else delete proto.getBoundingClientRect;

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
  const file = new File([blob], 'header-footer-expands.docx', { type: blob.type });
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

describe('header/footer measurement when content expands the section', () => {
  it('reports content heights that exceed the margin allowance', () => {
    expect(summary).toBeTruthy();
    const metrics = summary.sectionMetricsById;
    const headerId = summary.variantLookup.header.get('default');
    const footerId = summary.variantLookup.footer.get('default');

    expect(headerId).toBeTruthy();
    expect(footerId).toBeTruthy();

    const headerMetrics = metrics.get(headerId);
    const footerMetrics = metrics.get(footerId);

    const { header: headerDistance, footer: footerDistance } = summary.distancesPx ?? {};

    expect(headerMetrics?.distancePx).toBe(headerDistance);
    expect(footerMetrics?.distancePx).toBe(footerDistance);

    expect(headerMetrics?.contentHeightPx).toBe(BASELINE_LINE_HEIGHT * HEADER_LINE_COUNT);
    expect(footerMetrics?.contentHeightPx).toBe(BASELINE_LINE_HEIGHT * FOOTER_LINE_COUNT);

    expect(headerMetrics.effectiveHeightPx).toBe(headerMetrics.contentHeightPx + headerMetrics.distancePx);
    expect(footerMetrics.effectiveHeightPx).toBe(footerMetrics.contentHeightPx + footerMetrics.distancePx);

    expect(headerMetrics.effectiveHeightPx).toBeGreaterThan(150);
    expect(footerMetrics.effectiveHeightPx).toBeGreaterThan(150);
  });
});
