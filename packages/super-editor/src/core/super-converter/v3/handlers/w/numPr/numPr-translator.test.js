import { describe, it, expect } from 'vitest';
import { translator } from './numPr-translator.js';

describe('w:numPr translator', () => {
  describe('encode', () => {
    it('should encode a w:numPr element with all child properties', () => {
      const xmlNode = {
        name: 'w:numPr',
        elements: [
          {
            name: 'w:ilvl',
            attributes: { 'w:val': '1' },
          },
          {
            name: 'w:ins',
            attributes: {
              'w:id': '1',
              'w:author': 'John Doe',
              'w:date': '2023-10-26T10:00:00Z',
            },
          },
          {
            name: 'w:numId',
            attributes: { 'w:val': '123' },
          },
        ],
      };

      const result = translator.encode({ nodes: [xmlNode] });

      expect(result).toEqual({
        ilvl: 1,
        ins: {
          id: 1,
          author: 'John Doe',
          date: '2023-10-26T10:00:00Z',
        },
        numId: 123,
      });
    });

    it('should encode a w:numPr element with partial child properties', () => {
      const xmlNode = {
        name: 'w:numPr',
        elements: [
          {
            name: 'w:ilvl',
            attributes: { 'w:val': '0' },
          },
          {
            name: 'w:numId',
            attributes: { 'w:val': '456' },
          },
        ],
      };

      const result = translator.encode({ nodes: [xmlNode] });

      expect(result).toEqual({
        ilvl: 0,
        numId: 456,
      });
    });

    it('should return undefined if no child properties are present', () => {
      const xmlNode = {
        name: 'w:numPr',
        elements: [],
      };

      const result = translator.encode({ nodes: [xmlNode] });

      expect(result).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('should decode a SuperDoc numberingProperties object with all properties', () => {
      const superDocNode = {
        attrs: {
          numberingProperties: {
            ilvl: 1,
            ins: {
              id: 1,
              author: 'John Doe',
              date: '2023-10-26T10:00:00Z',
            },
            numId: 123,
          },
        },
      };

      const result = translator.decode({ node: superDocNode });

      expect(result).toEqual({
        name: 'w:numPr',
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:ilvl',
            attributes: { 'w:val': '1' },
          },
          {
            name: 'w:ins',
            attributes: {
              'w:id': '1',
              'w:author': 'John Doe',
              'w:date': '2023-10-26T10:00:00Z',
            },
          },
          {
            name: 'w:numId',
            attributes: { 'w:val': '123' },
          },
        ],
      });
    });

    it('should decode a SuperDoc numberingProperties object with partial properties', () => {
      const superDocNode = {
        attrs: {
          numberingProperties: {
            ilvl: 0,
            numId: 456,
          },
        },
      };

      const result = translator.decode({ node: superDocNode });

      expect(result).toEqual({
        name: 'w:numPr',
        type: 'element',
        attributes: {},
        elements: [
          {
            name: 'w:ilvl',
            attributes: { 'w:val': '0' },
          },
          {
            name: 'w:numId',
            attributes: { 'w:val': '456' },
          },
        ],
      });
    });

    it('should return a w:numPr node with empty elements if numberingProperties is empty', () => {
      const superDocNode = {
        attrs: {
          numberingProperties: {},
        },
      };

      const result = translator.decode({ node: superDocNode });

      expect(result).toEqual({
        name: 'w:numPr',
        type: 'element',
        attributes: {},
        elements: [],
      });
    });

    it('should return a w:numPr node with empty elements if numberingProperties is missing', () => {
      const superDocNode = {
        attrs: {},
      };

      const result = translator.decode({ node: superDocNode });

      expect(result).toEqual({
        name: 'w:numPr',
        type: 'element',
        attributes: {},
        elements: [],
      });
    });
  });
});
