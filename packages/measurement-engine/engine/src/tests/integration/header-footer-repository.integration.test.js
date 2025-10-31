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

  it('provides repository methods for listing, getting, and checking existence', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    expect(repo).toBeTruthy();

    // Verify repository API
    expect(typeof repo.list).toBe('function');
    expect(typeof repo.get).toBe('function');
    expect(typeof repo.has).toBe('function');
  });

  it('retrieves header records by ID from repository', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    const headers = repo.list('header');

    expect(headers.length).toBeGreaterThan(0);

    // Get the first header by ID
    const firstHeader = headers[0];
    const retrieved = repo.get(firstHeader.id, 'header');

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(firstHeader.id);
    expect(retrieved.type).toBe('header');
  });

  it('retrieves footer records by ID from repository', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    const footers = repo.list('footer');

    expect(footers.length).toBeGreaterThan(0);

    // Get the first footer by ID
    const firstFooter = footers[0];
    const retrieved = repo.get(firstFooter.id, 'footer');

    expect(retrieved).toBeDefined();
    expect(retrieved.id).toBe(firstFooter.id);
    expect(retrieved.type).toBe('footer');
  });

  it('verifies existence of headers and footers using has() method', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    const headers = repo.list('header');
    const footers = repo.list('footer');

    headers.forEach((header) => {
      expect(repo.has(header.id, 'header')).toBe(true);
    });

    footers.forEach((footer) => {
      expect(repo.has(footer.id, 'footer')).toBe(true);
    });
  });

  it('returns false for non-existent header/footer IDs', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;

    expect(repo.has('non-existent-id', 'header')).toBe(false);
    expect(repo.has('non-existent-id', 'footer')).toBe(false);
    expect(repo.get('non-existent-id', 'header')).toBeNull();
  });

  it('includes content in header/footer records', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    const headers = repo.list('header');
    const footers = repo.list('footer');

    headers.forEach((header) => {
      expect(header).toHaveProperty('id');
      expect(header).toHaveProperty('type');
      expect(header).toHaveProperty('content');
      expect(header.type).toBe('header');
    });

    footers.forEach((footer) => {
      expect(footer).toHaveProperty('id');
      expect(footer).toHaveProperty('type');
      expect(footer).toHaveProperty('content');
      expect(footer.type).toBe('footer');
    });
  });

  it('maintains separate collections for headers and footers', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;
    const headers = repo.list('header');
    const footers = repo.list('footer');

    // Verify no overlap
    const headerIds = new Set(headers.map((h) => h.id));
    const footerIds = new Set(footers.map((f) => f.id));

    footers.forEach((footer) => {
      expect(headerIds.has(footer.id)).toBe(false);
    });

    headers.forEach((header) => {
      expect(footerIds.has(header.id)).toBe(false);
    });
  });

  it('initializes repository from converter data', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const manualRepo = createHeaderFooterRepository({ converter: editor.converter });
    const autoRepo = editor?.storage?.pagination?.repository;

    const manualHeaders = manualRepo.list('header');
    const autoHeaders = autoRepo.list('header');

    // Both should have the same headers
    expect(autoHeaders.length).toBe(manualHeaders.length);

    const manualFooters = manualRepo.list('footer');
    const autoFooters = autoRepo.list('footer');

    // Both should have the same footers
    expect(autoFooters.length).toBe(manualFooters.length);
  });

  it('provides consistent header/footer records across multiple calls', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const repo = editor?.storage?.pagination?.repository;

    const headers1 = repo.list('header');
    const headers2 = repo.list('header');

    expect(headers1.length).toBe(headers2.length);
    expect(headers1).toEqual(headers2);

    const footers1 = repo.list('footer');
    const footers2 = repo.list('footer');

    expect(footers1.length).toBe(footers2.length);
    expect(footers1).toEqual(footers2);
  });

  it('handles repository creation with valid converter instance', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(editor.converter).toBeDefined();

    const testRepo = createHeaderFooterRepository({ converter: editor.converter });
    expect(testRepo).toBeTruthy();
    expect(typeof testRepo.list).toBe('function');
    expect(typeof testRepo.get).toBe('function');
    expect(typeof testRepo.has).toBe('function');
  });

  it('stores repository in pagination storage for external access', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const storage = editor?.storage?.pagination;
    expect(storage).toBeDefined();
    expect(storage.repository).toBeDefined();

    // Repository should be accessible from storage
    const repo = storage.repository;
    expect(repo.list('header').length).toBeGreaterThan(0);
    expect(repo.list('footer').length).toBeGreaterThan(0);
  });
});
