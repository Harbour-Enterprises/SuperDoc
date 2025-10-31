// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractHtmlFieldMetadata, isHtmlFieldNode } from './html-field-utils.js';

describe('html field utils', () => {
  describe('isHtmlFieldNode', () => {
    it('identifies fieldAnnotation nodes with html type', () => {
      expect(
        isHtmlFieldNode({
          type: { name: 'fieldAnnotation' },
          attrs: { type: 'html' },
        }),
      ).toBe(true);
    });

    it('accepts structured content block nodes', () => {
      expect(isHtmlFieldNode({ type: { name: 'structuredContentBlock' } })).toBe(true);
    });

    it('returns false for non-field nodes', () => {
      expect(isHtmlFieldNode({ type: { name: 'paragraph' } })).toBe(false);
      expect(isHtmlFieldNode(null)).toBe(false);
    });
  });

  describe('extractHtmlFieldMetadata', () => {
    it('returns explicit metadata when present', () => {
      expect(
        extractHtmlFieldMetadata({
          type: { name: 'fieldAnnotation' },
          attrs: { type: 'structuredContent', fieldId: 'field-1', alias: 'contact' },
        }),
      ).toEqual({
        type: 'structuredContent',
        fieldId: 'field-1',
        alias: 'contact',
      });
    });

    it('infers type when missing', () => {
      expect(
        extractHtmlFieldMetadata({
          type: { name: 'fieldAnnotation' },
          attrs: { fieldId: 'field-2' },
        }),
      ).toEqual({
        type: 'html',
        fieldId: 'field-2',
        alias: null,
      });

      expect(
        extractHtmlFieldMetadata({
          type: { name: 'structuredContent' },
          attrs: { id: 'sc-1' },
        }),
      ).toEqual({
        type: 'structuredContent',
        fieldId: 'sc-1',
        alias: null,
      });
    });

    it('returns null metadata for invalid nodes', () => {
      expect(extractHtmlFieldMetadata(null)).toEqual({
        type: null,
        fieldId: null,
        alias: null,
      });
    });
  });
});
