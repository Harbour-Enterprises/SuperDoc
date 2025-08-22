import { expect, describe, it } from 'vitest';
import { parseMarks } from '@core/super-converter/v2/importer/markImporter.js';
import { handleParagraphNode } from '@core/super-converter/v2/importer/paragraphNodeImporter.js';
import { defaultNodeListHandler } from '@core/super-converter/v2/importer/docxImporter.js';
import { Underline } from '@extensions/underline/underline.js';

const createMockDocx = (styles = []) => ({
  'word/styles.xml': {
    elements: [
      {
        name: 'w:styles',
        elements: [
          {
            name: 'w:docDefaults',
            elements: [],
          },
          ...styles,
        ],
      },
    ],
  },
});

const createMockRunProperty = (name, attributes = {}) => ({
  name,
  attributes,
});

// Simple NodeListHandler that delegates run/paragraph nodes to defaults
const nodeListHandler = defaultNodeListHandler();

// Underline specific helpers
const createUnderlineNoneNoVal = (extraAttrs = { 'w:color': '000000' }) => createMockRunProperty('w:u', extraAttrs);

describe('underlineImporter', () => {
  it('should override paragraph underline (single) with run underline (none)', () => {
    const mockDocx = createMockDocx([]);
    // Run node directly contains w:u with no w:val, only color
    const result = handleParagraphNode({
      nodes: [
        {
          name: 'w:p',
          elements: [
            {
              name: 'w:pPr',
              elements: [
                {
                  name: 'w:u',
                  elements: [
                    {
                      name: 'w:val',
                      attributes: { 'w:val': 'single' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'w:r',
              elements: [
                {
                  name: 'w:rPr',
                  elements: [
                    {
                      name: 'w:u',
                      attributes: { 'w:color': '000000' },
                    },
                  ],
                },
                {
                  name: 'w:t',
                  elements: [{ text: 'Underlined text' }],
                },
              ],
            },
          ],
        },
      ],
      nodeListHandler,
      docx: mockDocx,
    });

    expect(result.nodes).toHaveLength(1);
    const paragraph = result.nodes[0];
    const textNode = paragraph.content[0];

    const noneUnderline = textNode.marks.find((m) => m.type === 'underline' && m.attrs?.underlineType === 'none');
    expect(noneUnderline).toBeDefined();
    // Ensure underlineType 'single' from paragraph isn't present on any underline mark
    const singleUnderline = textNode.marks.find((m) => m.type === 'underline' && m.attrs?.underlineType === 'single');
    expect(singleUnderline).toBeUndefined();

    // Render DOM for underline mark to verify class
    const underlineDom = Underline.config.renderDOM.call(
      { ...Underline, options: Underline.config.addOptions() },
      {
        htmlAttributes: {},
        mark: noneUnderline,
      },
    );
    // underlineDom = ['u', attrs, 0]
    expect(underlineDom[1].class).toContain('underline-hidden');
  });

  it('should add underlineType none via parseMarks when w:u lacks w:val', () => {
    const propertyNode = {
      name: 'w:rPr',
      elements: [createUnderlineNoneNoVal()],
    };

    const marks = parseMarks(propertyNode, [], null);
    const underlineMark = marks.find((m) => m.type === 'underline');
    expect(underlineMark).toBeDefined();
    expect(underlineMark.attrs.underlineType).toBe('none');
  });
});
