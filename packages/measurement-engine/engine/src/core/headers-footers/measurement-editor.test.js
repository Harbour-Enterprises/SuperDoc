// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import { measureSectionWithMeasurementEditor, getMeasurementExtensions } from './measurement-editor.js';

const measurementEditorInstances = [];
let nextMeasurementViewConfig = null;

const setMeasurementViewConfig = (config = null) => {
  nextMeasurementViewConfig = config ? { ...config } : null;
};

const fallbackOwnerDocument = {
  defaultView: {
    getComputedStyle: () => ({ position: 'static', display: 'block' }),
  },
};

const createMeasurementViewDom = (element) => {
  const config = nextMeasurementViewConfig ?? {};
  nextMeasurementViewConfig = null;

  const ownerDocument = config.ownerDocument ?? element?.ownerDocument ?? fallbackOwnerDocument;
  const nodes = Array.isArray(config.nodes) ? config.nodes : [];
  const offsetHeight = Number.isFinite(config.offsetHeight) ? config.offsetHeight : (element?.offsetHeight ?? 0);
  const scrollHeight = Number.isFinite(config.scrollHeight)
    ? config.scrollHeight
    : (element?.scrollHeight ?? offsetHeight);
  const rectHeight = Number.isFinite(config.rectHeight) ? config.rectHeight : offsetHeight;

  return {
    ownerDocument,
    offsetHeight,
    scrollHeight,
    getBoundingClientRect: () => ({ height: rectHeight }),
    querySelectorAll: (selector) => {
      if (selector === '[data-node-type]') {
        return nodes;
      }
      return [];
    },
  };
};

vi.mock('@core/Editor.js', () => {
  class MockEditor {
    constructor(config = {}) {
      this.options = config.options ?? {};
      this.converter = config.converter ?? {};
      this.storage = config.storage ?? {};
      const dom = createMeasurementViewDom(config.element);
      this.view = config.view ?? { dom };
      this.setEditable = vi.fn();
      this.destroy = vi.fn();

      if (config.element) {
        this.config = config;
        config.onCreate?.({ editor: this });
        measurementEditorInstances.push({ instance: this });
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
    setMeasurementViewConfig(null);
  }
}

const createDomStubs = (height = 120) => {
  const removeChild = vi.fn();
  const defaultView = {
    getComputedStyle: (node) => node?.__style ?? { position: 'static', display: 'block' },
  };
  const doc = {
    defaultView,
    body: {
      appendChild: vi.fn((element) => {
        element.parentNode = { removeChild };
      }),
    },
  };

  doc.createElement = vi.fn(() => ({
    style: {},
    className: '',
    parentNode: null,
    ownerDocument: doc,
    offsetHeight: height,
    scrollHeight: height,
    getBoundingClientRect: () => ({ height }),
    querySelectorAll: vi.fn(() => []),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  return { doc, removeChild };
};

const createFlowNode = ({ top, bottom, position = 'static', display = 'block' }) => ({
  __style: { position, display },
  getBoundingClientRect: () => ({
    top,
    bottom,
    height: bottom - top,
  }),
});

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
    const measurementInstance = measurementEditorInstances[0]?.instance;
    expect(measurementInstance?.destroy).toHaveBeenCalledTimes(1);
    expect(measurementInstance?.setEditable).toHaveBeenCalledWith(false, false);
    expect(measurementInstance?.config?.media).toEqual(editor.storage.image.media);
  });

  it('uses flow content height when overflow clips container metrics', async () => {
    const { doc, removeChild } = createDomStubs(40);
    const win = {
      requestAnimationFrame: vi.fn((cb) => {
        cb();
        return 1;
      }),
    };

    const editor = new EditorStub({
      options: { fonts: {} },
      converter: { getDocumentDefaultStyles: () => ({}) },
      storage: { image: { media: { stored: true } } },
    });

    setMeasurementViewConfig({
      ownerDocument: doc,
      nodes: [
        createFlowNode({ top: 10, bottom: 70 }),
        createFlowNode({ top: 90, bottom: 210 }),
        createFlowNode({ top: 0, bottom: 500, position: 'absolute' }),
        createFlowNode({ top: 0, bottom: 0, display: 'none' }),
      ],
      offsetHeight: 24,
      scrollHeight: 24,
      rectHeight: 24,
    });

    const height = await measureSectionWithMeasurementEditor({
      editor,
      record: { id: 'header-flow', type: 'header', contentJson: { type: 'doc' } },
      doc,
      win,
      measurementExtensions: [],
      widthPx: 320,
    });

    expect(height).toBe(200);
    expect(removeChild).toHaveBeenCalled();
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
