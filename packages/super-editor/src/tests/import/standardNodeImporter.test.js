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

    const paragraphNode = nodes[0];
    expect(paragraphNode.attrs).toHaveProperty('lineHeight', '1.15');

    const paragraphRun = paragraphNode.content[0];
    expect(paragraphRun.type).toBe('run');

    const paragraphText = paragraphRun.content[0];
    expect(paragraphText.type).toBe('text');
    expect(paragraphText.text).toBe('First paragraph');

    const textStyleMark = paragraphText.marks.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark).toBeDefined();
    expect(textStyleMark.attrs).toHaveProperty('fontFamily', 'Arial, sans-serif');
  });
});
