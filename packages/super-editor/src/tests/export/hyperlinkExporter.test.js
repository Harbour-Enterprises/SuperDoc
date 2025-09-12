import { getExportedResult } from './export-helpers/index';

describe('HyperlinkNodeExporter', async () => {
  it('exports w:hyperlink with styles', async () => {
    const fileName = 'hyperlink_node.docx';
    const result = await getExportedResult(fileName);
    const body = result.elements?.find((el) => el.name === 'w:body');
    const hyperLinkNode = body.elements[1].elements[2];
    expect(hyperLinkNode.attributes['r:id']).toBe('rId4');
    expect(hyperLinkNode.elements[0].elements[1].elements[0].text).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );

    const rPr = hyperLinkNode.elements[0].elements[0];
    expect(rPr.elements[0].name).toBe('w:u');
    expect(rPr.elements[0].attributes['w:val']).toBe('single');
    expect(rPr.elements[1].name).toBe('w:color');
    expect(rPr.elements[2].name).toBe('w:rFonts');
    expect(rPr.elements[2].attributes['w:ascii']).toBe('Arial');
    expect(rPr.elements[3].name).toBe('w:sz');
    expect(rPr.elements[3].attributes['w:val']).toBe(20);
  });

  it('exports w:hyperlink linking to bookmark', async () => {
    const fileName = 'hyperlink_node_internal.docx';
    const result = await getExportedResult(fileName);
    const body = result.elements?.find((el) => el.name === 'w:body');
    const hyperLinkNode = body.elements[2].elements[2];
    expect(hyperLinkNode.attributes['r:id']).toBeUndefined();
    expect(hyperLinkNode.attributes['w:anchor']).toBe('mybookmark');
    expect(hyperLinkNode.attributes['w:history']).toBe('1');
    expect(hyperLinkNode.attributes['w:tooltip']).toBe('Some tooltip');
    expect(hyperLinkNode.elements[0].elements[1].elements[0].text).toBe('link');

    const rPr = hyperLinkNode.elements[0].elements[0];
    expect(rPr.elements[0].name).toBe('w:color');
    expect(rPr.elements[0].attributes['w:val']).toBe('595959');
    expect(rPr.elements[1].name).toBe('w:spacing');
    expect(rPr.elements[2].name).toBe('w:sz');
    expect(rPr.elements[2].attributes['w:val']).toBe(28);
    expect(rPr.elements[3].name).toBe('w:rStyle');
    expect(rPr.elements[3].attributes['w:val']).toBe('SubtitleChar');
  });
});
