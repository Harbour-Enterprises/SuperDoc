import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getThemeColor,
  applyColorModifier,
  extractStrokeWidth,
  extractStrokeColor,
  extractFillColor,
} from './vector-shape-helpers.js';
import { emuToPixels } from '@converter/helpers.js';

vi.mock('@converter/helpers.js', () => ({
  emuToPixels: vi.fn(),
}));

describe('getThemeColor', () => {
  it('returns correct color for known theme names', () => {
    expect(getThemeColor('accent1')).toBe('#5b9bd5');
    expect(getThemeColor('accent6')).toBe('#70ad47');
  });

  it('returns default black for unknown theme name', () => {
    expect(getThemeColor('unknown')).toBe('#000000');
  });
});

describe('applyColorModifier', () => {
  it('applies shade modifier', () => {
    expect(applyColorModifier('#70ad47', 'shade', '50000')).toBe('#385724');
  });

  it('applies tint modifier', () => {
    expect(applyColorModifier('#70ad47', 'tint', '50000')).toBe('#b8d6a3');
  });

  it('applies lumMod modifier', () => {
    expect(applyColorModifier('#4472c4', 'lumMod', '60000')).toBe('#294476');
  });

  it('applies lumOff modifier', () => {
    expect(applyColorModifier('#294476', 'lumOff', '40000')).toBe('#8faadc');
  });

  it('returns original color for unknown modifier', () => {
    expect(applyColorModifier('#70ad47', 'unknown', '50000')).toBe('#70ad47');
  });
});

describe('extractStrokeWidth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    emuToPixels.mockImplementation((emu) => parseInt(emu, 10) / 12700);
  });

  it('extracts stroke width from a:ln element', () => {
    const spPr = {
      elements: [{ name: 'a:ln', attributes: { w: '25400' } }],
    };

    expect(extractStrokeWidth(spPr)).toBe(2);
  });

  it('returns default 1 when not found', () => {
    expect(extractStrokeWidth({ elements: [] })).toBe(1);
    expect(extractStrokeWidth(null)).toBe(1);
  });
});

describe('extractStrokeColor', () => {
  it('returns null when noFill is present', () => {
    const spPr = {
      elements: [
        {
          name: 'a:ln',
          elements: [{ name: 'a:noFill' }],
        },
      ],
    };

    expect(extractStrokeColor(spPr, null)).toBeNull();
  });

  it('extracts theme color with modifiers from spPr', () => {
    const spPr = {
      elements: [
        {
          name: 'a:ln',
          elements: [
            {
              name: 'a:solidFill',
              elements: [
                {
                  name: 'a:schemeClr',
                  attributes: { val: 'accent6' },
                  elements: [{ name: 'a:shade', attributes: { val: '75000' } }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(extractStrokeColor(spPr, null)).toBe('#548235');
  });

  it('extracts RGB color from srgbClr', () => {
    const spPr = {
      elements: [
        {
          name: 'a:ln',
          elements: [
            {
              name: 'a:solidFill',
              elements: [{ name: 'a:srgbClr', attributes: { val: 'ff0000' } }],
            },
          ],
        },
      ],
    };

    expect(extractStrokeColor(spPr, null)).toBe('#ff0000');
  });

  it('falls back to style when spPr has no stroke', () => {
    const spPr = { elements: [] };
    const style = {
      elements: [
        {
          name: 'a:lnRef',
          elements: [{ name: 'a:schemeClr', attributes: { val: 'accent1' } }],
        },
      ],
    };

    expect(extractStrokeColor(spPr, style)).toBe('#5b9bd5');
  });

  it('returns default black when nothing found', () => {
    expect(extractStrokeColor({ elements: [] }, null)).toBe('#000000');
  });
});

describe('extractFillColor', () => {
  it('returns null when noFill is present', () => {
    const spPr = { elements: [{ name: 'a:noFill' }] };
    expect(extractFillColor(spPr, null)).toBeNull();
  });

  it('extracts theme color with modifiers from spPr', () => {
    const spPr = {
      elements: [
        {
          name: 'a:solidFill',
          elements: [
            {
              name: 'a:schemeClr',
              attributes: { val: 'accent5' },
              elements: [
                { name: 'a:lumMod', attributes: { val: '60000' } },
                { name: 'a:lumOff', attributes: { val: '40000' } },
              ],
            },
          ],
        },
      ],
    };

    expect(extractFillColor(spPr, null)).toBe('#8faadc');
  });

  it('extracts RGB color from srgbClr', () => {
    const spPr = {
      elements: [
        {
          name: 'a:solidFill',
          elements: [{ name: 'a:srgbClr', attributes: { val: '00ff00' } }],
        },
      ],
    };

    expect(extractFillColor(spPr, null)).toBe('#00ff00');
  });

  it('returns placeholder for unsupported fills', () => {
    expect(extractFillColor({ elements: [{ name: 'a:gradFill' }] }, null)).toBe('#cccccc');
    expect(extractFillColor({ elements: [{ name: 'a:blipFill' }] }, null)).toBe('#cccccc');
  });

  it('falls back to style when spPr has no fill', () => {
    const spPr = { elements: [] };
    const style = {
      elements: [
        {
          name: 'a:fillRef',
          elements: [{ name: 'a:schemeClr', attributes: { val: 'accent6' } }],
        },
      ],
    };

    expect(extractFillColor(spPr, style)).toBe('#70ad47');
  });

  it('returns default accent1 when nothing found', () => {
    expect(extractFillColor({ elements: [] }, null)).toBe('#5b9bd5');
  });
});
