import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock converter helpers used by the SUT before importing it
vi.mock('@converter/helpers.js', () => ({
  twipsToInches: (n) => Number(n) / 1440,
  twipsToLines: (n) => Number(n) / 240, // arbitrary stub for predictable tests
  twipsToPixels: (n) => Number(n) / 10,
  twipsToPt: (n) => Number(n) / 20,
  eighthPointsToPixels: (n) => Number(n) / 2,
}));

// Import all named exports to allow spying on internal helpers
import * as helpers from './w-p-helpers.js';

const { parseParagraphBorders, getParagraphIndent, getParagraphSpacing, getDefaultParagraphStyle } = helpers;

describe('w-p-helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseParagraphBorders', () => {
    it('returns {} when input is missing or has no elements', () => {
      expect(parseParagraphBorders(undefined)).toEqual({});
      expect(parseParagraphBorders({})).toEqual({});
      expect(parseParagraphBorders({ elements: [] })).toEqual({});
    });

    it('parses sides with size, space, val and color', () => {
      const pBdr = {
        elements: [
          { name: 'w:top', attributes: { 'w:val': 'single', 'w:sz': '8', 'w:space': '4', 'w:color': 'FF00FF' } },
          { name: 'w:bottom', attributes: { 'w:val': 'double', 'w:sz': '6', 'w:space': '2' } },
          { name: 'w:left', attributes: { 'w:val': 'nil' } },
          { name: 'w:right', attributes: {} },
        ],
      };
      const res = parseParagraphBorders(pBdr);
      expect(res.top).toEqual({ val: 'single', size: 4, space: 2, color: '#FF00FF' });
      expect(res.bottom).toEqual({ val: 'double', size: 3, space: 1, color: '#000000' });
      expect(res.left).toBeUndefined();
      expect(res.right).toBeUndefined();
    });
  });

  describe('getParagraphIndent', () => {
    it('computes indents from inline w:ind attributes', () => {
      const node = {
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:ind',
                attributes: { 'w:left': '100', 'w:right': '200', 'w:firstLine': '50', 'w:hanging': '30' },
              },
            ],
          },
        ],
      };
      // Provide minimal styles with docDefaults to avoid parsing errors
      const docx = {
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
                          elements: [
                            { name: 'w:spacing', attributes: {} },
                            { name: 'w:ind', attributes: {} },
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
      const res = getParagraphIndent(node, docx);
      expect(res.left).toBe(10);
      expect(res.right).toBe(20);
      expect(res.firstLine).toBe(5);
      expect(res.hanging).toBe(3);
      // textIndent uses twipsToInches(left - hanging)
      expect(res.textIndent).toBeCloseTo((100 - 30) / 1440);
    });

    it('falls back to default paragraph style when inline missing', () => {
      const docx = {
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
                          elements: [
                            { name: 'w:spacing', attributes: {} },
                            {
                              name: 'w:ind',
                              attributes: { 'w:left': '40', 'w:right': '20', 'w:firstLine': '10', 'w:hanging': '5' },
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
      const node = { elements: [{ name: 'w:pPr', elements: [] }] };
      const res = getParagraphIndent(node, docx);
      expect(res.left).toBe(4);
      expect(res.right).toBe(2);
      expect(res.firstLine).toBe(1);
      expect(res.hanging).toBe(0.5);
      expect(res.textIndent).toBeCloseTo((40 - 5) / 1440);
    });
  });

  describe('getParagraphSpacing', () => {
    it('uses inline spacing values with conversions', () => {
      const node = {
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:spacing',
                attributes: {
                  'w:line': '240',
                  'w:lineRule': 'auto',
                  'w:before': '120',
                  'w:after': '360',
                },
              },
            ],
          },
        ],
      };
      const res = getParagraphSpacing(node, {}, '');
      expect(res.line).toBe(1); // 240 / 240
      expect(res.lineRule).toBe('auto');
      expect(res.lineSpaceBefore).toBe(12); // 120 / 10
      expect(res.lineSpaceAfter).toBe(36); // 360 / 10
    });

    it('handles lineRule exact with pt conversion', () => {
      const node = {
        elements: [
          {
            name: 'w:pPr',
            elements: [{ name: 'w:spacing', attributes: { 'w:line': '400', 'w:lineRule': 'exact' } }],
          },
        ],
      };
      const res = getParagraphSpacing(node, {}, '');
      expect(res.lineRule).toBe('exact');
      expect(res.line).toBe(`${400 / 20}pt`);
    });

    it('adds autospacing using font size from marks', () => {
      const node = {
        elements: [
          {
            name: 'w:pPr',
            elements: [
              {
                name: 'w:spacing',
                attributes: {
                  'w:before': '10',
                  'w:after': '10',
                  'w:beforeAutospacing': '1',
                  'w:afterAutospacing': '1',
                },
              },
            ],
          },
        ],
      };
      const marks = [{ type: 'textStyle', attrs: { fontSize: '12' } }];
      const res = getParagraphSpacing(node, {}, '', marks);
      const auto = Math.round((parseInt('12') * 0.5 * 96) / 72);
      expect(res.lineSpaceBefore).toBe(1 + auto);
      expect(res.lineSpaceAfter).toBe(1 + auto);
    });

    it('falls back to default paragraph style spacing when inline missing', () => {
      const docx = {
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
                          elements: [
                            {
                              name: 'w:spacing',
                              attributes: {
                                'w:line': '480',
                                'w:lineRule': 'auto',
                                'w:before': '120',
                                'w:after': '240',
                              },
                            },
                            { name: 'w:ind', attributes: {} },
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
      const node = { elements: [{ name: 'w:pPr', elements: [] }] };
      const res = getParagraphSpacing(node, docx, '');
      expect(res.line).toBe(2); // 480 / 240
      expect(res.lineSpaceBefore).toBe(12);
      expect(res.lineSpaceAfter).toBe(24);
    });

    it('suppresses default spacing when paragraph is inside a table cell', () => {
      const docx = {
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
                          elements: [
                            {
                              name: 'w:spacing',
                              attributes: {
                                'w:after': '240',
                              },
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
      const node = { elements: [{ name: 'w:pPr', elements: [] }] };
      const res = getParagraphSpacing(node, docx, '', [], { insideTable: true });
      expect(res).toBeUndefined();
    });
  });

  describe('getDefaultParagraphStyle', () => {
    const mkDocx = (overrides = {}) => ({
      'word/styles.xml': {
        elements: [
          {
            elements: [
              // defaults
              {
                name: 'w:docDefaults',
                elements: [
                  {
                    name: 'w:pPrDefault',
                    elements: [
                      {
                        name: 'w:pPr',
                        elements: [
                          { name: 'w:spacing', attributes: { 'w:line': '240', 'w:before': '0', 'w:after': '0' } },
                          { name: 'w:ind', attributes: { 'w:left': '0', 'w:right': '0' } },
                        ],
                      },
                    ],
                  },
                ],
              },
              // Normal style
              {
                name: 'w:style',
                attributes: { 'w:styleId': 'Normal', 'w:default': overrides.isNormalDefault ? '1' : '0' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [
                      { name: 'w:spacing', attributes: { 'w:line': '360', 'w:before': '120', 'w:after': '120' } },
                      { name: 'w:ind', attributes: { 'w:left': '100', 'w:right': '50' } },
                    ],
                  },
                ],
              },
              // Specific style by id
              overrides.withStyle && {
                name: 'w:style',
                attributes: { 'w:styleId': 'MyStyle' },
                elements: [
                  {
                    name: 'w:pPr',
                    elements: [
                      { name: 'w:spacing', attributes: { 'w:line': '480', 'w:before': '240', 'w:after': '240' } },
                      { name: 'w:ind', attributes: { 'w:left': '200', 'w:right': '80' } },
                      { name: 'w:jc', attributes: { 'w:val': 'center' } },
                    ],
                  },
                ],
              },
            ].filter(Boolean),
          },
        ],
      },
    });

    it('returns defaults when Normal is not default', () => {
      const docx = mkDocx({ isNormalDefault: false });
      const res = getDefaultParagraphStyle(docx);
      expect(res.spacing).toEqual({ 'w:line': '240', 'w:before': '0', 'w:after': '0' });
      expect(res.indent).toEqual({ 'w:left': '0', 'w:right': '0' });
    });

    it('prefers Normal when marked as default', () => {
      const docx = mkDocx({ isNormalDefault: true });
      const res = getDefaultParagraphStyle(docx);
      expect(res.spacing).toEqual({ 'w:line': '360', 'w:before': '120', 'w:after': '120' });
      expect(res.indent).toEqual({ 'w:left': '100', 'w:right': '50' });
    });

    it('overrides by styleId when provided', () => {
      const docx = mkDocx({ isNormalDefault: false, withStyle: true });
      const res = getDefaultParagraphStyle(docx, 'MyStyle');
      expect(res.spacing).toEqual({ 'w:line': '480', 'w:before': '240', 'w:after': '240' });
      expect(res.indent).toEqual({ 'w:left': '200', 'w:right': '80' });
      expect(res.justify).toEqual({ 'w:val': 'center' });
    });
  });
});
