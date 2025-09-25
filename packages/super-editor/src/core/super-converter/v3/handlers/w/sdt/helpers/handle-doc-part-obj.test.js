// @ts-check
import { describe, it, expect, vi } from 'vitest';
import { handleDocPartObj, tableOfContentsHandler } from './handle-doc-part-obj.js';

describe('handleDocPartObj', () => {
  const mockNodeListHandler = {
    handler: vi.fn(() => [{ type: 'paragraph', content: [{ type: 'text', text: 'TOC Content' }] }]),
  };

  const createSdtNode = (docPartGalleryType) => ({
    name: 'w:sdt',
    elements: [
      {
        name: 'w:sdtPr',
        elements: [
          {
            name: 'w:docPartObj',
            elements: [
              {
                name: 'w:docPartGallery',
                attributes: { 'w:val': docPartGalleryType },
              },
            ],
          },
          { name: 'w:id', attributes: { 'w:val': '123' } },
        ],
      },
      {
        name: 'w:sdtContent',
        elements: [{ name: 'w:p', elements: [] }],
      },
    ],
  });

  it('should return null if nodes array is empty', () => {
    const params = { nodes: [] };
    const result = handleDocPartObj(params);
    expect(result).toBeNull();
  });

  it('should return null if the first node is not w:sdt', () => {
    const params = { nodes: [{ name: 'w:p', elements: [] }] };
    const result = handleDocPartObj(params);
    expect(result).toBeNull();
  });

  it('should return null if docPartGalleryType is not supported', () => {
    const node = createSdtNode('UnsupportedType');
    const params = { nodes: [node] };
    const result = handleDocPartObj(params);
    expect(result).toBeNull();
  });

  it('should call the correct handler for a supported docPartGalleryType', () => {
    const node = createSdtNode('Table of Contents');
    const params = { nodes: [node], nodeListHandler: mockNodeListHandler, path: [] };
    const result = handleDocPartObj(params);
    expect(mockNodeListHandler.handler).toHaveBeenCalled();
    expect(result).toEqual({
      type: 'documentPartObject',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'TOC Content' }] }],
      attrs: {
        id: '123',
        docPartGallery: 'Table of Contents',
        docPartUnique: true,
      },
    });
  });
});

describe('tableOfContentsHandler', () => {
  const mockNodeListHandler = {
    handler: vi.fn(() => [{ type: 'paragraph', content: [{ type: 'text', text: 'TOC Content' }] }]),
  };

  it('should process a Table of Contents node correctly', () => {
    const sdtPr = {
      name: 'w:sdtPr',
      elements: [{ name: 'w:id', attributes: { 'w:val': '456' } }],
    };
    const contentNode = {
      name: 'w:sdtContent',
      elements: [{ name: 'w:p', elements: [] }],
    };
    const params = {
      nodes: [contentNode],
      nodeListHandler: mockNodeListHandler,
      extraParams: { sdtPr },
      path: [],
    };

    const result = tableOfContentsHandler(params);

    expect(mockNodeListHandler.handler).toHaveBeenCalledWith({
      ...params,
      nodes: contentNode.elements,
      path: [contentNode],
    });
    expect(result).toEqual({
      type: 'documentPartObject',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'TOC Content' }] }],
      attrs: {
        id: '456',
        docPartGallery: 'Table of Contents',
        docPartUnique: true,
      },
    });
  });
});
