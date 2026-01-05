import { describe, it, expect, vi } from 'vitest';
import { handleVRectImport } from './handle-v-rect-import';
import { parseInlineStyles } from './parse-inline-styles';
import { twipsToPixels, twipsToLines } from '@converter/helpers';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';

vi.mock('./parse-inline-styles');
vi.mock('@converter/helpers');

describe('handleVRectImport', () => {
  const createPict = (rectAttributes = {}) => ({
    elements: [
      {
        name: 'v:rect',
        attributes: rectAttributes,
      },
    ],
  });

  const createPNode = (spacingAttrs = {}, indentAttrs = {}) => ({
    attributes: { 'w:rsidRDefault': '00000000' },
    elements: [
      {
        name: 'w:pPr',
        elements: [
          {
            name: 'w:spacing',
            attributes: spacingAttrs,
          },
          {
            name: 'w:ind',
            attributes: indentAttrs,
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    parseInlineStyles.mockReturnValue({});
    twipsToPixels.mockImplementation((val) => parseInt(val) / 20);
    twipsToLines.mockImplementation((val) => parseInt(val) / 240);
  });

  it('should create contentBlock with basic rect attributes', () => {
    const pict = createPict({
      id: '_x0000_i1025',
      fillcolor: '#4472C4',
    });

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict,
    };

    const result = handleVRectImport(options);

    expect(result.type).toBe('paragraph');
    expect(result.content[0].type).toBe('contentBlock');
    expect(result.content[0].attrs.attributes).toEqual({
      id: '_x0000_i1025',
      fillcolor: '#4472C4',
    });
    expect(result.content[0].attrs.background).toBe('#4472C4');
  });

  it('should parse style and extract dimensions', () => {
    parseInlineStyles.mockReturnValue({
      width: '100pt',
      height: '1.5pt',
    });

    const pict = createPict({
      style: 'width:100pt;height:1.5pt',
    });

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict,
    };

    const result = handleVRectImport(options);

    expect(parseInlineStyles).toHaveBeenCalledWith('width:100pt;height:1.5pt');
    expect(result.content[0].attrs.size).toEqual({
      width: 133, // 100 * 1.33
      height: 2, // 1.5 * 1.33 rounded up
    });
    expect(result.content[0].attrs.style).toBe('width: 100pt;height: 1.5pt;');
  });

  it('should set width to 100% for full-page horizontal rules', () => {
    parseInlineStyles.mockReturnValue({
      width: '',
      height: '1.5pt',
    });

    const pict = createPict({
      'o:hr': 't',
      style: 'width:;height:1.5pt',
    });

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict,
    };

    const result = handleVRectImport(options);

    expect(result.content[0].attrs.size.width).toBe('100%');
  });

  it('should extract VML attributes', () => {
    const pict = createPict({
      'o:hralign': 'center',
      'o:hrstd': 't',
      'o:hr': 't',
      stroked: 'f',
    });

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict,
    };

    const result = handleVRectImport(options);

    expect(result.content[0].attrs.vmlAttributes).toEqual({
      hralign: 'center',
      hrstd: 't',
      hr: 't',
      stroked: 'f',
    });
  });

  it('should mark as horizontal rule when o:hr or o:hrstd is true', () => {
    const pict1 = createPict({ 'o:hr': 't' });
    const pict2 = createPict({ 'o:hrstd': 't' });

    const result1 = handleVRectImport({
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict: pict1,
    });
    const result2 = handleVRectImport({
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode: { elements: [] },
      pict: pict2,
    });

    expect(result1.content[0].attrs.horizontalRule).toBe(true);
    expect(result2.content[0].attrs.horizontalRule).toBe(true);
  });

  it('should parse spacing from pNode', () => {
    const pNode = createPNode({
      'w:after': '200',
      'w:before': '100',
      'w:line': '240',
      'w:lineRule': 'auto',
    });

    twipsToPixels.mockImplementation((val) => parseInt(val) / 20);
    twipsToLines.mockImplementation((val) => parseInt(val) / 240);

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode,
      pict: createPict({}),
    };

    const result = handleVRectImport(options);

    expect(result.attrs.paragraphProperties.spacing).toEqual({
      after: 200,
      before: 100,
      line: 240,
      lineRule: 'auto',
    });
  });

  it('should parse indent from pNode', () => {
    const pNode = createPNode(
      {},
      {
        'w:left': '400',
        'w:right': '200',
      },
    );

    const options = {
      params: {
        docx: {},
        nodeListHandler: defaultNodeListHandler(),
      },
      pNode,
      pict: createPict({}),
    };

    const result = handleVRectImport(options);

    expect(result.attrs.paragraphProperties.indent).toEqual({
      left: 400,
      right: 200,
    });
  });
});
