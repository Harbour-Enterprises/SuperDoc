import { describe, it, expect } from 'vitest';
import { translator } from './ins-translator';

describe('Insert Translator', () => {
  describe('encode', () => {
    it('should encode an XML node with all ins attributes', () => {
      const xmlNode = {
        name: 'w:ins',
        attributes: {
          'w:id': '1',
          'w:author': 'John Doe',
          'w:date': '2023-10-26T10:00:00Z',
        },
      };
      const encodedAttrs = translator.attributes.reduce((acc, attrHandler) => {
        const encoded = attrHandler.encode(xmlNode.attributes);
        if (encoded != null) {
          acc[attrHandler.sdName] = encoded;
        }
        return acc;
      }, {});
      const result = translator.encode({ nodes: [xmlNode] }, encodedAttrs);
      expect(result).toEqual({
        id: 1,
        author: 'John Doe',
        date: '2023-10-26T10:00:00Z',
      });
    });

    it('should encode an XML node with partial ins attributes', () => {
      const xmlNode = {
        name: 'w:ins',
        attributes: {
          'w:author': 'Jane Doe',
        },
      };
      const encodedAttrs = translator.attributes.reduce((acc, attrHandler) => {
        const encoded = attrHandler.encode(xmlNode.attributes);
        if (encoded != null) {
          acc[attrHandler.sdName] = encoded;
        }
        return acc;
      }, {});
      const result = translator.encode({ nodes: [xmlNode] }, encodedAttrs);
      expect(result).toEqual({
        author: 'Jane Doe',
      });
    });

    it('should return undefined if no ins attributes are present', () => {
      const xmlNode = {
        name: 'w:ins',
        attributes: {},
      };
      const encodedAttrs = translator.attributes.reduce((acc, attrHandler) => {
        const encoded = attrHandler.encode(xmlNode.attributes);
        if (encoded != null) {
          acc[attrHandler.sdName] = encoded;
        }
        return acc;
      }, {});
      const result = translator.encode({ nodes: [xmlNode] }, encodedAttrs);
      expect(result).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('should decode a SuperDoc node with all ins attributes', () => {
      const superDocNode = {
        attrs: {
          ins: {
            id: 1,
            author: 'John Doe',
            date: '2023-10-26T10:00:00Z',
          },
        },
      };
      const result = translator.decode({ node: superDocNode });
      expect(result).toEqual({
        attributes: {
          'w:id': '1',
          'w:author': 'John Doe',
          'w:date': '2023-10-26T10:00:00Z',
        },
      });
    });

    it('should decode a SuperDoc node with partial ins attributes', () => {
      const superDocNode = {
        attrs: {
          ins: {
            author: 'Jane Doe',
          },
        },
      };
      const result = translator.decode({ node: superDocNode });
      expect(result).toEqual({
        attributes: {
          'w:author': 'Jane Doe',
        },
      });
    });

    it('should return undefined if no ins attributes are present in SuperDoc node', () => {
      const superDocNode = {
        attrs: {
          // No ins attribute
        },
      };
      const result = translator.decode({ node: superDocNode });
      expect(result).toBeUndefined();
    });

    it('should return undefined if ins attribute is an empty object', () => {
      const superDocNode = {
        attrs: {
          ins: {},
        },
      };
      const result = translator.decode({ node: superDocNode });
      expect(result).toBeUndefined();
    });
  });
});
