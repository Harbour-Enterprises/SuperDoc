import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperValidator } from './super-validator.js';
import { StateValidators } from './validators/state/index.js';
import { XmlValidators } from './validators/xml/index.js';

vi.mock('./logger/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    withPrefix: vi.fn(() => ({
      debug: vi.fn(),
    })),
  })),
}));

vi.mock('./validators/state/index.js', () => ({
  StateValidators: {
    validatorA: vi.fn(),
    validatorB: vi.fn(),
  },
}));

vi.mock('./validators/xml/index.js', () => ({
  XmlValidators: {
    xmlA: vi.fn(),
    xmlB: vi.fn(),
  },
}));

describe('SuperValidator', () => {
  let mockEditor, mockDoc, mockView, mockTr;

  beforeEach(() => {
    mockTr = { setMeta: vi.fn() };
    mockDoc = {
      descendants: vi.fn(),
    };
    mockView = { dispatch: vi.fn() };

    mockEditor = {
      state: { doc: mockDoc, tr: mockTr },
      view: mockView,
      schema: { marks: {}, nodes: {} },
    };
  });

  function createMockValidator(requiredElements, returnValue) {
    const fn = vi.fn().mockReturnValue(returnValue || { modified: false, results: [] });
    fn.requiredElements = requiredElements;
    return fn;
  }

  it('collects required nodes and marks from validators', () => {
    const validatorA = createMockValidator({ nodes: ['image'] });
    const validatorB = createMockValidator({ marks: ['link'] });

    StateValidators.validatorA.mockReturnValue(validatorA);
    StateValidators.validatorB.mockReturnValue(validatorB);

    const validator = new SuperValidator({ editor: mockEditor });

    expect(validator.validateActiveDocument()).toBeTypeOf('object');
    expect(StateValidators.validatorA).toHaveBeenCalled();
    expect(StateValidators.validatorB).toHaveBeenCalled();
  });

  it('calls all validators with analysis results', () => {
    const linkMark = { type: { name: 'link' } };
    const textNode = {
      isText: true,
      nodeSize: 4,
      marks: [linkMark],
      type: { name: 'text' },
    };

    const validator = createMockValidator(
      { marks: ['link'] },
      {
        modified: true,
        results: ['fixed link'],
      },
    );
    StateValidators.validatorA.mockReturnValue(validator);
    StateValidators.validatorB.mockReturnValue(createMockValidator({}));

    mockDoc.descendants.mockImplementation((fn) => {
      fn(textNode, 3);
    });

    const instance = new SuperValidator({ editor: mockEditor });

    const result = instance.validateActiveDocument();

    expect(result.modified).toBe(true);
    expect(result.results).toEqual([
      { key: 'validatorA', results: ['fixed link'] },
      { key: 'validatorB', results: [] },
    ]);

    expect(mockView.dispatch).toHaveBeenCalled();
  });

  it('does not dispatch if dryRun is true', () => {
    const validator = createMockValidator({}, { modified: false, results: [] });
    StateValidators.validatorA.mockReturnValue(validator);
    StateValidators.validatorB.mockReturnValue(createMockValidator({}));

    const instance = new SuperValidator({ editor: mockEditor, dryRun: true });
    instance.validateActiveDocument();

    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  it('supports validators with no requiredElements defined', () => {
    const validator = createMockValidator(undefined, { modified: false, results: [] });
    delete validator.requiredElements;

    StateValidators.validatorA.mockReturnValue(validator);
    StateValidators.validatorB.mockReturnValue(createMockValidator({}));

    const instance = new SuperValidator({ editor: mockEditor });
    const result = instance.validateActiveDocument();

    expect(result.results).toHaveLength(2);
  });

  describe('validateDocumentExport', () => {
    it('calls all XML validators and aggregates results; dispatches when modified', () => {
      const xmlValidatorA = vi.fn(() => ({ modified: true, results: ['fixed numbering'] }));
      const xmlValidatorB = vi.fn(() => ({ modified: false, results: [] }));

      XmlValidators.xmlA.mockReturnValue(xmlValidatorA);
      XmlValidators.xmlB.mockReturnValue(xmlValidatorB);

      const instance = new SuperValidator({ editor: mockEditor });

      const result = instance.validateDocumentExport();

      expect(result.modified).toBe(true);
      expect(result.results).toEqual([
        { key: 'xmlA', results: ['fixed numbering'] },
        { key: 'xmlB', results: [] },
      ]);

      expect(mockView.dispatch).toHaveBeenCalled();
    });

    it('does not dispatch if no XML validator modified the document', () => {
      const xmlValidatorA = vi.fn(() => ({ modified: false, results: [] }));
      const xmlValidatorB = vi.fn(() => ({ modified: false, results: [] }));

      XmlValidators.xmlA.mockReturnValue(xmlValidatorA);
      XmlValidators.xmlB.mockReturnValue(xmlValidatorB);

      const instance = new SuperValidator({ editor: mockEditor });
      const result = instance.validateDocumentExport();

      expect(result.modified).toBe(false);
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch if dryRun is true even when modified', () => {
      const xmlValidatorA = vi.fn(() => ({ modified: true, results: ['something'] }));
      const xmlValidatorB = vi.fn(() => ({ modified: false, results: [] }));

      XmlValidators.xmlA.mockReturnValue(xmlValidatorA);
      XmlValidators.xmlB.mockReturnValue(xmlValidatorB);

      const instance = new SuperValidator({ editor: mockEditor, dryRun: true });
      const result = instance.validateDocumentExport();

      expect(result.modified).toBe(true);
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });
  });
});
