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
    expect(nodes[0].content[0].type).toBe('text');
    expect(nodes[0].content[0].text).toBe('First paragraph');

    const { marks } = nodes[0].content[0];
    const textStyle = marks.find((m) => m.type === 'textStyle');
    expect(textStyle).toBeDefined();
    expect(textStyle.attrs).toHaveProperty('fontFamily', 'Arial');
    expect(textStyle.attrs).toHaveProperty('lineHeight', '1.15');
  });
});
