
import { handleParagraphNode } from '@converter/v2/importer/paragraphNodeImporter.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';

import { handleListNode } from '@converter/v2/importer/listImporter.js';

describe('paragraph tests to check spacing', () => {
  it('correctly gets spacing [paragraph_spacing_missing]', async () => {
    const dataName = 'paragraph_spacing_missing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

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
    const { nodes } = handleParagraphNode({ nodes: tcNode.elements.slice(1), docx, nodeListHandler: defaultNodeListHandler() });
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

    const { nodes } = handleParagraphNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });

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

  it('correctly gets spacing with lists [list-def-mix]', async () => {
    const dataName = 'list-def-mix.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const firstListItem = content[0];
    const { nodes } = handleListNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });
  });

  it('should return empty result for empty nodes', () => {
    const result = handleParagraphNode({
      nodes: [],
      docx: {},
      nodeListHandler: defaultNodeListHandler()
    });
    expect(result).toEqual({ nodes: [], consumed: 0 });
  });

  it('should return empty result for non w:p node', () => {
    const result = handleParagraphNode({
      nodes: [{ name: 'w:r' }], 
      docx: {},
      nodeListHandler: defaultNodeListHandler()
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
                'w:val': 'center'
              }
            }
          ]
        }
      ]
    };

    const { nodes } = handleParagraphNode({
      nodes: [mockParagraph],
      docx: {},
      nodeListHandler: defaultNodeListHandler()
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
                'w:firstLine': '720'
              }
            }
          ]
        }
      ]
    };

    const { nodes } = handleParagraphNode({
      nodes: [mockParagraph],
      docx: {},
      nodeListHandler: defaultNodeListHandler()
    });

    const node = nodes[0];
    expect(node.type).toBe('paragraph');
    // Keep raw twips values in indent object
    expect(node.attrs.indent.left).toBe(192);
    expect(node.attrs.indent.right).toBe(96);
    expect(node.attrs.indent.firstLine).toBe(48);
    // textIndent should be in inches (2880 twips = 2 inches)
    expect(node.attrs.textIndent).toBe('2in');
  });
});
