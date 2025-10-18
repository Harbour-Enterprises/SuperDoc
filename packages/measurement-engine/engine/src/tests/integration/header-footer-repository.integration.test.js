// @vitest-environment jsdom
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHeaderFooterRepository } from '@extensions/pagination/header-footer-repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../../super-editor/src/tests/data/pagination-first-odd-even-headers-mixed-sizes.docx',
);

let restoreDomPatches;
let Editor;
let getStarterExtensions;
let editor;
let debugSpy;
let repositorySpy;

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
      return 816;
    },
  });

  Object.defineProperty(proto, 'offsetHeight', {
    configurable: true,
    get() {
      if (!this.querySelectorAll) return 18;
      const paragraphCount = this.querySelectorAll('p').length || 1;
      return paragraphCount * 18;
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
  const repositoryModule = await vi.importActual(
    '../../../../../super-editor/src/extensions/pagination/header-footer-repository.js',
  );
  repositorySpy = vi.spyOn(repositoryModule, 'createHeaderFooterRepository');

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

  // Use full starter extensions so the pagination extension initializes the repository.
  const extensions = getStarterExtensions();

  debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

  editor = new Editor({
    element: mount,
    extensions,
    content: docx,
    media,
    mediaFiles,
    fonts,
    pagination: true,
    annotations: true,
  });

  afterAll(() => {
    debugSpy.mockRestore();
  });
});

afterAll(() => {
  editor?.destroy?.();
  editor = null;
  document.body.innerHTML = '';

  if (typeof restoreDomPatches === 'function') {
    restoreDomPatches();
  }

  debugSpy?.mockRestore();
  repositorySpy?.mockRestore();
});

describe('pagination repository initialization', () => {
  it('seeds header and footer records when pagination is enabled', async () => {
    // Repository seeding happens during the pagination extension lifecycle,
    // so wait for the microtask queue to flush.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(editor?.options?.isHeadless).toBe(false);
    expect(editor?.options?.pagination).toBe(true);

    const storage = editor?.storage?.pagination;
    const manualRepo = createHeaderFooterRepository({ converter: editor.converter });
    expect(manualRepo.list('header').length).toBeGreaterThan(0);
    expect(manualRepo.list('footer').length).toBeGreaterThan(0);

    const repo = storage?.repository;
    expect(repo).toBeTruthy();

    const headers = repo?.list?.('header') ?? [];
    const footers = repo?.list?.('footer') ?? [];

    expect(headers.length).toBeGreaterThan(0);
    expect(footers.length).toBeGreaterThan(0);
  });
});
