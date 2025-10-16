import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { Editor } from '@core/Editor.js';

describe('Editor environment detection', () => {
  let originalWindow;
  let originalDocument;
  let originalNavigator;

  beforeEach(() => {
    originalWindow = global.window;
    originalDocument = global.document;
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalWindow) {
      global.window = originalWindow;
    } else {
      delete global.window;
    }

    if (originalDocument) {
      global.document = originalDocument;
    } else {
      delete global.document;
    }

    if (originalNavigator) {
      global.navigator = originalNavigator;
    } else {
      delete global.navigator;
    }
  });

  it('does not force DOM-capable runtimes into headless mode', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const editor = new Editor({
      mode: 'text',
      documentId: 'env-test-dom',
      element: container,
      extensions: [],
    });

    expect(editor.isNode).toBe(false);

    editor.destroy();
    container.remove();
  });

  it('hoists mock document/window when running headless without a DOM', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('navigator', undefined);

    const { window: mockWindow } = new JSDOM('<!doctype html><html><body></body></html>');
    const mockDocument = mockWindow.document;

    const editor = new Editor({
      mode: 'text',
      documentId: 'env-test-headless',
      mockDocument,
      mockWindow,
      extensions: [],
    });

    expect(editor.isNode).toBe(true);
    expect(global.document).toBe(mockDocument);
    expect(global.window).toBe(mockWindow);
    expect(global.navigator).toBeDefined();

    editor.destroy();
    mockWindow.close();
  });
});
