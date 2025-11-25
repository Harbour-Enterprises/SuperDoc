import { describe, it, expect } from 'vitest';
import { translator, config } from './headers-translator.js';
import { NodeTranslator } from '../../../node-translator/node-translator.js';

describe('w:headers translator', () => {
  it('exposes correct config', () => {
    expect(config.xmlName).toBe('w:headers');
    expect(config.sdNodeOrKeyName).toBe('headers');
    expect(typeof config.encode).toBe('function');
    expect(typeof config.decode).toBe('function');
  });

  it('builds a NodeTranslator instance', () => {
    expect(translator).toBeInstanceOf(NodeTranslator);
  });

  describe('encode', () => {
    it('should extract header values from w:header children', () => {
      const params = {
        nodes: [
          {
            name: 'w:headers',
            elements: [
              { name: 'w:header', attributes: { 'w:val': 'h1' } },
              { name: 'w:header', attributes: { 'w:val': 'h2' } },
            ],
          },
        ],
      };
      const result = translator.encode(params);
      expect(result).toEqual({
        xmlName: 'w:headers',
        sdNodeOrKeyName: 'headers',
        attributes: [{ header: 'h1' }, { header: 'h2' }],
      });
    });

    it('should handle empty w:headers element', () => {
      const params = {
        nodes: [{ name: 'w:headers', elements: [] }],
      };
      const result = translator.encode(params);
      expect(result).toEqual({
        xmlName: 'w:headers',
        sdNodeOrKeyName: 'headers',
        attributes: [],
      });
    });
  });

  describe('decode', () => {
    it('should create a w:headers element with w:header children', () => {
      const params = {
        node: {
          attrs: {
            headers: [{ header: 'h1' }, { header: 'h2' }],
          },
        },
      };

      const result = translator.decode(params);

      expect(result).toEqual({
        name: 'w:headers',
        attributes: {},
        elements: [
          { name: 'w:header', attributes: { 'w:val': 'h1' } },
          { name: 'w:header', attributes: { 'w:val': 'h2' } },
        ],
      });
    });

    it('should handle missing headers attribute', () => {
      const params = {
        node: {
          attrs: {},
        },
      };

      const result = translator.decode(params);
      expect(result).toEqual({
        name: 'w:headers',
        attributes: {},
        elements: [],
      });
    });

    it('should handle empty headers array', () => {
      const params = {
        node: {
          attrs: {
            headers: [],
          },
        },
      };

      const result = translator.decode(params);
      expect(result).toEqual({
        name: 'w:headers',
        attributes: {},
        elements: [],
      });
    });
  });
});
