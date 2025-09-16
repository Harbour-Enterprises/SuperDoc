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
    // Expect run, underline, link, textStyle in that order
    expect(marks.length).toBeGreaterThanOrEqual(4);
    expect(marks[0].type).toBe('run');
    expect(marks[1].type).toBe('underline');
    expect(marks[2].type).toBe('link');
    // Find textStyle mark (may be at index 3)
    const textStyleMark = marks.find((m) => m.type === 'textStyle');
    expect(textStyleMark).toBeTruthy();
    expect(textStyleMark.attrs.fontFamily).toBe('Arial');
    expect(textStyleMark.attrs.fontSize).toBe('10pt');

    const linkMark = marks.find((m) => m.type === 'link');
    expect(linkMark).toBeTruthy();
    expect(linkMark.attrs.href).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );
    expect(linkMark.attrs.rId).toBe('rId4');
    expect(marks[1].attrs.history).toBe(true);

    // textStyle mark should carry the Hyperlink style id
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
