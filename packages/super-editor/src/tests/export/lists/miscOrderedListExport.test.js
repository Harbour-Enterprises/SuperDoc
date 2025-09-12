// prettier-ignore
import { expect } from 'vitest';
import { getTextFromNode, getExportedResult, testListNodes } from '../export-helpers/index';

describe('[orderedlist_interrupted1.docx] interrupted ordered list tests', async () => {
  const fileName = 'orderedlist_interrupted1.docx';
  let data;
  let body;

  beforeAll(async () => {
    data = await getExportedResult(fileName);
    body = data.elements?.find((el) => el.name === 'w:body');
  });

  const isParagraph = (n) => n?.name === 'w:p';
  const hasNumPr = (p) => {
    const pPr = p?.elements?.find((el) => el.name === 'w:pPr');
    return !!pPr?.elements?.some((el) => el.name === 'w:numPr');
  };
  const paragraphs = () => (body.elements || []).filter(isParagraph);

  it('correctly exports first list item', () => {
    const firstList = paragraphs().find((p) => hasNumPr(p));
    const firstListText = getTextFromNode(firstList);
    expect(firstListText).toBe('a');
    testListNodes({ node: firstList, expectedLevel: 0, expectedNumPr: 0 });
  });

  it('correctly exports non-list interruption text', () => {
    const nonList = paragraphs().find((p) => !hasNumPr(p) && getTextFromNode(p) === 'Some title');
    expect(getTextFromNode(nonList)).toBe('Some title');
  });

  it('correctly exports second list', () => {
    // Find the list paragraph with text 'c'
    const secondList = paragraphs().find((p) => hasNumPr(p) && getTextFromNode(p) === 'c');
    expect(getTextFromNode(secondList)).toBe('c');
  });

  it('exports correct node structure for pPr', () => {
    const firstList = paragraphs().find((p) => hasNumPr(p));

    // Check if pPr is correct
    const firstListPprList = firstList.elements.filter((n) => n.name === 'w:pPr');
    expect(firstListPprList.length).toBe(1);

    const firstListPpr = firstListPprList[0];
    expect(firstListPpr.elements.length).toBeGreaterThanOrEqual(2);

    // Ensure that we only have 1 numPr tag inside pPr
    const firstListNumPrList = firstListPpr.elements.filter((n) => n.name === 'w:numPr');
    expect(firstListNumPrList.length).toBe(1);

    // Ensure that the numPr tag has at least ilvl and numId children
    const firstListNumPr = firstListNumPrList[0];
    const childNames = (firstListNumPr.elements || []).map((el) => el.name);
    expect(childNames).toContain('w:ilvl');
    expect(childNames).toContain('w:numId');
  });
});

describe('[custom_list1.docx] interrupted ordered list tests', async () => {
  const fileName = 'custom-list1.docx';
  let data;
  let body;

  beforeAll(async () => {
    data = await getExportedResult(fileName);
    body = data.elements?.find((el) => el.name === 'w:body');
  });

  it('exports custom list definition correctly', () => {
    const paras = (body.elements || []).filter((n) => n.name === 'w:p');
    const firstList = paras.find((p) =>
      p.elements?.some((el) => el.name === 'w:pPr' && el.elements?.some((e) => e.name === 'w:numPr')),
    );
    const firstListPprList = firstList.elements.filter((n) => n.name === 'w:pPr' && n.elements?.length);
    const firstListPpr = firstListPprList[0];
    expect(firstListPpr.elements.length).toBeGreaterThanOrEqual(5);

    const numPr = firstListPpr.elements.find((n) => n.name === 'w:numPr');
    const numIdTag = numPr.elements.find((n) => n.name === 'w:numId');
    const numId = numIdTag.attributes['w:val'];
    expect(numId).toBe('4');

    // Verify specific paragraph texts regardless of positions
    const secondPara = paras.find((p) => getTextFromNode(p) === 'Num 1.1');
    expect(getTextFromNode(secondPara)).toBe('Num 1.1');

    const fourthPara = paras.find((p) => getTextFromNode(p) === 'Num 1.2.1');
    expect(getTextFromNode(fourthPara)).toBe('Num 1.2.1');
  });
});
