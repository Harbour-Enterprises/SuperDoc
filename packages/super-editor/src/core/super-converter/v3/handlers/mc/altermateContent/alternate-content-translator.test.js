import { describe, expect, it, vi } from 'vitest';
import { config, translator } from './alternate-content-translator.js';
import { NodeTranslator } from '../../../node-translator/index.js';

describe('mc:AltermateContent translator', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('mc:AlternateContent');
    expect(config.sdNodeOrKeyName).toEqual([]);
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
    expect(config.attributes).toEqual([]);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('mc:AlternateContent');
    expect(translator.sdNodeOrKeyName).toEqual([]);
  });

  describe('encode', () => {
    it('returns null if extraParams.node is missing', () => {
      const params = {
        nodeListHandler: { handler: vi.fn() },
        extraParams: {},
      };
      const result = translator.encode(params);
      expect(result).toBeNull();
    });

    it('returns null if mc:Choice with allowed namespace is missing', () => {
      const params = {
        nodeListHandler: { handler: vi.fn() },
        extraParams: {
          node: {
            type: 'mc:AlternateContent',
            elements: [{ name: 'mc:Choice', attributes: { Requires: 'unsupported' }, elements: [] }],
          },
        },
      };
      const result = translator.encode(params);
      expect(result).toBeNull();
    });

    it('calls nodeListHandler with the contents of mc:Choice', () => {
      const handlerSpy = vi.fn().mockReturnValue(['handled']);
      const params = {
        nodeListHandler: { handler: handlerSpy },
        path: [],
        extraParams: {
          node: {
            type: 'mc:AlternateContent',
            elements: [
              {
                name: 'mc:Choice',
                attributes: { Requires: 'wps' },
                elements: [{ name: 'w:drawing' }],
              },
            ],
          },
        },
      };

      const result = translator.encode(params);
      expect(handlerSpy).toHaveBeenCalledWith({
        ...params,
        nodes: [{ name: 'w:drawing' }],
        path: [params.extraParams.node.elements[0]],
      });
      expect(result).toEqual(['handled']);
    });
  });

  describe('decode', () => {
    it('returns mc:AlternateContent structure with w:drawing inside mc:Choice', () => {
      const params = {
        node: {
          attrs: {
            drawingContent: { elements: [{ name: 'wp:inline' }] },
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'mc:AlternateContent',
        elements: [
          {
            name: 'mc:Choice',
            attributes: { Requires: 'wps' },
            elements: [
              {
                name: 'w:drawing',
                elements: [{ name: 'wp:inline' }],
              },
            ],
          },
        ],
      });
    });

    it('handles empty drawingContent gracefully', () => {
      const params = { node: { attrs: {} } };
      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'mc:AlternateContent',
        elements: [
          {
            name: 'mc:Choice',
            attributes: { Requires: 'wps' },
            elements: [
              {
                name: 'w:drawing',
                elements: [],
              },
            ],
          },
        ],
      });
    });
  });
});
