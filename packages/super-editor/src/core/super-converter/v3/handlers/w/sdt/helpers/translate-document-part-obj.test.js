// @ts-check
import { describe, it, expect } from 'vitest';
import { translateDocumentPartObj } from './translate-document-part-obj.js';

describe('translateDocumentPartObj', () => {
  it('reuses passthrough sdtPr when docPartGallery is missing to avoid invalid XML', () => {
    const passthroughSdtPr = {
      name: 'w:sdtPr',
      elements: [
        { name: 'w:id', attributes: { 'w:val': '123' } },
        { name: 'w:docPartObj', elements: [] },
        { name: 'w:foo', attributes: { 'w:val': 'bar' } },
      ],
    };

    const node = {
      type: 'documentPartObject',
      content: [],
      attrs: {
        id: '123',
        docPartGallery: null,
        docPartUnique: true,
        sdtPr: passthroughSdtPr,
      },
    };

    const result = translateDocumentPartObj({ node });

    expect(result.elements[0]).toEqual(passthroughSdtPr);
    expect(
      result.elements[0].elements.find(
        (el) => el.name === 'w:docPartGallery' && el.attributes?.['w:val'] === 'undefined',
      ),
    ).toBeUndefined();
  });
});
