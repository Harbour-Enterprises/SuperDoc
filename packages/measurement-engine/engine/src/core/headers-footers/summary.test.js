// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@core/Editor.js';
import {
  getHeaderFooterRecords,
  getMeasurementEnvironment,
  measureHeaderFooterSections,
  resolveHeaderFooterForPage,
} from './summary.js';

vi.mock('@core/Editor.js', () => {
  class MockEditor {
    constructor(config = {}) {
      this.options = config.options ?? {};
      this.converter = config.converter ?? {};
      this.storage = config.storage ?? {};
      this.view = config.view ?? {};
      this.destroy = vi.fn();
    }
  }

  const getStarterExtensions = vi.fn(() => [{ name: 'paragraph' }, { name: 'pagination' }]);

  return { Editor: MockEditor, getStarterExtensions };
});

class EditorStub extends Editor {}

const measurementEditorInstances = [];

vi.mock('./measurement-editor.js', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    measureSectionWithMeasurementEditor: vi.fn(async ({ record }) => {
      measurementEditorInstances.push(record.id);
      return 160;
    }),
  };
});

const createRepositoryStub = () => {
  const headers = [
    { id: 'header-default', type: 'header', contentJson: { type: 'doc' }, meta: { variants: ['default'] } },
    { id: 'header-even', type: 'header', contentJson: { type: 'doc' }, meta: { variants: ['even'] } },
  ];
  const footers = [
    { id: 'footer-default', type: 'footer', contentJson: { type: 'doc' }, meta: { variants: ['default'] } },
  ];

  return {
    list: vi.fn((type) => {
      if (type === 'header') return headers;
      if (type === 'footer') return footers;
      return [];
    }),
    ensureMeasured: vi.fn(async (_id, measureFn) => await measureFn()),
  };
};

const createDomStubs = () => {
  const doc = {
    body: {},
  };
  return { doc };
};

beforeEach(() => {
  vi.clearAllMocks();
  measurementEditorInstances.length = 0;
});

afterEach(() => {
  measurementEditorInstances.length = 0;
});

describe('measureHeaderFooterSections', () => {
  it('measures sections and builds variant lookup', async () => {
    const repository = createRepositoryStub();
    const { doc } = createDomStubs();
    const win = {
      requestAnimationFrame: vi.fn((cb) => {
        const id = setTimeout(cb, 0);
        return id;
      }),
    };

    const editor = new EditorStub({
      options: { mockDocument: doc, mockWindow: win },
      converter: {
        pageStyles: { pageSize: { width: 8.5 }, pageMargins: { left: 1, right: 1 } },
        getDocumentDefaultStyles: () => ({ fontSizePt: 12 }),
      },
    });

    const summary = await measureHeaderFooterSections({ editor, repository });

    expect(repository.ensureMeasured).toHaveBeenCalledTimes(3);
    expect(measurementEditorInstances).toEqual(['header-default', 'header-even', 'footer-default']);
    const headerMetrics = summary.sectionMetricsById.get('header-default');
    expect(headerMetrics.contentHeightPx).toBe(160);
    expect(headerMetrics.effectiveHeightPx).toBeGreaterThan(headerMetrics.distancePx);
    expect(summary.variantLookup.header.get('default')).toBe('header-default');
    expect(summary.variantLookup.header.get('even')).toBe('header-even');
    expect(summary.variantLookup.footer.get('default')).toBe('footer-default');
    expect(summary.contentWidthPx).toBeGreaterThan(0);
    expect(summary.distancesPx.header).toBeGreaterThanOrEqual(0);
  });

  it('returns empty summary when repository lacks sections', async () => {
    const repository = {
      list: vi.fn(() => []),
      ensureMeasured: vi.fn(),
    };
    const editor = new EditorStub({});
    const summary = await measureHeaderFooterSections({ editor, repository });

    expect(summary.sectionMetricsById.size).toBe(0);
    expect(summary.variantLookup.header.size).toBe(0);
    expect(summary.variantLookup.footer.size).toBe(0);
  });
});

describe('helpers', () => {
  it('resolves measurement environment using mocks', () => {
    const doc = {};
    const win = {};
    const editor = new EditorStub({ options: { mockDocument: doc, mockWindow: win } });
    const env = getMeasurementEnvironment(editor);
    expect(env.doc).toBe(doc);
    expect(env.win).toBe(win);
  });

  it('collects header and footer records', () => {
    const repository = createRepositoryStub();
    const records = getHeaderFooterRecords(repository);
    expect(records.header).toHaveLength(2);
    expect(records.footer).toHaveLength(1);
  });

  it('resolves header/footer ids per page with variants', () => {
    const variantLookup = {
      header: new Map([
        ['default', 'header-default'],
        ['even', 'header-even'],
      ]),
      footer: new Map([['default', 'footer-default']]),
    };
    const metricsById = new Map([
      ['header-default', { contentHeightPx: 150, distancePx: 72, effectiveHeightPx: 222 }],
      ['header-even', { contentHeightPx: 200, distancePx: 72, effectiveHeightPx: 272 }],
      ['footer-default', { contentHeightPx: 100, distancePx: 72, effectiveHeightPx: 172 }],
    ]);

    const page0 = resolveHeaderFooterForPage({ variantLookup, metricsById, pageIndex: 0 });
    expect(page0.header.id).toBe('header-default');
    expect(page0.header.metrics.effectiveHeightPx).toBe(222);
    expect(page0.footer.metrics.contentHeightPx).toBe(100);

    const page1 = resolveHeaderFooterForPage({ variantLookup, metricsById, pageIndex: 1 });
    expect(page1.header.id).toBe('header-even');
  });
});
