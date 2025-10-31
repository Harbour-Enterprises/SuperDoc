// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isHtmlFieldNode } from '../engine/src/core/field-annotations-measurements/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, './multipage-html-field.docx');

let Editor;
let getStarterExtensions;
let MeasurementEngine;

let editor;
let engine;
let restoreDomPatches;

beforeAll(async () => {
  ({ Editor, getStarterExtensions } = await vi.importActual('../engine/src/index.js'));
  ({ MeasurementEngine } = await vi.importActual('../engine/src/index.js'));

  restoreDomPatches = patchMeasurementDom();

  const fileBuffer = await readFile(FIXTURE_PATH);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const file = new File([blob], 'multipage-html-field.docx', { type: blob.type });
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

  await engine.awaitReady();
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

describe('multipage HTML field pagination', () => {
  it('keeps the initial html field span on the first page', () => {
    const layout = engine.calculatePageBreaks();
    expect(Array.isArray(layout?.pages)).toBe(true);
    expect(layout.pages.length).toBeGreaterThan(0);

    const doc = engine.measurementEditor?.state?.doc;
    expect(doc).toBeTruthy();

    let fieldStart = null;
    let fieldEnd = null;

    doc?.descendants((node, pos) => {
      if (isHtmlFieldNode(node)) {
        fieldStart = pos;
        fieldEnd = pos + node.nodeSize;
        return false;
      }
      return true;
    });

    expect(fieldStart).not.toBeNull();
    expect(fieldEnd).not.toBeNull();

    const firstBreak = engine.pageBreaks?.[0];
    expect(firstBreak?.break?.pos).toBeGreaterThanOrEqual(fieldEnd);

    const fieldSegments = Array.isArray(layout.fieldSegments) ? layout.fieldSegments : [];
    expect(fieldSegments.length).toBeGreaterThan(0);

    const firstPageSegments = fieldSegments
      .flatMap((field) => field.segments || [])
      .filter((segment) => segment.pageIndex === 0);

    expect(firstPageSegments.length).toBeGreaterThan(0);
    firstPageSegments.forEach((segment) => {
      expect(segment.heightPx).toBeGreaterThan(0);
    });
  });
});

function patchMeasurementDom() {
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
        bottom: top + 120,
        left: 0,
        right: 816,
        width: 816,
        height: 120,
      });
    }
    return rectMap.get(this);
  };

  return () => {
    if (originalOffsetWidth) {
      Object.defineProperty(proto, 'offsetWidth', originalOffsetWidth);
    } else {
      delete proto.offsetWidth;
    }

    if (originalOffsetHeight) {
      Object.defineProperty(proto, 'offsetHeight', originalOffsetHeight);
    } else {
      delete proto.offsetHeight;
    }

    if (originalGetBoundingClientRect) {
      proto.getBoundingClientRect = originalGetBoundingClientRect;
    } else {
      delete proto.getBoundingClientRect;
    }

    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
  };
}
