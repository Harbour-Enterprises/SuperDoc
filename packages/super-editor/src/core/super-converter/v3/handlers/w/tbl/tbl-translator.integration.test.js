// @ts-check
import { describe, it, expect, vi } from 'vitest';

import { translator as tblTranslator } from './tbl-translator.js';

const minimalDocx = {
  'word/styles.xml': {
    elements: [
      {
        name: 'w:styles',
        elements: [],
      },
    ],
  },
};

const minimalNodeListHandler = {
  handler: vi.fn(() => []),
};

describe('w:tbl translator integration', () => {
  it('handles vertically merged cells without throwing', () => {
    const tableNode = {
      name: 'w:tbl',
      elements: [
        { name: 'w:tblPr', elements: [] },
        {
          name: 'w:tr',
          elements: [
            {
              name: 'w:tc',
              elements: [
                {
                  name: 'w:tcPr',
                  elements: [{ name: 'w:vMerge', attributes: { 'w:val': 'restart' } }],
                },
              ],
            },
          ],
        },
        {
          name: 'w:tr',
          elements: [
            {
              name: 'w:tc',
              elements: [
                {
                  name: 'w:tcPr',
                  elements: [{ name: 'w:vMerge', attributes: { 'w:val': 'continue' } }],
                },
              ],
            },
          ],
        },
      ],
    };

    const params = {
      nodes: [tableNode],
      docx: minimalDocx,
      nodeListHandler: minimalNodeListHandler,
    };

    expect(() => tblTranslator.encode(params, {})).not.toThrow();
  });

  it('handles tables without a tblPr element', () => {
    const tableNode = {
      name: 'w:tbl',
      elements: [
        {
          name: 'w:tr',
          elements: [
            {
              name: 'w:tc',
              elements: [
                {
                  name: 'w:tcPr',
                  elements: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const params = {
      nodes: [tableNode],
      docx: minimalDocx,
      nodeListHandler: minimalNodeListHandler,
    };

    expect(() => tblTranslator.encode(params, {})).not.toThrow();
  });
});
