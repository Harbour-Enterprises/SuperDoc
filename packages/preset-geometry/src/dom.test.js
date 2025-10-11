import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { ensureDomParser, stripBom } from './dom.js';

const ORIGINAL_DOMPARSER = globalThis.DOMParser;

describe('dom helpers', () => {
  afterEach(() => {
    if (ORIGINAL_DOMPARSER) {
      globalThis.DOMParser = ORIGINAL_DOMPARSER;
    } else {
      delete globalThis.DOMParser;
    }
  });

  describe('ensureDomParser', () => {
    beforeEach(() => {
      const { window } = new JSDOM('');
      globalThis.DOMParser = window.DOMParser;
    });

    it('returns a DOMParser instance when available', () => {
      const parser = ensureDomParser();
      expect(parser).toBeInstanceOf(globalThis.DOMParser);
    });
  });

  it('throws when DOMParser is missing', () => {
    delete globalThis.DOMParser;
    expect(() => ensureDomParser()).toThrow(/DOMParser is not available/);
  });

  describe('stripBom', () => {
    it('removes BOM from strings', () => {
      const text = '\uFEFF<data />';
      expect(stripBom(text)).toBe('<data />');
    });

    it('returns original string when BOM is absent', () => {
      expect(stripBom('example')).toBe('example');
    });

    it('returns empty string for falsy input', () => {
      expect(stripBom('')).toBe('');
      expect(stripBom(null)).toBe('');
      expect(stripBom(undefined)).toBe('');
    });
  });
});
