// prettier-ignore
import { expect } from 'vitest';
import {
  getExportedResult,
} from '../export-helpers/index';

describe('[listWithSpacerNodes.docx] list with spacer nodes', async () => {
  const fileName = 'listWithSpacerNodes.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(body, result.elements?.find((el) => el.name === 'w:body'));
  });

  it('export spacer props correctly', () => {
    const spacer = body.elements[1];
    expect(spacer.elements.length).toEqual(1);
    expect(spacer.elements[0].name).toEqual('w:pPr');
    expect(spacer.elements[0].elements[0].name).toEqual('w:spacing');
    expect(spacer.elements[0].elements[0].attributes['w:before']).toEqual(0);
    expect(spacer.elements[0].elements[0].attributes['w:after']).toEqual(0);
    expect(spacer.elements[0].elements[0].attributes['w:line']).toEqual(276);
    expect(spacer.elements[0].elements[0].attributes['w:lineRule']).toEqual('auto');
  });
});

describe('[list-with-table-break.docx] list with a table in between sub list nodes', async () => {
  const fileName = 'list-with-table-break.docx';
  const result = await getExportedResult(fileName);
  const body = {};

  beforeEach(() => {
    Object.assign(body, result.elements?.find((el) => el.name === 'w:body'));
  });

  it('export spacer props correctly', () => {
    const content = body.elements;

    const firstListItem = content[0];
    const firstItemRun = firstListItem.elements.find((el) => el.name === 'w:r');
    const firstItemText = firstItemRun.elements.find((el) => el.name === 'w:t');
    expect(firstItemText.elements[0].text).toEqual('ONE');

    // First sub list item
    // (this sub list is the one that has a table break between this node and the next)
    const subListItem1 = content[1];
    const subListItem1Run = subListItem1.elements.find((el) => el.name === 'w:r');
    const subItem1Text = subListItem1Run.elements.find((el) => el.name === 'w:t');
    expect(subItem1Text.elements[0].text).toEqual('A');

    // Get this sub list's list props and check numPr and ilvl
    // We would expect the continuation of this list after the table to be at the same level and numPr
    const subListItem1PPr = subListItem1.elements.find((el) => el.name === 'w:pPr');
    const subListItem1NumPr = subListItem1PPr.elements.find((el) => el.name === 'w:numPr');
    const subListItem1ilvl = subListItem1NumPr.elements.find((el) => el.name === 'w:ilvl');
    expect(subListItem1ilvl.attributes['w:val']).toEqual(1);
    const subListItem1NumId = subListItem1NumPr.elements.find((el) => el.name === 'w:numId');
    expect(subListItem1NumId.attributes['w:val']).toEqual("1");

    // Expect to see a blank paragraph between the list (and sub list) and the table
    const blankSpace = content[2];
    expect(blankSpace.elements.length).toEqual(1);
    expect(blankSpace.elements[0].name).toEqual('w:pPr');

    // Expect the table to follow
    const table = content[3];
    expect(table.name).toEqual('w:tbl');

    // Skip content[4] - another blank line

    // The next sub list item should be content[5]
    const subListItem2 = content[5];
    const subListItem2Run = subListItem2.elements.find((el) => el.name === 'w:r');
    const subListItem2Text = subListItem2Run.elements.find((el) => el.name === 'w:t');
    expect(subListItem2Text.elements[0].text).toEqual('d');

    const subListItem2PPr = subListItem2.elements.find((el) => el.name === 'w:pPr');
    const subListItem2NumPr = subListItem2PPr.elements.find((el) => el.name === 'w:numPr');

    const subListItem2ilvl = subListItem2NumPr.elements.find((el) => el.name === 'w:ilvl');
    expect(subListItem2ilvl.attributes['w:val']).toEqual(1);
    const subListItem2NumId = subListItem2NumPr.elements.find((el) => el.name === 'w:numId');
    expect(subListItem2NumId.attributes['w:val']).toEqual("1");

    // Skip item 6 - another blank line

    // The next main list item (not sub list) should be content[7]
    const mainListItem2 = content[7];
    const mainListItem2Run = mainListItem2.elements.find((el) => el.name === 'w:r');
    const mainListItem2Text = mainListItem2Run.elements.find((el) => el.name === 'w:t');
    expect(mainListItem2Text.elements[0].text).toEqual('TWO');

  });
});
