import { describe, it, expect } from 'vitest';
import { config } from './index.js';

describe('w:tab translator config', () => {
  describe('encode', () => {
    it('encodes to a SuperDoc tab node by default', () => {
      const res = config.encode({}, undefined);
      expect(res).toEqual({ type: 'tab' });
    });

    it('includes provided encoded attributes', () => {
      const res = config.encode({}, { tabSize: 42 });
      expect(res).toEqual({ type: 'tab', attrs: { tabSize: 42 } });
    });
  });

  describe('decode', () => {
    it('wraps <w:tab/> in a <w:r> run', () => {
      const res = config.decode({ node: { type: 'tab' } }, undefined);
      expect(res).toEqual({ name: 'w:r', elements: [{ name: 'w:tab' }] });
    });

    it('copies decoded attributes onto <w:tab/>', () => {
      const res = config.decode({ node: { type: 'tab' } }, { 'w:val': '48' });
      expect(res).toEqual({
        name: 'w:r',
        elements: [{ name: 'w:tab', attributes: { 'w:val': '48' } }],
      });
    });

    it('returns undefined when params.node is missing', () => {
      const res = config.decode({}, undefined);
      expect(res).toBeUndefined();
    });
  });

  describe('attributes mapping metadata', () => {
    it('exposes no attribute handlers for w:tab', () => {
      expect(Array.isArray(config.attributes)).toBe(true);
      expect(config.attributes.length).toBe(0);
    });
  });
});
