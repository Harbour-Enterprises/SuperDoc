import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';


describe('[sublist-issue.docx] Imports sublist with numId issue', () => {
  const filename = 'sublist-issue.docx';
  let docx, media, mediaFiles, fonts, editor, dispatch;

  beforeAll(async () => {
    ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename));
    ({ editor, dispatch } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
  });

  it('correctly imports numId in sublist that does not match outer list', () => {
    const currentState = editor.getJSON();
    const list = currentState.content[2];
    const secondItem = list.content[1];
    const numId = secondItem.attrs.numId;
    expect(numId).toBe("5");

    // Ensure we're importing the empty paragraprh
    const emptyParagraph = secondItem.content[1];
    expect(emptyParagraph.type).toBe('paragraph');
    expect(emptyParagraph.content).toBeUndefined();

    const sublistItem = secondItem.content[2].content[0];
    const sublistNumId = sublistItem.attrs.numId;
    expect(sublistNumId).toBe("3");
  });
});