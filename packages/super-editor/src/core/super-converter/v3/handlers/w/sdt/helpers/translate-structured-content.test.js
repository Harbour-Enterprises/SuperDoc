import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateStructuredContent } from './translate-structured-content';
import { translateChildNodes } from '@converter/v2/exporter/helpers/translateChildNodes';

// Mock dependencies
vi.mock('@converter/v2/exporter/helpers/translateChildNodes', () => ({
  translateChildNodes: vi.fn(),
}));

describe('translateStructuredContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    translateChildNodes.mockReturnValue([{ name: 'w:p', elements: [{ name: 'w:t', text: 'Test content' }] }]);
  });

  it('returns correct XML structure with sdtPr and sdtContent', () => {
    const mockSdtPr = {
      name: 'w:sdtPr',
      elements: [],
      type: 'element',
    };

    const node = {
      content: [{ type: 'paragraph', text: 'Test' }],
      attrs: { sdtPr: mockSdtPr },
    };
    const params = { node };

    const result = translateStructuredContent(params);

    expect(translateChildNodes).toHaveBeenCalledWith({ ...params, node });
    expect(result).toEqual({
      name: 'w:sdt',
      elements: [
        mockSdtPr,
        {
          name: 'w:sdtContent',
          elements: [{ name: 'w:p', elements: [{ name: 'w:t', text: 'Test content' }] }],
        },
      ],
    });
  });

  it('returns runs when exporting structuredContent for final doc', () => {
    const node = {
      type: 'structuredContent',
      content: [{ type: 'text', text: 'Hello' }],
    };
    const params = { node, isFinalDoc: true };
    const childElements = [
      { name: 'w:r', elements: [{ name: 'w:t', text: 'Hello' }] },
      { name: 'w:t', text: 'World' },
    ];
    translateChildNodes.mockReturnValueOnce(childElements);

    const result = translateStructuredContent(params);

    expect(result).toEqual([
      childElements[0],
      {
        name: 'w:r',
        type: 'element',
        elements: [childElements[1]],
      },
    ]);
  });

  it('returns table element for structuredContentBlock in final doc', () => {
    const node = {
      type: 'structuredContentBlock',
      content: [
        {
          type: 'table',
          content: [],
        },
      ],
      attrs: {},
    };
    const params = { node, isFinalDoc: true };
    const childElements = [
      {
        name: 'w:tbl',
        elements: [
          {
            name: 'w:tr',
            elements: [{ name: 'w:tc', elements: [{ name: 'w:p', elements: [{ name: 'w:t', text: 'Cell' }] }] }],
          },
        ],
      },
    ];
    translateChildNodes.mockReturnValueOnce(childElements);

    const result = translateStructuredContent(params);

    expect(translateChildNodes).toHaveBeenCalledWith({ ...params, node });
    expect(result).toEqual(childElements[0]);
  });
});
