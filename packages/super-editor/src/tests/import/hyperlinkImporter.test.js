import { hyperlinkNodeHandlerEntity } from '@converter/v2/importer/hyperlinkImporter.js';
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

    const { nodes } = hyperlinkNodeHandlerEntity.handler({
      nodes: [content[1].elements[2]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });
    const { marks } = nodes[0];
    expect(marks.length).toBe(3);
    expect(marks[0].type).toBe('underline');
    expect(marks[1].type).toBe('link');
    expect(marks[2].type).toBe('textStyle');
    expect(marks[2].attrs.fontFamily).toBe('Arial');
    expect(marks[2].attrs.fontSize).toBe('10pt');

    expect(marks[1].attrs.href).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );
    expect(marks[1].attrs.rId).toBe('rId4');
    expect(marks[1].attrs.history).toBe(true);

    // Capture the textStyle mark
    const textStyleMark = marks[2];
    expect(textStyleMark.type).toBe('textStyle');
    expect(textStyleMark.attrs.styleId).toBe('Hyperlink');
    expect(textStyleMark.attrs.fontFamily).toBe('Arial');
    expect(textStyleMark.attrs.fontSize).toBe('10pt');
  });

  it('parses w:hyperlink linking to bookmark', async () => {
    const dataName = 'hyperlink_node_internal.docx';
    const docx = await getTestDataByFileName(dataName);
    const documentXml = docx['word/document.xml'];

    const doc = documentXml.elements[0];
    const body = doc.elements[0];
    const content = body.elements;

    const { nodes } = hyperlinkNodeHandlerEntity.handler({
      nodes: [content[2].elements[1]],
      docx,
      nodeListHandler: defaultNodeListHandler(),
    });
    const { marks } = nodes[0];
    expect(marks.length).toBe(2);
    expect(marks[0].type).toBe('link');
    expect(marks[0].attrs.rId).toBeUndefined();
    expect(marks[0].attrs.anchor).toBe('mybookmark');
    expect(marks[0].attrs.href).toBe('#mybookmark');
    expect(marks[0].attrs.history).toBe(true);
    expect(marks[0].attrs.tooltip).toBe('Some tooltip');

    expect(marks[1].type).toBe('textStyle');
    expect(marks[1].attrs.color).toBe('#595959');
    expect(marks[1].attrs.letterSpacing).toBe('0.75pt');
    expect(marks[1].attrs.fontSize).toBe('14pt');
    expect(marks[1].attrs.styleId).toBe('SubtitleChar');
  });
});
