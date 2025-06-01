import { handleParagraphNode } from '@converter/v2/importer/paragraphNodeImporter.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';

import { handleListNode } from '@converter/v2/importer/listImporter.js';
import { beforeAll } from 'vitest';

describe('paragraph tests to check spacing', () => {
  let lists = {};
  beforeEach(() => {
    lists = {};
  });

  it('correctly gets spacing [paragraph_spacing_missing]', async () => {
    const dataName = 'paragraph_spacing_missing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({
      nodes: [content[0]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
      lists,
    });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');
    expect(node.content.length).toBeGreaterThan(0);

    const { attrs } = node;
    const { spacing } = attrs;
    expect(spacing.line).toBe(1.15);
    expect(spacing.lineSpaceAfter).toBe(16);
    expect(spacing.lineSpaceBefore).toBe(16);
  });

  it('correctly gets spacing [line_space_table]', async () => {
    const dataName = 'line_space_table.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const tblNode = content[1];
    const trNode = tblNode.elements[2];
    const tcNode = trNode.elements[1];

    // Check all nodes after the known tcPr
    const { nodes } = handleParagraphNode({
      nodes: tcNode.elements.slice(1),
      docx,
      nodeListHandler: defaultNodeListHandler(),
      lists,
    });
    const node = nodes[0];

    expect(node.type).toBe('paragraph');
    expect(node.content.length).toBeGreaterThan(0);

    const { attrs } = node;
    const { spacing } = attrs;

    expect(spacing.line).toBe(1.15);
    expect(spacing.lineSpaceAfter).toBe(0);
    expect(spacing.lineSpaceBefore).toBe(0);
  });

  it('correctly gets spacing around image in p [image_p_spacing]', async () => {
    const dataName = 'image_p_spacing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({
      nodes: [content[0]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
      lists,
    });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');
    expect(node.content.length).toBeGreaterThan(0);

    const { attrs } = node;
    const { spacing } = attrs;
    expect(spacing.line).toBe(1.125);
    expect(spacing.lineSpaceAfter).toBe(16);
    expect(spacing.lineSpaceBefore).toBe(16);

    // Specifically, double check we have this important line rule to prevent image clipping
    // due to line height restriction
    expect(spacing.lineRule).toBe('auto');
  });

  it('correctly gets marks for empty paragraph', async () => {
    const dataName = 'doc_with_spacing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[1]], docx, nodeListHandler: defaultNodeListHandler() });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');

    const { attrs } = node;
    const { spacing, marksAttrs } = attrs;

    expect(spacing.lineSpaceAfter).toBe(18);
    expect(spacing.lineSpaceBefore).toBe(18);
    expect(marksAttrs.length).toBe(2);
    expect(marksAttrs[0].type).toBe('bold');
    expect(marksAttrs[1].type).toBe('textStyle');
    expect(marksAttrs[1].attrs.fontFamily).toBe('Arial');
    expect(marksAttrs[1].attrs.fontSize).toBe('16pt');
  });

  it('correctly gets spaces from paragraph Normal styles', async () => {
    const dataName = 'doc_with_spacing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[4]], docx, nodeListHandler: defaultNodeListHandler() });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');

    const { attrs } = node;
    const { spacing } = attrs;
    expect(spacing.lineSpaceAfter).toBe(11);
    expect(spacing.lineSpaceBefore).toBe(0);
  });

  it('correctly gets spacing from styles.xml by related styleId', async () => {
    const dataName = 'doc_with_spaces_from_styles.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');

    const { attrs } = node;
    const { spacing } = attrs;
    expect(spacing.lineSpaceAfter).toBe(6);
    expect(spacing.lineSpaceBefore).toBe(21);
  });

  it('correctly gets spacing with lists [list-def-mix]', async () => {
    const dataName = 'list-def-mix.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const firstListItem = content[0];
    const { nodes } = handleListNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler(), lists });
  });

  it('should return empty result for empty nodes', () => {
    const result = handleParagraphNode({
      nodes: [],
      docx: {},
      nodeListHandler: defaultNodeListHandler(),
    });
    expect(result).toEqual({ nodes: [], consumed: 0 });
  });

  it('should return empty result for non w:p node', () => {
    const result = handleParagraphNode({
      nodes: [{ name: 'w:r' }],
      docx: {},
      nodeListHandler: defaultNodeListHandler(),
    });
    expect(result).toEqual({ nodes: [], consumed: 0 });
  });

  it('correctly handles paragraph with text alignment', () => {
    const mockParagraph = {
      name: 'w:p',
      elements: [
        {
          name: 'w:pPr',
          elements: [
            {
              name: 'w:jc',
              attributes: {
                'w:val': 'center',
              },
            },
          ],
        },
      ],
    };

    const { nodes } = handleParagraphNode({
      nodes: [mockParagraph],
      docx: {},
      nodeListHandler: defaultNodeListHandler(),
    });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');
    expect(node.attrs.textAlign).toBe('center');
  });

  it('correctly handles paragraph indentation in twips', () => {
    const mockParagraph = {
      name: 'w:p',
      elements: [
        {
          name: 'w:pPr',
          elements: [
            {
              name: 'w:ind',
              attributes: {
                'w:left': '2880',
                'w:right': '1440',
                'w:firstLine': '720',
                'w:hanging': '270',
              },
            },
          ],
        },
      ],
    };

    const { nodes } = handleParagraphNode({
      nodes: [mockParagraph],
      docx: {},
      nodeListHandler: defaultNodeListHandler(),
    });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');
    // Keep raw twips values in indent object
    expect(node.attrs.indent.left).toBe(192);
    expect(node.attrs.indent.right).toBe(96);
    expect(node.attrs.indent.firstLine).toBe(48);
    expect(node.attrs.indent.hanging).toBe(18);
    // textIndent should be in inches (2880twips - 270twips(hanging))
    expect(node.attrs.textIndent).toBe('1.81in');
  });
});

describe('paragraph tests to check indentation', () => {
  it('correctly gets indents from paragraph Normal styles', async () => {
    const dataName = 'paragraph_indent_normal_styles.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');

    const { attrs } = node;
    const { indent } = attrs;

    expect(indent.firstLine).toBe(29);
  });
});

describe('paragraph with dropcaps', () => {
  it('correctly gets dropcaps data', async () => {
    const dataName = 'dropcaps.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = handleParagraphNode({ nodes: [content[1]], docx, nodeListHandler: defaultNodeListHandler() });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');

    const { attrs } = node;
    const { dropcap } = attrs;
    expect(dropcap.type).toBe('drop');
  });
});
