import { describe, it, expect, vi } from 'vitest';
import { translateContentBlock, translateVRectContentBlock } from './translate-content-block';
import { translator as alternateChoiceTranslator } from '@converter/v3/handlers/mc/altermateContent';
import { generateRandomSigned32BitIntStrId } from '@helpers/generateDocxRandomId';
import { wrapTextInRun } from '@converter/exporter';

vi.mock('@converter/v3/handlers/mc/altermateContent');
vi.mock('@helpers/generateDocxRandomId');
vi.mock('@converter/exporter');

describe('translateContentBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wrapTextInRun.mockImplementation((content) => ({ name: 'w:r', elements: [content] }));
  });

  it('should use alternateChoiceTranslator when no vmlAttributes or horizontalRule', () => {
    const mockAlternateContent = { name: 'mc:AlternateContent' };
    alternateChoiceTranslator.decode.mockReturnValue(mockAlternateContent);

    const params = {
      node: {
        attrs: {},
      },
    };

    const result = translateContentBlock(params);

    expect(alternateChoiceTranslator.decode).toHaveBeenCalledWith(params);
    expect(wrapTextInRun).toHaveBeenCalledWith(mockAlternateContent);
  });

  it('should use translateVRectContentBlock when vmlAttributes present', () => {
    const params = {
      node: {
        attrs: {
          vmlAttributes: { hr: 't' },
        },
      },
    };

    generateRandomSigned32BitIntStrId.mockReturnValue('12345678');

    const result = translateContentBlock(params);

    expect(alternateChoiceTranslator.decode).not.toHaveBeenCalled();
    expect(result.elements[0].name).toBe('w:pict');
  });

  it('should use translateVRectContentBlock when horizontalRule is true', () => {
    const params = {
      node: {
        attrs: {
          horizontalRule: true,
        },
      },
    };

    generateRandomSigned32BitIntStrId.mockReturnValue('12345678');

    const result = translateContentBlock(params);

    expect(alternateChoiceTranslator.decode).not.toHaveBeenCalled();
    expect(result.elements[0].name).toBe('w:pict');
  });
});

describe('translateVRectContentBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateRandomSigned32BitIntStrId.mockReturnValue('12345678');
    wrapTextInRun.mockImplementation((content) => ({ name: 'w:r', elements: [content] }));
  });

  it('should create v:rect with basic attributes', () => {
    const params = {
      node: {
        attrs: {
          attributes: { id: '_x0000_i1025' },
          style: 'width:100pt;height:1.5pt',
        },
      },
    };

    const result = translateVRectContentBlock(params);
    const pict = result.elements[0];
    const rect = pict.elements[0];

    expect(rect).toEqual({
      name: 'v:rect',
      attributes: {
        id: '_x0000_i1025',
        style: 'width:100pt;height:1.5pt',
      },
    });
  });

  it('should add fillcolor when background is present', () => {
    const params = {
      node: {
        attrs: {
          background: '#4472C4',
        },
      },
    };

    const result = translateVRectContentBlock(params);
    const rect = result.elements[0].elements[0];

    expect(rect.attributes.fillcolor).toBe('#4472C4');
  });

  it('should add vmlAttributes to rect', () => {
    const params = {
      node: {
        attrs: {
          vmlAttributes: {
            hralign: 'center',
            hrstd: 't',
            hr: 't',
            stroked: 'f',
          },
        },
      },
    };

    const result = translateVRectContentBlock(params);
    const rect = result.elements[0].elements[0];

    expect(rect.attributes).toMatchObject({
      'o:hralign': 'center',
      'o:hrstd': 't',
      'o:hr': 't',
      stroked: 'f',
    });
  });

  it('should generate random id when not provided', () => {
    const params = {
      node: {
        attrs: {},
      },
    };

    const result = translateVRectContentBlock(params);
    const rect = result.elements[0].elements[0];

    expect(rect.attributes.id).toMatch(/^_x0000_i\d+$/);
  });

  it('should merge additional attributes without overwriting existing ones', () => {
    const params = {
      node: {
        attrs: {
          attributes: {
            id: 'custom-id',
            'o:button': 't',
            fillcolor: 'should-not-override',
          },
          background: '#FF0000',
        },
      },
    };

    const result = translateVRectContentBlock(params);
    const rect = result.elements[0].elements[0];

    expect(rect.attributes.id).toBe('custom-id');
    expect(rect.attributes.fillcolor).toBe('#FF0000');
    expect(rect.attributes['o:button']).toBe('t');
  });

  it('should wrap rect in pict with anchorId', () => {
    const params = {
      node: {
        attrs: {},
      },
    };

    const result = translateVRectContentBlock(params);
    const pict = result.elements[0];

    expect(pict.name).toBe('w:pict');
    expect(pict.attributes['w14:anchorId']).toBe('12345678');
    expect(generateRandomSigned32BitIntStrId).toHaveBeenCalled();
  });
});
