import { describe, expect, it, vi } from 'vitest';
import {
  createOoxmlResolver,
  resolveStyleChain,
  getDefaultProperties,
  getStyleProperties,
  getNumberingProperties,
  resolveDocxFontFamily,
  resolveRunProperties,
  resolveParagraphProperties,
  type OoxmlTranslator,
  type OoxmlResolverParams,
} from './index.js';

// Mock translators for testing
const mockPPrTranslator: OoxmlTranslator = {
  xmlName: 'w:pPr',
  encode: vi.fn((params) => {
    const nodes = (params as { nodes?: Array<Record<string, unknown>> })?.nodes;
    if (!nodes || nodes.length === 0) return {};
    // Simple mock implementation that extracts test data
    return (nodes[0]?.mockData as Record<string, unknown>) || {};
  }),
};

const mockRPrTranslator: OoxmlTranslator = {
  xmlName: 'w:rPr',
  encode: vi.fn((params) => {
    const nodes = (params as { nodes?: Array<Record<string, unknown>> })?.nodes;
    if (!nodes || nodes.length === 0) return {};
    return (nodes[0]?.mockData as Record<string, unknown>) || {};
  }),
};

describe('ooxml - createOoxmlResolver', () => {
  it('returns an object with all expected methods', () => {
    const resolver = createOoxmlResolver({ pPr: mockPPrTranslator, rPr: mockRPrTranslator });
    expect(resolver).toHaveProperty('resolveRunProperties');
    expect(resolver).toHaveProperty('resolveParagraphProperties');
    expect(resolver).toHaveProperty('getDefaultProperties');
    expect(resolver).toHaveProperty('getStyleProperties');
    expect(resolver).toHaveProperty('resolveStyleChain');
    expect(resolver).toHaveProperty('getNumberingProperties');
    expect(typeof resolver.resolveRunProperties).toBe('function');
    expect(typeof resolver.resolveParagraphProperties).toBe('function');
    expect(typeof resolver.getDefaultProperties).toBe('function');
    expect(typeof resolver.getStyleProperties).toBe('function');
    expect(typeof resolver.resolveStyleChain).toBe('function');
    expect(typeof resolver.getNumberingProperties).toBe('function');
  });

  it('creates a resolver with bound methods', () => {
    const resolver = createOoxmlResolver({ pPr: mockPPrTranslator, rPr: mockRPrTranslator });
    // Methods should be callable without context
    expect(() => resolver.getDefaultProperties).not.toThrow();
  });
});

describe('ooxml - resolveStyleChain', () => {
  it('returns empty object when styleId is undefined', () => {
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveStyleChain(params, undefined, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when styleId is "Normal"', () => {
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveStyleChain(params, 'Normal', mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('resolves a single style without basedOn', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 32, bold: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = resolveStyleChain(params, 'Heading1', mockRPrTranslator);
    expect(result).toEqual({ fontSize: 32, bold: true });
  });

  it('follows basedOn chain and combines properties', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'BaseStyle' },
                  elements: [
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 22, italic: true },
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'DerivedStyle' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'BaseStyle' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 24, bold: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = resolveStyleChain(params, 'DerivedStyle', mockRPrTranslator);
    expect(result).toEqual({ fontSize: 24, bold: true, italic: true });
  });

  it('detects and breaks cycles in basedOn chain', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'StyleA' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'StyleB' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 22 },
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'StyleB' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'StyleA' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { bold: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    // Should not infinite loop
    const result = resolveStyleChain(params, 'StyleA', mockRPrTranslator);
    expect(result).toHaveProperty('fontSize');
    expect(result).toHaveProperty('bold');
  });

  it('returns empty object when followBasedOnChain is false', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'DerivedStyle' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'BaseStyle' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 24 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = resolveStyleChain(params, 'DerivedStyle', mockRPrTranslator, false);
    expect(result).toEqual({ fontSize: 24 }); // Only direct style, no basedOn
  });

  it('handles missing style definitions gracefully', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [{ elements: [] }],
        },
      },
    };
    const result = resolveStyleChain(params, 'MissingStyle', mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('handles empty docx', () => {
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveStyleChain(params, 'AnyStyle', mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('combines multiple levels in basedOn chain correctly', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Level1' },
                  elements: [
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 20, bold: true, color: 'red' },
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Level2' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'Level1' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 22, italic: true },
                    },
                  ],
                },
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Level3' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'Level2' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 24, strike: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = resolveStyleChain(params, 'Level3', mockRPrTranslator);
    expect(result).toEqual({
      fontSize: 24, // From Level3 (highest priority)
      bold: true, // From Level1
      italic: true, // From Level2
      strike: true, // From Level3
      color: 'red', // From Level1
    });
  });
});

describe('ooxml - getDefaultProperties', () => {
  it('extracts default properties from w:docDefaults', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [
                        {
                          name: 'w:rPr',
                          mockData: { fontSize: 22, fontFamily: { ascii: 'Calibri' } },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({ fontSize: 22, fontFamily: { ascii: 'Calibri' } });
  });

  it('returns empty object when w:docDefaults is missing', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Normal' },
                },
              ],
            },
          ],
        },
      },
    };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when styles.xml is missing', () => {
    const params: OoxmlResolverParams = { docx: {} };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when docx is missing', () => {
    const params: OoxmlResolverParams = {};
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when elements are empty', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [],
        },
      },
    };
    const result = getDefaultProperties(params, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('handles w:pPrDefault for paragraph defaults', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:pPrDefault',
                      elements: [
                        {
                          name: 'w:pPr',
                          mockData: { spacing: { before: 0, after: 0 } },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getDefaultProperties(params, mockPPrTranslator);
    expect(result).toEqual({ spacing: { before: 0, after: 0 } });
  });

  it('returns empty object when translator.encode returns null', () => {
    const nullTranslator: OoxmlTranslator = {
      xmlName: 'w:rPr',
      encode: vi.fn(() => null),
    };
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:docDefaults',
                  elements: [
                    {
                      name: 'w:rPrDefault',
                      elements: [{ name: 'w:rPr' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getDefaultProperties(params, nullTranslator);
    expect(result).toEqual({});
  });
});

describe('ooxml - getStyleProperties', () => {
  it('extracts style properties and metadata', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Heading1', 'w:default': '1' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'Normal' },
                    },
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 32, bold: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getStyleProperties(params, 'Heading1', mockRPrTranslator);
    expect(result).toEqual({
      properties: { fontSize: 32, bold: true },
      isDefault: true,
      basedOn: 'Normal',
    });
  });

  it('returns empty result when styleId is not provided', () => {
    const params: OoxmlResolverParams = { docx: {} };
    const result = getStyleProperties(params, '', mockRPrTranslator);
    expect(result).toEqual({ properties: {}, isDefault: false, basedOn: null });
  });

  it('returns empty result when style is not found', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'OtherStyle' },
                },
              ],
            },
          ],
        },
      },
    };
    const result = getStyleProperties(params, 'MissingStyle', mockRPrTranslator);
    // When style is not found, basedOn is undefined (not extracted from undefined style)
    expect(result).toEqual({ properties: {}, isDefault: false, basedOn: undefined });
  });

  it('extracts basedOn even when properties are missing', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'DerivedStyle' },
                  elements: [
                    {
                      name: 'w:basedOn',
                      attributes: { 'w:val': 'BaseStyle' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getStyleProperties(params, 'DerivedStyle', mockRPrTranslator);
    expect(result).toEqual({ properties: {}, isDefault: false, basedOn: 'BaseStyle' });
  });

  it('sets isDefault to false when w:default is not "1"', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'CustomStyle', 'w:default': '0' },
                  elements: [
                    {
                      name: 'w:rPr',
                      mockData: { fontSize: 22 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getStyleProperties(params, 'CustomStyle', mockRPrTranslator);
    expect(result.isDefault).toBe(false);
  });

  it('handles missing elements array', () => {
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [],
        },
      },
    };
    const result = getStyleProperties(params, 'AnyStyle', mockRPrTranslator);
    expect(result).toEqual({ properties: {}, isDefault: false, basedOn: null });
  });

  it('returns empty properties when translator.encode returns null', () => {
    const nullTranslator: OoxmlTranslator = {
      xmlName: 'w:rPr',
      encode: vi.fn(() => null),
    };
    const params: OoxmlResolverParams = {
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'Style1' },
                  elements: [{ name: 'w:rPr' }],
                },
              ],
            },
          ],
        },
      },
    };
    const result = getStyleProperties(params, 'Style1', nullTranslator);
    expect(result.properties).toEqual({});
  });
});

describe('ooxml - getNumberingProperties', () => {
  const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };

  it('returns empty object when numbering is null', () => {
    const params: OoxmlResolverParams = { numbering: null };
    const result = getNumberingProperties(translators, params, 0, 1, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when numbering is undefined', () => {
    const params: OoxmlResolverParams = {};
    const result = getNumberingProperties(translators, params, 0, 1, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when definitions or abstracts are missing', () => {
    const params: OoxmlResolverParams = {
      numbering: { definitions: {}, abstracts: undefined },
    };
    const result = getNumberingProperties(translators, params, 0, 1, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when numId definition is not found', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: { num2: {} },
        abstracts: {},
      },
    };
    const result = getNumberingProperties(translators, params, 0, 1, mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('extracts properties from abstractNum level definition', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { bold: true, fontSize: 22 },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({ bold: true, fontSize: 22 });
  });

  it('applies lvlOverride over abstractNum properties', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
              {
                name: 'w:lvlOverride',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { fontSize: 24, italic: true },
                  },
                ],
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { fontSize: 22, bold: true },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({
      fontSize: 24, // Override wins
      italic: true, // From override
      bold: true, // From abstract
    });
  });

  it('follows numStyleLink when present and tries < 1', () => {
    // This test verifies that when an abstractNum has a numStyleLink, it follows
    // the linked style and recursively resolves numbering from that style's numId
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
            ],
          },
          2: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract2' },
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:numStyleLink',
                attributes: { 'w:val': 'ListStyle1' },
              },
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { fontSize: 22 }, // This should be overridden by recursive call
                  },
                ],
              },
            ],
          },
          abstract2: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { bold: true },
                  },
                ],
              },
            ],
          },
        },
      },
      docx: {
        'word/styles.xml': {
          elements: [
            {
              elements: [
                {
                  name: 'w:style',
                  attributes: { 'w:styleId': 'ListStyle1' },
                  elements: [
                    {
                      name: 'w:pPr',
                      mockData: {
                        numberingProperties: { numId: 2 },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    };

    // Mock pPr translator to extract numberingProperties from style
    const pPrTranslatorWithNumPr: OoxmlTranslator = {
      xmlName: 'w:pPr',
      encode: vi.fn((params) => {
        const nodes = (params as { nodes?: Array<Record<string, unknown>> })?.nodes;
        if (!nodes || nodes.length === 0) return {};
        return (nodes[0]?.mockData as Record<string, unknown>) || {};
      }),
    };

    const result = getNumberingProperties(
      { pPr: pPrTranslatorWithNumPr, rPr: mockRPrTranslator },
      params,
      0,
      'num1',
      mockRPrTranslator,
      0, // tries = 0
    );
    expect(result).toEqual({ bold: true });
  });

  it('extracts pStyle from level definition', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '0' },
                elements: [
                  {
                    name: 'w:pStyle',
                    attributes: { 'w:val': 'ListParagraph' },
                  },
                  {
                    name: 'w:rPr',
                    mockData: { bold: true },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({ bold: true, styleId: 'ListParagraph' });
  });

  it('handles numeric ilvl matching', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': 0 }, // Numeric
                elements: [
                  {
                    name: 'w:rPr',
                    mockData: { fontSize: 22 },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({ fontSize: 22 });
  });

  it('returns empty object when abstractNum is missing', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'missingAbstract' },
              },
            ],
          },
        },
        abstracts: {},
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({});
  });

  it('returns empty object when level definition is not found', () => {
    const params: OoxmlResolverParams = {
      numbering: {
        definitions: {
          num1: {
            elements: [
              {
                name: 'w:abstractNumId',
                attributes: { 'w:val': 'abstract1' },
              },
            ],
          },
        },
        abstracts: {
          abstract1: {
            elements: [
              {
                name: 'w:lvl',
                attributes: { 'w:ilvl': '1' }, // Different level
                elements: [],
              },
            ],
          },
        },
      },
    };
    const result = getNumberingProperties(translators, params, 0, 'num1', mockRPrTranslator);
    expect(result).toEqual({});
  });
});

describe('ooxml - resolveDocxFontFamily', () => {
  it('extracts ascii font when available', () => {
    const attributes = { 'w:ascii': 'Calibri', 'w:hAnsi': 'Arial' };
    const result = resolveDocxFontFamily(attributes, null);
    expect(result).toBe('Calibri');
  });

  it('returns null when attributes is null', () => {
    const result = resolveDocxFontFamily(null, null);
    expect(result).toBeNull();
  });

  it('returns null when attributes is undefined', () => {
    const result = resolveDocxFontFamily(undefined, null);
    expect(result).toBeNull();
  });

  it('returns null when attributes is not an object', () => {
    expect(resolveDocxFontFamily('not-an-object' as never, null)).toBeNull();
    expect(resolveDocxFontFamily(123 as never, null)).toBeNull();
  });

  it('extracts ascii without w: prefix', () => {
    const attributes = { ascii: 'Arial' };
    const result = resolveDocxFontFamily(attributes, null);
    expect(result).toBe('Arial');
  });

  it('resolves theme font when asciiTheme is present', () => {
    const attributes = { 'w:asciiTheme': 'minorHAnsi' };
    const docx = {
      'word/theme/theme1.xml': {
        elements: [
          {
            elements: [
              {
                name: 'a:themeElements',
                elements: [
                  {
                    name: 'a:fontScheme',
                    elements: [
                      {
                        name: 'a:minorFont',
                        elements: [
                          {
                            name: 'a:latin',
                            attributes: { typeface: 'Calibri' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = resolveDocxFontFamily(attributes, docx);
    expect(result).toBe('Calibri');
  });

  it('resolves major theme font', () => {
    const attributes = { 'w:asciiTheme': 'majorHAnsi' };
    const docx = {
      'word/theme/theme1.xml': {
        elements: [
          {
            elements: [
              {
                name: 'a:themeElements',
                elements: [
                  {
                    name: 'a:fontScheme',
                    elements: [
                      {
                        name: 'a:majorFont',
                        elements: [
                          {
                            name: 'a:latin',
                            attributes: { typeface: 'Cambria' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = resolveDocxFontFamily(attributes, docx);
    expect(result).toBe('Cambria');
  });

  it('falls back to ascii when theme resolution fails', () => {
    const attributes = { 'w:ascii': 'Arial', 'w:asciiTheme': 'minorHAnsi' };
    const docx = {}; // No theme
    const result = resolveDocxFontFamily(attributes, docx);
    expect(result).toBe('Arial');
  });

  it('applies toCssFontFamily callback when provided', () => {
    const attributes = { 'w:ascii': 'Calibri' };
    const toCssFontFamily = (fontName: string) => `${fontName}, sans-serif`;
    const result = resolveDocxFontFamily(attributes, null, toCssFontFamily);
    expect(result).toBe('Calibri, sans-serif');
  });

  it('returns null when no font is found', () => {
    const attributes = {};
    const result = resolveDocxFontFamily(attributes, null);
    expect(result).toBeNull();
  });

  it('handles asciiTheme without w: prefix', () => {
    const attributes = { asciiTheme: 'minorHAnsi' };
    const docx = {
      'word/theme/theme1.xml': {
        elements: [
          {
            elements: [
              {
                name: 'a:themeElements',
                elements: [
                  {
                    name: 'a:fontScheme',
                    elements: [
                      {
                        name: 'a:minorFont',
                        elements: [
                          {
                            name: 'a:latin',
                            attributes: { typeface: 'Calibri' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const result = resolveDocxFontFamily(attributes, docx);
    expect(result).toBe('Calibri');
  });
});

describe('ooxml - resolveRunProperties (smoke test)', () => {
  it('returns an object with fontSize property', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveRunProperties(translators, params, null, null);
    expect(result).toHaveProperty('fontSize');
    expect(typeof result.fontSize).toBe('number');
  });

  it('accepts all required parameters', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const inlineRpr = { fontSize: 24 };
    const resolvedPpr = { styleId: 'Normal' };
    const result = resolveRunProperties(translators, params, inlineRpr, resolvedPpr, false, false);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('handles isListNumber flag', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveRunProperties(translators, params, null, null, true, false);
    expect(result).toBeDefined();
  });

  it('handles numberingDefinedInline flag', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveRunProperties(translators, params, null, null, false, true);
    expect(result).toBeDefined();
  });
});

describe('ooxml - resolveParagraphProperties (smoke test)', () => {
  it('returns an object', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveParagraphProperties(translators, params, null);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('accepts all optional parameters', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const inlineProps = { styleId: 'Heading1' };
    const result = resolveParagraphProperties(translators, params, inlineProps, true, true, 'TableNormal');
    expect(result).toBeDefined();
  });

  it('handles insideTable flag', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveParagraphProperties(translators, params, null, true);
    expect(result).toBeDefined();
  });

  it('handles overrideInlineStyleId flag', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveParagraphProperties(translators, params, null, false, true);
    expect(result).toBeDefined();
  });

  it('handles tableStyleId parameter', () => {
    const translators = { pPr: mockPPrTranslator, rPr: mockRPrTranslator };
    const params: OoxmlResolverParams = { docx: {} };
    const result = resolveParagraphProperties(translators, params, null, false, false, 'TableGrid');
    expect(result).toBeDefined();
  });
});
