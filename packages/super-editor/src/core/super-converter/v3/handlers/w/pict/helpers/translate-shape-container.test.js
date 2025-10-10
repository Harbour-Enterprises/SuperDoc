import { describe, it, expect, vi } from 'vitest';
import { translateShapeContainer } from './translate-shape-container';
import { translateChildNodes } from '@converter/v2/exporter/helpers/translateChildNodes';
import { generateRandomSigned32BitIntStrId } from '@helpers/generateDocxRandomId';
import { wrapTextInRun } from '@converter/exporter';

vi.mock('@converter/v2/exporter/helpers/translateChildNodes');
vi.mock('@helpers/generateDocxRandomId');
vi.mock('@converter/exporter');

describe('translateShapeContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateRandomSigned32BitIntStrId.mockReturnValue('12345678');
    wrapTextInRun.mockImplementation((content) => ({ name: 'w:r', elements: [content] }));
  });

  it('should create shape container structure with all nested elements', () => {
    const mockElements = [{ name: 'v:textbox' }];
    translateChildNodes.mockReturnValue(mockElements);

    const params = {
      node: {
        attrs: {
          attributes: {
            id: '_x0000_s1026',
            type: '#_x0000_t202',
            style: 'position:absolute',
          },
          fillcolor: '#4472C4',
        },
      },
    };

    const result = translateShapeContainer(params);

    expect(result).toEqual({
      name: 'w:p',
      elements: [
        {
          name: 'w:r',
          elements: [
            {
              name: 'w:pict',
              attributes: {
                'w14:anchorId': '12345678',
              },
              elements: [
                {
                  name: 'v:shape',
                  attributes: {
                    id: '_x0000_s1026',
                    type: '#_x0000_t202',
                    style: 'position:absolute',
                    fillcolor: '#4472C4',
                  },
                  elements: mockElements,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should include w10:wrap when wrapAttributes are present', () => {
    translateChildNodes.mockReturnValue([]);

    const params = {
      node: {
        attrs: {
          attributes: { id: 'shape1' },
          fillcolor: '#FFFFFF',
          wrapAttributes: {
            type: 'square',
            side: 'both',
          },
        },
      },
    };

    const result = translateShapeContainer(params);
    const shape = result.elements[0].elements[0].elements[0];

    expect(shape.elements).toContainEqual({
      name: 'w10:wrap',
      attributes: {
        type: 'square',
        side: 'both',
      },
    });
  });

  it('should not include w10:wrap when wrapAttributes are absent', () => {
    translateChildNodes.mockReturnValue([{ name: 'v:textbox' }]);

    const params = {
      node: {
        attrs: {
          attributes: { id: 'shape1' },
          fillcolor: '#FFFFFF',
        },
      },
    };

    const result = translateShapeContainer(params);
    const shape = result.elements[0].elements[0].elements[0];

    expect(shape.elements).not.toContainEqual(expect.objectContaining({ name: 'w10:wrap' }));
  });
});
