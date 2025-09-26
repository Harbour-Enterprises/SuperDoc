// @ts-check
import { describe, it, expect } from 'vitest';
import { config, translator } from './caps-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:caps translator (attribute)', () => {
  it('exposes correct config meta', () => {
    expect(config.xmlName).toBe('w:caps');
    expect(config.sdNodeOrKeyName).toBe('textTransform');
    expect(typeof config.encode).toBe('function');
    expect(config.type).toBe(NodeTranslator.translatorTypes.ATTRIBUTE);
  });

  it('builds NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
    expect(translator.xmlName).toBe('w:caps');
    expect(translator.sdNodeOrKeyName).toBe('textTransform');
  });

  describe('encode', () => {
    it('encodes to uppercase when val is not "false" or "0"', () => {
      const params = { nodes: [{ attributes: { 'w:val': '1' } }] };
      const encodedAttrs = { val: '1' };
      const out = config.encode(params, encodedAttrs);
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:caps',
        sdNodeOrKeyName: 'textTransform',
        attributes: { textTransform: 'uppercase' },
      });
    });

    it('encodes to undefined when val is "false"', () => {
      const params = { nodes: [{ attributes: { 'w:val': 'false' } }] };
      const encodedAttrs = { val: 'false' };
      const out = config.encode(params, encodedAttrs);
      expect(out).toBeUndefined();
    });

    it('encodes to undefined when val is "0"', () => {
      const params = { nodes: [{ attributes: { 'w:val': '0' } }] };
      const encodedAttrs = { val: '0' };
      const out = config.encode(params, encodedAttrs);
      expect(out).toBeUndefined();
    });

    it('encodes to uppercase when encodedAttrs is empty', () => {
      const params = { nodes: [{ attributes: {} }] };
      const out = config.encode(params, {});
      expect(out).toEqual({
        type: 'attr',
        xmlName: 'w:caps',
        sdNodeOrKeyName: 'textTransform',
        attributes: { textTransform: 'uppercase' },
      });
    });
  });
});
