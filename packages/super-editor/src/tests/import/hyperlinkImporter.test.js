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
    const runNode = nodes.find((node) => node.type === 'run') || nodes[0];
    const textNode = runNode.content?.find((child) => child.type === 'text');
    expect(textNode).toBeDefined();

    const marks = textNode?.marks || [];
    expect(marks.length).toBe(3);

    const underlineMark = marks.find((mark) => mark.type === 'underline');
    expect(underlineMark).toBeDefined();

    const linkMark = marks.find((mark) => mark.type === 'link');
    expect(linkMark).toBeDefined();

    const textStyleMark = marks.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark).toBeDefined();
    expect(textStyleMark.attrs.fontFamily).toBe('Arial, sans-serif');
    expect(textStyleMark.attrs.fontSize).toBe('10pt');

    expect(linkMark.attrs.href).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );
    expect(linkMark.attrs.rId).toBe('rId4');
    expect(linkMark.attrs.history).toBe(true);

    // Capture the textStyle mark
    expect(textStyleMark.attrs.styleId).toBe('Hyperlink');
    expect(textStyleMark.attrs.fontFamily).toBe('Arial, sans-serif');
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
    const runNode = nodes.find((node) => node.type === 'run') || nodes[0];
    const textNode = runNode.content?.find((child) => child.type === 'text');
    expect(textNode).toBeDefined();

    const marks = textNode?.marks || [];
    expect(marks.length).toBe(2);

    const linkMark = marks.find((mark) => mark.type === 'link');
    expect(linkMark).toBeDefined();
    expect(linkMark.attrs.rId).toBeUndefined();
    expect(linkMark.attrs.anchor).toBe('mybookmark');
    expect(linkMark.attrs.href).toBe('#mybookmark');
    expect(linkMark.attrs.history).toBe(true);
    expect(linkMark.attrs.tooltip).toBe('Some tooltip');

    const textStyleMark = marks.find((mark) => mark.type === 'textStyle');
    expect(textStyleMark).toBeDefined();
    expect(textStyleMark.attrs.color).toBe('#595959');
    expect(textStyleMark.attrs.letterSpacing).toBe('0.75pt');
    expect(textStyleMark.attrs.fontSize).toBe('14pt');
    expect(textStyleMark.attrs.styleId).toBe('SubtitleChar');
  });
});
