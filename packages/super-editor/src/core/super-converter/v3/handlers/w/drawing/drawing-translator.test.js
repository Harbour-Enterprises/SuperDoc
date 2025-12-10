import { beforeEach, describe, expect, it, vi } from 'vitest';
import { config, translator } from './drawing-translator.js';
import { NodeTranslator } from '../../../node-translator/index.js';
import { wrapTextInRun } from '../../../../exporter.js';

const anchorTranslatorMock = vi.hoisted(() => ({
  encode: vi.fn(),
  decode: vi.fn(),
}));

const inlineTranslatorMock = vi.hoisted(() => ({
  encode: vi.fn(),
  decode: vi.fn(),
}));

vi.mock('@converter/v3/handlers/wp/anchor/anchor-translator.js', () => ({
  translator: anchorTranslatorMock,
}));

vi.mock('@converter/v3/handlers/wp/inline/inline-translator.js', () => ({
  translator: inlineTranslatorMock,
}));

vi.mock('@converter/exporter.js', () => ({
  wrapTextInRun: vi.fn((node) => ({ wrapped: node })),
}));

describe('w:drawing translator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    anchorTranslatorMock.encode.mockReset();
    anchorTranslatorMock.decode.mockReset();
    inlineTranslatorMock.encode.mockReset();
    inlineTranslatorMock.decode.mockReset();
  });

  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:drawing');
    expect(config.sdNodeOrKeyName).toEqual([]);
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
    expect(config.attributes).toEqual([]);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:drawing');
    expect(translator.sdNodeOrKeyName).toEqual([]);
  });

  describe('encode', () => {
    it('delegates to wp:inline child translator', () => {
      const childNode = { name: 'wp:inline' };
      const params = { nodes: [{ elements: [childNode] }] };

      inlineTranslatorMock.encode.mockReturnValue({ encoded: true });

      const result = translator.encode(params);

      expect(inlineTranslatorMock.encode).toHaveBeenCalledWith(
        expect.objectContaining({ extraParams: { node: childNode } }),
      );
      expect(result).toEqual({ encoded: true });
    });

    it('delegates to wp:anchor child translator', () => {
      const childNode = { name: 'wp:anchor' };
      const params = { nodes: [{ elements: [childNode] }] };

      anchorTranslatorMock.encode.mockReturnValue({ encodedAnchor: true });

      const result = translator.encode(params);

      expect(anchorTranslatorMock.encode).toHaveBeenCalled();
      expect(result).toEqual({ encodedAnchor: true });
    });

    it('returns passthroughBlock if no valid children', () => {
      const childNode = { name: 'w:tag' };
      const params = { nodes: [{ name: 'w:drawing', elements: [childNode] }] };

      const result = translator.encode(params);

      expect(result).toEqual({
        type: 'passthroughBlock',
        attrs: {
          originalName: 'w:drawing',
          originalXml: {
            name: 'w:drawing',
            elements: [expect.objectContaining({ name: 'w:tag' })],
          },
        },
      });
    });
  });

  describe('decode', () => {
    it('delegates to wp:anchor when node.attrs.isAnchor is true', () => {
      const params = { node: { type: 'element', attrs: { isAnchor: true } } };
      anchorTranslatorMock.decode.mockReturnValue({ decoded: 'anchor' });

      const result = translator.decode(params);

      expect(anchorTranslatorMock.decode).toHaveBeenCalledWith(params);
      expect(wrapTextInRun).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'w:drawing',
          elements: [{ decoded: 'anchor' }],
        }),
        [],
      );
      expect(result).toEqual({ wrapped: { name: 'w:drawing', elements: [{ decoded: 'anchor' }] } });
    });

    it('delegates to wp:inline when node.attrs.isAnchor is false', () => {
      const params = { node: { type: 'element', attrs: { isAnchor: false } } };
      inlineTranslatorMock.decode.mockReturnValue({ decoded: 'inline' });

      const result = translator.decode(params);

      expect(inlineTranslatorMock.decode).toHaveBeenCalledWith(params);
      expect(wrapTextInRun).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'w:drawing',
          elements: [{ decoded: 'inline' }],
        }),
        [],
      );
      expect(result).toEqual({ wrapped: { name: 'w:drawing', elements: [{ decoded: 'inline' }] } });
    });

    it('returns null if node is missing', () => {
      const params = { node: null };

      const result = translator.decode(params);

      expect(result).toBeNull();
    });

    it('returns null if node.type is missing', () => {
      const params = { node: { attrs: {} } };

      const result = translator.decode(params);

      expect(result).toBeNull();
    });
  });
});
