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
      elements: [{ name: 'w:tag', attributes: { 'w:val': 'test' } }],
    };

    const node = {
      content: [{ type: 'paragraph', text: 'Test' }],
      attrs: { sdtPr: mockSdtPr },
    };
    const params = { node };

    const result = translateStructuredContent(params);

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
});
