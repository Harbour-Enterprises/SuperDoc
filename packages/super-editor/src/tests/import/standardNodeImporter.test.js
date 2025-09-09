import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleStandardNode } from '@converter/v2/importer/standardNodeImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';

describe('StandardNodeImporter', () => {
  it('parses basic standard node', async () => {
    const dataName = 'paragraph_spacing_missing.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleStandardNode({ nodes: [content[0]], docx, nodeListHandler: defaultNodeListHandler() });
    expect(nodes.length).toBe(1);
    const textNode = nodes[0].content.find((n) => n.type === 'text');
    expect(textNode?.type).toBe('text');
    expect(textNode?.text).toBe('First paragraph');

    const { marks } = textNode;
    expect(marks[0].type).toBe('textStyle');
    expect(marks[0].attrs).toHaveProperty('fontFamily', 'Arial');
    expect(marks[0].attrs).toHaveProperty('lineHeight', '1.15');
  });
});
