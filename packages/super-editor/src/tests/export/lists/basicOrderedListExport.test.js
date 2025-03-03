// prettier-ignore
import {
  getTextFromNode,
  getExportedResult,
  testListNodes,
} from '../export-helpers/index';

describe('[simple-ordered-list.docx] simple ordered list tests', async () => {
  // The file for this set of test
  const fileName = 'simple-ordered-list.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(body, result.elements?.find((el) => el.name === 'w:body'));
  });


  it('can export the first list', () => {
    const titleIndex = 0;
    const firstTitle = body.elements[titleIndex];
    const titleText = getTextFromNode(firstTitle);
    expect(titleText).toBe('Simple ordered list:');

    const item1 = body.elements[titleIndex + 2];
    testListNodes({ node: item1, expectedLevel: 0, expectedNumPr: 0, text: 'Item 1' });
  
    const item2 = body.elements[titleIndex + 3];
    testListNodes({ node: item2, expectedLevel: 0, expectedNumPr: 0, text: 'Item 2' });
  
    const item3 = body.elements[titleIndex + 4];
    testListNodes({ node: item3, expectedLevel: 0, expectedNumPr: 0 });

    const nonListNode = body.elements[titleIndex + 6];
    testListNodes({ node: nonListNode, expectedLevel: undefined, expectedNumPr: undefined, text: undefined });
  });


  it('can export the second list (with sublists)', () => {
    const titleIndex = 6;
    const titleNode = body.elements[titleIndex];
    const titleText = getTextFromNode(titleNode);
    expect(titleText).toBe('Simple ordered list with sub lists:');

    const item1 = body.elements[titleIndex + 2];
    testListNodes({ node: item1, expectedLevel: 0, expectedNumPr: 0, text: 'Item 1' });

    const item3 = body.elements[titleIndex + 4];
    testListNodes({ node: item3, expectedLevel: 0, expectedNumPr: 0, text: 'Item 3' });

    const firstNestedItem = body.elements[titleIndex + 5];
    testListNodes({ node: firstNestedItem, expectedLevel: 1, expectedNumPr: 1, text: 'Lvl 1 – a' });

    const doubleNestedItem = body.elements[titleIndex + 7];
    testListNodes({ node: doubleNestedItem, expectedLevel: 2, expectedNumPr: 2, text: 'Lvl 2 – i' });

    const nestedItemAfterDoubleNested = body.elements[titleIndex + 8];
    testListNodes({ node: nestedItemAfterDoubleNested, expectedLevel: 1, expectedNumPr: 1, text: 'Lvl 1 – c' });

    const finalItem = body.elements[titleIndex + 9];
    testListNodes({ node: finalItem, expectedLevel: 0, expectedNumPr: 0, text: 'Item 4' });
  });
});
