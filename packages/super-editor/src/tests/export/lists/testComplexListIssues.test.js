// prettier-ignore
import { beforeAll, expect } from 'vitest';
import { loadTestDataForEditorTests, initTestEditor, getNewTransaction } from '@tests/helpers/helpers.js';

describe('[complex-list-def-issue.docx] import, export', () => {
  const filename = 'complex-list-def-issue.docx';
  let docx, media, mediaFiles, fonts, editor, dispatch;
  let currentState;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
    ({ editor, dispatch } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    currentState = editor.getJSON();
  });

  it('imports the list correctly', () => {
    expect(currentState.content[0].type).toBe('orderedList');
    expect(currentState.content[0].content.length).toBe(4);
  });

  it('first list item imports correctly', () => {
    const listItem = currentState.content[0].content[0];
    
    expect(listItem.type).toBe('listItem');
    expect(listItem.content.length).toBe(2);
    
    const sublist = listItem.content.find((el) => el.type === 'orderedList');
    expect(sublist).toBeDefined();
    expect(sublist.content.length).toBe(4); // 4 sub items

    const subItem1 = sublist.content[0];
    expect(subItem1.attrs.listLevel).toStrictEqual([1, 1]);

    const subItem4 = sublist.content[3];
    expect(subItem4.attrs.listLevel).toStrictEqual([1, 4]);
  });

  it('second list item imports correctly', () => {
    const listItem = currentState.content[0].content[1];
    
    expect(listItem.type).toBe('listItem');
    expect(listItem.content.length).toBe(3);
    
    const sublist = listItem.content.find((el) => el.type === 'orderedList');

    expect(sublist).toBeDefined();
    expect(sublist.content.length).toBe(2); // 2 sub items

    const subItem1 = sublist.content[0];
    expect(subItem1.type).toBe('listItem');
    expect(subItem1.attrs.numId).toBe("5");
    expect(subItem1.attrs.listLevel).toStrictEqual([2, 1]);
    
    const subItem2 = sublist.content[1];
    expect(subItem2.attrs.listLevel).toStrictEqual([2, 2]);
  });

  it('third list item with node break imports correctly', () => {
    const listItem = currentState.content[0].content[2];
    expect(listItem.type).toBe('listItem');
    expect(listItem.content.length).toBe(3);
    
    const sublist = listItem.content.find((el) => el.type === 'orderedList');
    expect(sublist).toBeDefined();
    expect(sublist.content.length).toBe(4);

    const subItem1 = sublist.content[0];
    expect(subItem1.attrs.listLevel).toStrictEqual([3, 1]);
    expect(subItem1.content.length).toBe(2);

    // The node break
    const subItem2 = sublist.content[1];
    expect(subItem2.type).toBe('paragraph');
    expect(subItem2.content.length).toBe(2);

    // Ensure the nodes after the break have the correct listLevel index
    const subItem3 = sublist.content[2];
    expect(subItem3.type).toBe('listItem');
    expect(subItem3.attrs.numId).toBe("5");
    expect(subItem3.attrs.listLevel).toStrictEqual([3, 2]);

    const subItem4 = sublist.content[3];
    expect(subItem4.type).toBe('listItem');
    expect(subItem4.attrs.numId).toBe("5");
    expect(subItem4.attrs.listLevel).toStrictEqual([3, 3]);
  });

  it('root list continues correctly after third item with break', () => {
    // Make sure the 'FOUR' list item continues correctly here
    const listItem = currentState.content[0].content[3];
    expect(listItem.type).toBe('listItem');
    expect(listItem.attrs.listLevel).toStrictEqual([4]);

    const contents = listItem.content[0];
    expect(contents.type).toBe('paragraph');
    expect(contents.content.length).toBe(1);

    const textNode = contents.content[0];
    expect(textNode.type).toBe('text');
    expect(textNode.text).toBe('FOUR');
  });

});
