import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use hoisted mocks so Vitest can hoist vi.mock safely
const hoisted = vi.hoisted(() => ({
  mockGenerateRunPrTag: vi.fn(),
  mockProcessNodeChildren: vi.fn(),
  mockCreateTranslatedRun: vi.fn(),
  mockTranslateChildNodes: vi.fn(),
}));

vi.mock('./helpers/index.js', () => ({
  generateRunPrTag: hoisted.mockGenerateRunPrTag,
  processNodeChildren: hoisted.mockProcessNodeChildren,
  createTranslatedRun: hoisted.mockCreateTranslatedRun,
}));

// Mock translateChildNodes used in decode
vi.mock('../../../../v2/exporter/helpers/index.js', () => ({
  translateChildNodes: (...args) => hoisted.mockTranslateChildNodes(...args),
}));

import { config, translator } from './r-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:r translator (node)', () => {
  beforeEach(() => {
    hoisted.mockGenerateRunPrTag.mockReset();
    hoisted.mockProcessNodeChildren.mockReset();
    hoisted.mockCreateTranslatedRun.mockReset();
    hoisted.mockTranslateChildNodes.mockReset();
  });

  afterEach(() => {
    // Keep module mocks in place; just clear call history
    vi.clearAllMocks();
  });

  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:r');
    expect(config.sdNodeOrKeyName).toBe('run');
    expect(config.type).toBe(NodeTranslator.translatorTypes.NODE);
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:r');
    expect(translator.sdNodeOrKeyName).toBe('run');
  });

  describe('encode', () => {
    it('returns early when nodes list is empty', () => {
      const params = { nodes: [], nodeListHandler: { handler: vi.fn() } };
      hoisted.mockCreateTranslatedRun.mockReturnValue({ type: 'run', content: [], attrs: {} });
      const out = config.encode(params, { extra: true });
      expect(out).toEqual({ type: 'run', content: [], attrs: {} });
      expect(hoisted.mockProcessNodeChildren).not.toHaveBeenCalled();
      expect(hoisted.mockCreateTranslatedRun).toHaveBeenCalledWith([], {}, { extra: true });
    });

    it('processes children and returns result of createTranslatedRun', () => {
      const node = { elements: [{ name: 'w:t', elements: [] }] };
      const params = { nodes: [node], nodeListHandler: { handler: vi.fn() }, some: 'param' };

      const processed = {
        runProperties: { runProperties: [{ xmlName: 'w:b' }] },
        contentNodes: [{ type: 'text', text: 'Hi' }],
      };
      const created = { type: 'run', content: processed.contentNodes, attrs: processed.runProperties };

      hoisted.mockProcessNodeChildren.mockReturnValue(processed);
      hoisted.mockCreateTranslatedRun.mockReturnValue(created);

      const out = config.encode(params, { encoded: 1 });
      expect(out).toEqual(created);
      expect(hoisted.mockProcessNodeChildren).toHaveBeenCalledWith(node.elements, params, params.nodeListHandler);
      expect(hoisted.mockCreateTranslatedRun).toHaveBeenCalledWith(processed.contentNodes, processed.runProperties, {
        encoded: 1,
      });
    });
  });

  describe('decode', () => {
    it('includes run properties tag when generated', () => {
      const node = { attrs: { runProperties: [{ xmlName: 'w:b', attributes: { 'w:val': '1' } }] } };
      const rPrTag = { name: 'w:rPr', elements: [{ name: 'w:b', attributes: { 'w:val': '1' } }] };
      const children = [{ name: 'w:t', elements: [{ type: 'text', text: 'Hello' }] }];

      hoisted.mockGenerateRunPrTag.mockReturnValue(rPrTag);
      hoisted.mockTranslateChildNodes.mockReturnValue(children);

      const out = config.decode({ node });
      expect(out).toEqual({ name: 'w:r', elements: [rPrTag, ...children] });
      expect(hoisted.mockGenerateRunPrTag).toHaveBeenCalledWith(node.attrs.runProperties);
      expect(hoisted.mockTranslateChildNodes).toHaveBeenCalled();
    });

    it('omits run properties tag when generator returns null', () => {
      const node = { attrs: { runProperties: [] } };
      const children = [{ name: 'w:br' }];
      hoisted.mockGenerateRunPrTag.mockReturnValue(null);
      hoisted.mockTranslateChildNodes.mockReturnValue(children);

      const out = config.decode({ node });
      expect(out).toEqual({ name: 'w:r', elements: children });
    });

    it('flattens nested runs from translated children (e.g., lineBreak returns w:r > w:br)', () => {
      const node = { attrs: { runProperties: [] } };
      const nestedRun = { name: 'w:r', elements: [{ name: 'w:br' }] };
      hoisted.mockGenerateRunPrTag.mockReturnValue(null);
      hoisted.mockTranslateChildNodes.mockReturnValue([
        nestedRun,
        { name: 'w:t', elements: [{ type: 'text', text: 'A' }] },
      ]);

      const out = config.decode({ node });
      expect(out).toEqual({
        name: 'w:r',
        elements: [{ name: 'w:br' }, { name: 'w:t', elements: [{ type: 'text', text: 'A' }] }],
      });
    });
  });
});
