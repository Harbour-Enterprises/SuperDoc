import { getExportedResult } from './export-helpers/index';

const getHyperlinkNodeFromParagraph = (paragraph) => {
  const directHyperlink = paragraph.elements.find((el) => el.name === 'w:hyperlink');
  if (directHyperlink) return directHyperlink;

  const hyperlinkRun = paragraph.elements.find(
    (el) => el.name === 'w:r' && el.elements?.some((child) => child.name === 'w:hyperlink'),
  );
  expect(hyperlinkRun, 'Expected to find a run with a hyperlink').toBeTruthy();

  const hyperlinkNode = hyperlinkRun.elements.find((el) => el.name === 'w:hyperlink');
  expect(hyperlinkNode, 'Expected the run to contain a w:hyperlink element').toBeTruthy();

  return hyperlinkNode;
};

describe('HyperlinkNodeExporter', async () => {
  it('exports w:hyperlink with styles', async () => {
    const fileName = 'hyperlink_node.docx';
    const result = await getExportedResult(fileName);
    const body = result.elements?.find((el) => el.name === 'w:body');
    const paragraph = body.elements[1];
    const hyperLinkNode = getHyperlinkNodeFromParagraph(paragraph);
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
    const paragraph = body.elements[2];
    const hyperLinkNode = getHyperlinkNodeFromParagraph(paragraph);
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

  it('exports hyperlink marks spanning multiple runs as single hyperlink element while preserving formatting', async () => {
    const fileName = 'hyperlink_multiple_runs.docx';
    const result = await getExportedResult(fileName);
    const body = result.elements?.find((el) => el.name === 'w:body');
    const paragraph = body.elements[0];

    const hyperlinkNodes = paragraph.elements.filter((el) => el.name === 'w:hyperlink');
    expect(hyperlinkNodes).toHaveLength(1);

    const hyperlink = hyperlinkNodes[0];
    expect(hyperlink.attributes['r:id']).toBe('rId9');

    const allRuns = hyperlink.elements.filter((el) => el.name === 'w:r');
    expect(allRuns).toHaveLength(3);

    const texts = allRuns.map((node) => node.elements.find((el) => el.name === 'w:t')?.elements[0]?.text);
    expect(texts).toEqual(['Click', 'here', 'now']);

    const boldRunProps = allRuns[1]?.elements?.[0];
    expect(boldRunProps?.elements?.some((el) => el.name === 'w:b')).toBe(true);

    const italicRunProps = allRuns[2]?.elements?.[0];
    expect(italicRunProps?.elements?.some((el) => el.name === 'w:i')).toBe(true);
  });
});
