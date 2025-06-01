import { handleHyperlinkNode } from '@converter/v2/importer/hyperlinkImporter.js';
import { getTestDataByFileName } from '@tests/helpers/helpers.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';

describe('HyperlinkNodeImporter', () => {
  it('parses w:hyperlink with styles', async () => {
    const dataName = 'hyperlink_node.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;
    const { nodes } = handleHyperlinkNode({
      nodes: [content[1].elements[1]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });

    const { marks } = nodes[0];
    expect(marks.length).toBe(3);
    expect(marks[0].type).toBe('underline');
    expect(marks[1].type).toBe('link');
    expect(marks[2].type).toBe('textStyle');

    expect(marks[1].attrs.href).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );
    expect(marks[1].attrs.rId).toBe('rId4');
  });
});
