import { describe, expect, it, vi } from 'vitest';
import { config, translator } from './t-translator.js';
import { NodeTranslator } from '@translator';
import { getTextNodeForExport } from '@converter/v3/handlers/w/t/helpers/translate-text-node.js';
import { translator as wDelTranslator } from '@converter/v3/handlers/w/del/index.js';
import { translator as wInsTranslator } from '@converter/v3/handlers/w/ins/index.js';
import { translator as wHyperlinkTranslator } from '@converter/v3/handlers/w/hyperlink/index.js';

// Mocks
vi.mock('@converter/v3/handlers/w/t/helpers/translate-text-node.js', () => ({
  getTextNodeForExport: vi.fn(),
}));

vi.mock('@converter/v3/handlers/w/del/index.js', () => ({
  translator: { decode: vi.fn() },
}));
vi.mock('@converter/v3/handlers/w/ins/index.js', () => ({
  translator: { decode: vi.fn() },
}));
vi.mock('@converter/v3/handlers/w/hyperlink/index.js', () => ({
  translator: { decode: vi.fn() },
}));

describe('w:t translator', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:t');
    expect(config.sdNodeOrKeyName).toEqual('text');
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
    expect(config.attributes.length).toEqual(1);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:t');
    expect(translator.sdNodeOrKeyName).toEqual('text');
  });

  describe('textTranslator encode', () => {
    it('encodes a normal text node and trims whitespace', () => {
      const params = {
        extraParams: {
          node: {
            elements: [{ text: '   Hello world   ' }],
            type: 'text',
            attributes: {},
          },
        },
      };

      const result = config.encode(params);
      expect(result).toEqual({
        type: 'text',
        text: 'Hello world',
        attrs: { type: 'text', attributes: {} },
        marks: [],
      });
    });

    it('preserves non-breaking spaces (U+00A0) used for alignment', () => {
      // Word uses NBSP for intentional spacing/alignment and doesn't add xml:space="preserve"
      const nbsp = '\u00A0';
      const params = {
        extraParams: {
          node: {
            elements: [{ text: `${nbsp} ${nbsp} ${nbsp} Address: ` }],
            type: 'text',
            attributes: {},
          },
        },
      };

      const result = config.encode(params);
      // NBSP should be preserved, only trailing regular space is trimmed
      expect(result.text).toBe(`${nbsp} ${nbsp} ${nbsp} Address:`);
    });

    it('preserves whitespace when xml:space="preserve"', () => {
      const params = {
        extraParams: {
          node: {
            elements: [{ text: '   Hello   ' }],
            type: 'text',
            attributes: {},
          },
        },
      };

      const result = config.encode(params, { xmlSpace: 'preserve' });
      expect(result.text).toBe('   Hello   ');
    });

    it('replaces [[sdspace]] placeholders', () => {
      const params = {
        extraParams: {
          node: {
            elements: [{ text: 'foo[[sdspace]]bar' }],
            type: 'text',
            attributes: {},
          },
        },
      };
      const result = config.encode(params);
      expect(result.text).toBe('foobar');
    });

    it('returns a space for empty element with xml:space="preserve"', () => {
      const params = {
        extraParams: {
          node: { elements: [], type: 'text', attributes: {} },
        },
      };
      const result = config.encode(params, { xmlSpace: 'preserve' });
      expect(result.text).toBe(' ');
    });

    it('returns null for unsupported structures', () => {
      const params = {
        extraParams: {
          node: {
            elements: [{ text: 'foo' }, { text: 'bar' }],
            type: 'text',
            attributes: {},
          },
        },
      };
      const result = config.encode(params);
      expect(result).toBeNull();
    });
  });

  describe('textTranslator decode', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns null when node is missing', () => {
      const result = config.decode({ node: null });
      expect(result).toBeNull();
    });

    it('delegates to wDelTranslator when mark is trackDelete', () => {
      const node = { type: 'text', marks: [{ type: 'trackDelete' }] };
      config.decode({ node });
      expect(wDelTranslator.decode).toHaveBeenCalled();
    });

    it('delegates to wInsTranslator when mark is trackInsert', () => {
      const node = { type: 'text', marks: [{ type: 'trackInsert' }] };
      config.decode({ node });
      expect(wInsTranslator.decode).toHaveBeenCalled();
    });

    it('delegates to wHyperlinkTranslator when link mark present', () => {
      const node = { type: 'text', marks: [{ type: 'link' }] };
      config.decode({ node, extraParams: {} });
      expect(wHyperlinkTranslator.decode).toHaveBeenCalled();
    });

    it('calls getTextNodeForExport for regular text nodes', () => {
      const node = { type: 'text', text: 'Hello', marks: [] };
      const params = { node };
      config.decode(params);
      expect(getTextNodeForExport).toHaveBeenCalledWith('Hello', [], params);
    });

    it('skips hyperlink delegation when linkProcessed is true', () => {
      const node = { type: 'text', marks: [{ type: 'link' }] };
      config.decode({ node, extraParams: { linkProcessed: true } });
      expect(wHyperlinkTranslator.decode).not.toHaveBeenCalled();
      expect(getTextNodeForExport).toHaveBeenCalled();
    });
  });
});
