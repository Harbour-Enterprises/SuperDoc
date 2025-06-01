import { getExportedResult } from './export-helpers/index';

describe('HyperlinkNodeExporter', async () => {
  const fileName = 'hyperlink_node.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(
      body,
      result.elements?.find((el) => el.name === 'w:body'),
    );
  });

  it('parses w:hyperlink with styles', () => {
    const hyperLinkNode = body.elements[1].elements[2];
    expect(hyperLinkNode.attributes['r:id']).toBe('rId4');
    expect(hyperLinkNode.elements[0].elements[1].elements[0].text).toBe(
      'https://stackoverflow.com/questions/66669593/how-to-attach-image-at-first-page-in-docx-file-nodejs',
    );
  });
});
