import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as shadowRootUtils from '@/utils/shadow-root.js';

const resetCache = () => shadowRootUtils.__shadowRootTestUtils().resetStyleSheetCache();

beforeEach(() => {
  resetCache();
});

afterEach(() => {
  resetCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('supportsConstructableStylesheets', () => {
  it('returns false when CSSStyleSheet global is missing', () => {
    vi.stubGlobal('CSSStyleSheet', undefined);
    expect(shadowRootUtils.supportsConstructableStylesheets()).toBe(false);
  });

  it('returns true when required APIs exist', () => {
    const replaceSync = vi.fn();
    class FakeCSSStyleSheet {
      constructor() {
        this.replaceSync = replaceSync;
      }
    }
    FakeCSSStyleSheet.prototype.replaceSync = replaceSync;

    class FakeDocument {}
    Object.defineProperty(FakeDocument.prototype, 'adoptedStyleSheets', {
      value: [],
      configurable: true,
    });

    vi.stubGlobal('CSSStyleSheet', FakeCSSStyleSheet);
    vi.stubGlobal('Document', FakeDocument);

    expect(shadowRootUtils.supportsConstructableStylesheets()).toBe(true);
  });
});

describe('ensureStyleSheet', () => {
  it('injects inline styles when constructable stylesheets are not supported', () => {
    let storedNode = null;
    const appendChild = vi.fn((node) => {
      storedNode = node;
    });
    const root = {
      querySelector: vi.fn(() => storedNode),
      appendChild,
    };

    const fakeDocument = {
      createElement: vi.fn(() => ({
        nodeName: 'style',
        setAttribute: vi.fn(),
        textContent: '',
      })),
    };

    vi.stubGlobal('CSSStyleSheet', undefined);
    vi.stubGlobal('document', fakeDocument);
    expect(shadowRootUtils.supportsConstructableStylesheets()).toBe(false);
    shadowRootUtils.__shadowRootTestUtils().overrideEditorStyles('body{color:red;}');

    shadowRootUtils.ensureStyleSheet(root);
    expect(fakeDocument.createElement).toHaveBeenCalledWith('style');
    expect(appendChild).toHaveBeenCalledTimes(1);

    // Re-running should not duplicate the tag
    shadowRootUtils.ensureStyleSheet(root);
    expect(appendChild).toHaveBeenCalledTimes(1);
  });

  it('applies constructable stylesheet when supported', () => {
    const replaceSync = vi.fn();
    class FakeCSSStyleSheet {
      constructor() {
        this.replaceSync = replaceSync;
      }
    }
    FakeCSSStyleSheet.prototype.replaceSync = replaceSync;

    class FakeDocument {}
    Object.defineProperty(FakeDocument.prototype, 'adoptedStyleSheets', {
      value: [],
      configurable: true,
    });

    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    let adoptedSheets = [];
    Object.defineProperty(root, 'adoptedStyleSheets', {
      get: () => adoptedSheets,
      set: (value) => {
        adoptedSheets = value;
      },
      configurable: true,
    });

    vi.stubGlobal('CSSStyleSheet', FakeCSSStyleSheet);
    vi.stubGlobal('Document', FakeDocument);
    expect(shadowRootUtils.supportsConstructableStylesheets()).toBe(true);
    shadowRootUtils.__shadowRootTestUtils().overrideEditorStyles('body{color:blue;}');

    shadowRootUtils.ensureStyleSheet(root);
    expect(replaceSync).toHaveBeenCalledTimes(1);
    expect(adoptedSheets).toHaveLength(1);

    shadowRootUtils.ensureStyleSheet(root);
    expect(replaceSync).toHaveBeenCalledTimes(1);
    expect(adoptedSheets).toHaveLength(1);
  });
});

describe('ensureEditorShadowRoot', () => {
  it('creates a shadow root and mount point when none exist', () => {
    const host = document.createElement('div');
    const { root, mount } = shadowRootUtils.ensureEditorShadowRoot(host);

    expect(root).toBe(host.shadowRoot);
    expect(mount).not.toBeNull();
    expect(mount?.classList.contains('sd-editor-mount')).toBe(true);
  });

  it('reuses existing mount point on subsequent calls', () => {
    const host = document.createElement('div');
    const first = shadowRootUtils.ensureEditorShadowRoot(host);
    const second = shadowRootUtils.ensureEditorShadowRoot(host);

    expect(second.mount).toBe(first.mount);
    expect(host.shadowRoot?.querySelectorAll('.sd-editor-mount')).toHaveLength(1);
  });

  it('gracefully handles missing host element', () => {
    expect(shadowRootUtils.ensureEditorShadowRoot(null)).toEqual({ root: null, mount: null });
  });

  it('returns null mount when document is unavailable', () => {
    const host = document.createElement('div');
    const originalDocument = globalThis.document;
    vi.stubGlobal('document', undefined);

    const result = shadowRootUtils.ensureEditorShadowRoot(host);
    expect(result).toEqual({ root: null, mount: null });

    vi.stubGlobal('document', originalDocument);
  });
});
