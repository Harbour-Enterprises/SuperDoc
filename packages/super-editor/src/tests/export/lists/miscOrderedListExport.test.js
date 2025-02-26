// prettier-ignore
import {
  getTextFromNode,
  getExportedResult,
  testListNodes,
} from '../export-helpers/index';

describe('[orderedlist_interrupted1.docx] interrupted ordered list tests', async () => {
  const fileName = 'orderedlist_interrupted1.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(body, result.elements?.find((el) => el.name === 'w:body'));
  });

  it('correctly exports first list item', () => {
    const firstList = body.elements[0];
    const firstListText = getTextFromNode(firstList);
    expect(firstListText).toBe('a');
    testListNodes({ node: firstList, expectedLevel: 0, expectedNumPr: 0 });
  });

  it('correctly exports non-list interruption text', () => {
    const interruptedTextNode = body.elements[2];
    const textNode = interruptedTextNode.elements[1].elements[0].elements[0].text;
    expect(textNode).toBe('Some title');
  });

  it('correctly exports second list', () => {
    const secondList = body.elements[4];
    const secondListText = getTextFromNode(secondList);
    expect(secondListText).toBe('c');
  });

  it('exports correct node structure for pPr', () => {
    const firstList = body.elements[0];

    // Check if pPr is correct
    const firstListPprList = firstList.elements.filter((n) => n.name === 'w:pPr');
    expect(firstListPprList.length).toBe(1);

    const firstListPpr = firstListPprList[0];
    expect(firstListPpr.elements.length).toBe(2);

    // Ensure that we only have 1 pPr tag
    const firstListNumPrList = firstListPpr.elements.filter((n) => n.name === 'w:numPr');
    expect(firstListNumPrList.length).toBe(1);

    // Ensure that the pPr tag has the correct children
    const firstListNumPr = firstListNumPrList[0];
    expect(firstListNumPr.elements.length).toBe(2);
  });
});
