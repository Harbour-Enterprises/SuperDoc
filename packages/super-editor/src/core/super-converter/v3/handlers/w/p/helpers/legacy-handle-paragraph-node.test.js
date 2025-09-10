// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies used by the helper
vi.mock('@core/utilities/carbonCopy.js', () => ({
  carbonCopy: (obj) => JSON.parse(JSON.stringify(obj)),
}));

// Mock parseMarks/mergeTextNodes as vi.fn so tests can reconfigure
vi.mock('@converter/v2/importer/index.js', () => ({
  parseMarks: vi.fn(() => []),
  mergeTextNodes: vi.fn((content) => content),
}));

// Simple and predictable conversion for positions
vi.mock('@converter/helpers.js', () => ({
  twipsToPixels: (twips) => (twips === undefined ? undefined : Number(twips) / 20),
}));

// Helpers from the same folder, mocked and controlled per-test
vi.mock('./index.js', () => ({
  getParagraphIndent: vi.fn(() => ({})),
  getParagraphSpacing: vi.fn(() => undefined),
  getDefaultParagraphStyle: vi.fn(() => ({})),
  preProcessNodesForFldChar: vi.fn((els) => els),
  parseParagraphBorders: vi.fn(() => ({})),
}));

import { handleParagraphNode } from './legacy-handle-paragraph-node.js';
import { parseMarks, mergeTextNodes } from '@converter/v2/importer/index.js';
import {
  getParagraphIndent,
  getParagraphSpacing,
  getDefaultParagraphStyle,
  preProcessNodesForFldChar,
  parseParagraphBorders,
} from './index.js';

const makeParams = (overrides = {}) => ({
  filename: 'source.docx',
  docx: {},
  nodes: [
    {
      name: 'w:p',
      attributes: { 'w:rsidRDefault': 'ABCDEF' },
      elements: [],
    },
  ],
  nodeListHandler: {
    handlerEntities: [
      {
        handlerName: 'standardNodeHandler',
        handler: vi.fn((p) => ({
          nodes: [
            {
              type: 'paragraph',
              attrs: {},
              content: p._mockContent || [],
            },
          ],
        })),
      },
    ],
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  parseMarks.mockReset().mockImplementation(() => []);
  mergeTextNodes.mockReset().mockImplementation((c) => c);
  getParagraphIndent.mockReset().mockReturnValue({});
  getParagraphSpacing.mockReset().mockReturnValue(undefined);
  getDefaultParagraphStyle.mockReset().mockReturnValue({});
  preProcessNodesForFldChar.mockReset().mockImplementation((els) => els);
  parseParagraphBorders.mockReset().mockReturnValue({});
});

describe('legacy-handle-paragraph-node', () => {
  it('handles basic paragraph attributes and marks removal when empty content', () => {
    // Arrange pPr with jc, rPr marks, and style
    parseMarks.mockReturnValue([{ type: 'bold' }, { type: 'highlight' }]);
    getParagraphSpacing.mockReturnValue('spc');
    const params = makeParams();
    params.nodes[0].elements = [
      {
        name: 'w:pPr',
        elements: [
          { name: 'w:jc', attributes: { 'w:val': 'right' } },
          { name: 'w:rPr' },
          { name: 'w:pStyle', attributes: { 'w:val': 'BodyText' } },
        ],
      },
    ];

    // Act
    const out = handleParagraphNode(params);

    // Assert
    expect(preProcessNodesForFldChar).toHaveBeenCalled();
    expect(out.type).toBe('paragraph');
    expect(out.attrs.filename).toBe('source.docx');
    expect(out.attrs.textAlign).toBe('right');
    // styleId is taken from w:pStyle
    expect(out.attrs.styleId).toBe('BodyText');
    // spacing and rsid default
    expect(getParagraphSpacing).toHaveBeenCalled();
    expect(out.attrs.spacing).toBe('spc');
    expect(out.attrs.rsidRDefault).toBe('ABCDEF');
    // marks: highlight removed due to empty content
    expect(parseMarks).toHaveBeenCalled();
    expect(out.attrs.marksAttrs).toEqual([{ type: 'bold' }]);
  });

  it('adds indent, borders, default justify, keep flags, dropcap and sectPr', () => {
    getParagraphIndent.mockReturnValue({
      left: 10,
      right: 5,
      firstLine: 2,
      hanging: 0,
      textIndent: 1.25,
    });
    parseParagraphBorders.mockReturnValue({ top: { sz: 4 } });
    getDefaultParagraphStyle.mockReturnValue({ justify: { 'w:val': 'center' } });

    const params = makeParams();
    params.nodes[0].elements = [
      {
        name: 'w:pPr',
        elements: [
          { name: 'w:pBdr' },
          { name: 'w:keepLines', attributes: { 'w:val': '1' } },
          { name: 'w:keepNext', attributes: { 'w:val': 'true' } },
          {
            name: 'w:framePr',
            attributes: {
              'w:dropCap': 'drop',
              'w:lines': '3',
              'w:wrap': 'around',
              'w:hAnchor': 'margin',
              'w:vAnchor': 'text',
            },
          },
          { name: 'w:sectPr' },
        ],
      },
    ];

    const out = handleParagraphNode(params);

    expect(getParagraphIndent).toHaveBeenCalled();
    expect(out.attrs.indent).toMatchObject({ left: 10, right: 5, firstLine: 2, hanging: 0 });
    expect(out.attrs.textIndent).toBe('1.25in');
    expect(out.attrs.borders).toEqual({ top: { sz: 4 } });
    expect(out.attrs.keepLines).toBe('1');
    expect(out.attrs.keepNext).toBe('true');
    expect(out.attrs.justify).toEqual({ val: 'center' });
    expect(out.attrs.dropcap).toEqual({ type: 'drop', lines: '3', wrap: 'around', hAnchor: 'margin', vAnchor: 'text' });
    expect(out.attrs.paragraphProperties).toBeDefined();
    expect(out.attrs.pageBreakSource).toBe('sectPr');
  });

  it('parses tab stops and merges text nodes when content exists', () => {
    mergeTextNodes.mockImplementation(() => [{ type: 'text', text: 'merged' }]);

    const params = makeParams({
      _mockContent: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    });
    params.nodes[0].elements = [
      {
        name: 'w:pPr',
        elements: [
          {
            name: 'w:tabs',
            elements: [
              { name: 'w:tab', attributes: { 'w:val': 'left', 'w:pos': '200', 'w:leader': 'dot' } },
              { name: 'w:tab', attributes: { 'w:val': 'right', 'w:pos': '400' } },
              { name: 'w:tab', attributes: { 'w:val': 'center' } },
            ],
          },
        ],
      },
    ];

    const out = handleParagraphNode(params);

    expect(mergeTextNodes).toHaveBeenCalled();
    expect(out.content).toEqual([{ type: 'text', text: 'merged' }]);
    expect(out.attrs.tabStops).toEqual([
      { val: 'start', pos: 10, originalPos: '200', leader: 'dot' },
      { val: 'end', pos: 20, originalPos: '400' },
      { val: 'center', pos: undefined },
    ]);
  });
});
