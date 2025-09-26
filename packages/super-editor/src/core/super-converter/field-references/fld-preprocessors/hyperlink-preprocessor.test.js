// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preProcessHyperlinkInstruction } from './hyperlink-preprocessor.js';
import { generateDocxRandomId } from '@helpers/generateDocxRandomId.js';

vi.mock('@helpers/generateDocxRandomId.js', () => ({
  generateDocxRandomId: vi.fn(),
}));

describe('preProcessHyperlinkInstruction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateDocxRandomId.mockReturnValue('rId123');
  });

  const mockNodesToCombine = [
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'begin' } }] },
    {
      name: 'w:r',
      elements: [{ name: 'w:instrText', elements: [{ type: 'text', text: 'HYPERLINK "http://example.com"' }] }],
    },
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'separate' } }] },
    { name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'link text' }] }] },
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'end' } }] },
  ];

  it('should process a simple hyperlink instruction with a URL and add a relationship', () => {
    const instruction = 'HYPERLINK "http://example.com"';
    const mockDocx = {
      'word/_rels/document.xml.rels': {
        elements: [
          {
            name: 'Relationships',
            elements: [],
          },
        ],
      },
    };

    const result = preProcessHyperlinkInstruction(mockNodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'w:hyperlink',
        type: 'element',
        attributes: { 'w:rId': 'rId123' },
        elements: [{ name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'link text' }] }] }],
      },
    ]);
    expect(mockDocx['word/_rels/document.xml.rels'].elements[0].elements).toEqual([
      {
        type: 'element',
        name: 'Relationship',
        attributes: {
          Id: 'rId123',
          Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
          Target: 'http://example.com',
          TargetMode: 'External',
        },
      },
    ]);
  });

  it('should process a hyperlink instruction with switches', () => {
    const instruction = `HYPERLINK \l "anchorName" \o "tooltip text" \t "_blank"`;
    const result = preProcessHyperlinkInstruction(mockNodesToCombine, instruction);
    expect(result).toEqual([
      {
        name: 'w:hyperlink',
        type: 'element',
        attributes: {
          'w:anchor': 'anchorName',
          'w:tooltip': 'tooltip text',
          'w:tgtFrame': '_blank',
        },
        elements: [{ name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'link text' }] }] }],
      },
    ]);
  });

  it('should handle the new window switch', () => {
    const instruction = 'HYPERLINK l "anchorName" \n';
    const result = preProcessHyperlinkInstruction(mockNodesToCombine, instruction);
    expect(result).toEqual([
      {
        name: 'w:hyperlink',
        type: 'element',
        attributes: {
          'w:anchor': 'anchorName',
          'w:tgtFrame': '_blank',
        },
        elements: [{ name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'link text' }] }] }],
      },
    ]);
  });

  it('should return an empty attributes object if instruction is empty', () => {
    const instruction = '';
    const result = preProcessHyperlinkInstruction(mockNodesToCombine, instruction);
    expect(result).toEqual([
      {
        name: 'w:hyperlink',
        type: 'element',
        attributes: {},
        elements: [{ name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: 'link text' }] }] }],
      },
    ]);
  });

  it('should handle missing relationships gracefully for URL hyperlinks', () => {
    const instruction = 'HYPERLINK "http://example.com"';
    const mockDocx = {
      'word/_rels/document.xml.rels': { elements: [] }, // Missing Relationships element
    };
    // Expect it not to crash, but to return w:anchor as before
    const result = preProcessHyperlinkInstruction(mockNodesToCombine, instruction, mockDocx);
    console.log('RESULT', JSON.stringify(result, null, 2));
    expect(result).toEqual([
      {
        name: 'w:hyperlink',
        type: 'element',
        attributes: { 'w:anchor': 'http://example.com' },
        elements: [
          {
            name: 'w:r',
            elements: [
              {
                name: 'w:t',
                elements: [{ type: 'text', text: 'link text' }],
              },
            ],
          },
        ],
      },
    ]);
  });
});
