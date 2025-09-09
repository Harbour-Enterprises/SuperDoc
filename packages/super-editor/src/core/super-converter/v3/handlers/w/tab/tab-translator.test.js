import { describe, it, expect } from 'vitest';
import { config } from './index.js';

describe('w:tab translator config', () => {
  describe('encode', () => {
    it('encodes to a SuperDoc tab by default', () => {
      const res = config.encode({}, undefined);
      expect(res).toEqual({ type: 'tab' });
    });

    it('maps known attributes and preserves unknown ones', () => {
      const params = {
        nodes: [
          {
            attributes: {
              'w:val': '96',
              'w:custom': 'foo',
            },
          },
        ],
      };
      const res = config.encode(params, { tabSize: '96' });
      expect(res.type).toBe('tab');
      expect(res.attrs).toEqual({ tabSize: '96', 'w:custom': 'foo' });
    });
  });

  describe('decode', () => {
    it('wraps <w:tab> in a <w:r> run', () => {
      const res = config.decode({ node: { type: 'tab' } }, undefined);
      expect(res).toBeTruthy();
      expect(res.name).toBe('w:r');
      expect(Array.isArray(res.elements)).toBe(true);
      expect(res.elements[0]).toEqual({ name: 'w:tab' });
    });

    it('copies decoded attributes and preserves unknown ones', () => {
      const params = { node: { type: 'tab', attrs: { tabSize: '96', 'w:custom': 'foo' } } };
      const res = config.decode(params, { 'w:val': '96' });
      expect(res.name).toBe('w:r');
      expect(res.elements[0]).toEqual({
        name: 'w:tab',
        attributes: { 'w:val': '96', 'w:custom': 'foo' },
      });
    });

    it('returns undefined when params.node is missing', () => {
      const res = config.decode({}, { 'w:val': '96' });
      expect(res).toBeUndefined();
    });
  });

  describe('attributes mapping metadata', () => {
    it('exposes expected attribute handler (w:val -> tabSize)', () => {
      const attrMap = config.attributes;
      const names = attrMap.map((a) => [a.xmlName, a.sdName]);
      expect(names).toContainEqual(['w:val', 'tabSize']);

      const byXml = Object.fromEntries(attrMap.map((a) => [a.xmlName, a]));
      expect(typeof byXml['w:val'].encode).toBe('function');
      expect(typeof byXml['w:val'].decode).toBe('function');
    });
  });
});
