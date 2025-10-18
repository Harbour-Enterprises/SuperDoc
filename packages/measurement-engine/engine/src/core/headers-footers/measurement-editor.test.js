// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import { measureSectionWithMeasurementEditor, getMeasurementExtensions } from './measurement-editor.js';

const measurementEditorInstances = [];

vi.mock('@core/Editor.js', () => {
  class MockEditor {
    constructor(config = {}) {
      this.options = config.options ?? {};
      this.converter = config.converter ?? {};
      this.storage = config.storage ?? {};
      this.view = config.view ?? {};
      this.destroy = vi.fn();

      if (config.element) {
        this.config = config;
        const api = {
          setEditable: vi.fn(),
        };
        config.onCreate?.({ editor: api });
        measurementEditorInstances.push({ instance: this, api });
      }
    }
  }

  return { Editor: MockEditor };
});

vi.mock('@extensions/index.js', () => ({
  getStarterExtensions: vi.fn(() => [{ name: 'paragraph' }, { name: 'pagination' }, { name: 'comment' }]),
}));

class EditorStub extends Editor {
  static reset() {
    measurementEditorInstances.length = 0;
  }
}

const createDomStubs = (height = 120) => {
  const removeChild = vi.fn();
  const doc = {
    body: {
      appendChild: vi.fn((element) => {
        element.parentNode = { removeChild };
      }),
    },
    createElement: vi.fn(() => ({
      style: {},
      className: '',
      parentNode: null,
      offsetHeight: height,
      querySelectorAll: () => [],
    })),
  };

  return { doc, removeChild };
};

beforeEach(() => {
  vi.clearAllMocks();
  EditorStub.reset();
});

afterEach(() => {
  EditorStub.reset();
});

describe('measureSectionWithMeasurementEditor', () => {
  it('measures section height and cleans up instances', async () => {
    const { doc, removeChild } = createDomStubs(180);
    const win = {
      requestAnimationFrame: vi.fn((cb) => {
        const id = setTimeout(cb, 0);
        return id;
      }),
    };
    const editor = new EditorStub({
      options: { fonts: {} },
      converter: { getDocumentDefaultStyles: () => ({}) },
      storage: { image: { media: { stored: true } } },
    });

    const height = await measureSectionWithMeasurementEditor({
      editor,
      record: { id: 'header-1', type: 'header', contentJson: { type: 'doc' } },
      doc,
      win,
      measurementExtensions: [],
      widthPx: 320,
    });

    expect(height).toBe(180);
    expect(removeChild).toHaveBeenCalled();
    const measurementInstance = measurementEditorInstances[0];
    expect(measurementInstance.instance.destroy).toHaveBeenCalledTimes(1);
    expect(measurementInstance.api.setEditable).toHaveBeenCalledWith(false, false);
    expect(measurementInstance.instance.config.media).toEqual(editor.storage.image.media);
  });
});

describe('getMeasurementExtensions', () => {
  it('filters pagination extension and caches per editor', () => {
    const editor = new EditorStub({});
    const extensionsA = getMeasurementExtensions(editor);
    const extensionsB = getMeasurementExtensions(editor);

    const extensionNames = extensionsA.map((ext) => ext.name ?? ext?.config?.name);
    expect(extensionNames).toEqual(['paragraph', 'comment']);
    expect(extensionsB).toBe(extensionsA);
  });
});
