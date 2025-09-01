import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import { TextSelection } from 'prosemirror-state';
import { expect } from 'vitest';
import { getDocumentRelationshipElements } from '@core/super-converter/docx-helpers/document-rels.js';
import { uploadImageIntoSelection } from '@extensions/image/imageHelpers/startImageUpload.js';
import { imageBase64 } from './data/imageBase64.js';

describe('Relationships tests', () => {
  window.URL.createObjectURL = vi.fn().mockImplementation((file) => {
    return file.name;
  });

  const filename = 'blank-doc.docx';
  let docx, media, mediaFiles, fonts, editor;

  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  it('tests that the inserted link has a rId and a relationship', () => {
    editor.commands.insertContentAt(0, 'link');

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 0, 5)));
    editor.commands.setLink({ href: 'https://www.superdoc.dev' });

    const linkMark = editor.state.doc.firstChild.firstChild.marks[0];

    expect(linkMark.type.name).toBe('link');
    expect(linkMark.attrs.rId).toBeTruthy();

    const relationships = getDocumentRelationshipElements(editor);
    const found = relationships.find((i) => i.attributes.Id === linkMark.attrs.rId);

    expect(found).toBeTruthy();
    expect(found.attributes.Target).toBe('https://www.superdoc.dev');
  });

  it('tests that the uploaded image has a rId and a relationship', async () => {
    const blob = await fetch(imageBase64).then((res) => res.blob());
    const file = new File([blob], 'image.png', { type: 'image/png' });

    await uploadImageIntoSelection({
      editor,
      view: editor.view,
      file,
      size: { width: 100, height: 100 },
    });

    const imageNode = editor.state.doc.firstChild.firstChild;

    expect(imageNode.type.name).toBe('image');
    expect(imageNode.attrs.rId).toBeTruthy();

    const relationships = getDocumentRelationshipElements(editor);
    const found = relationships.find((i) => i.attributes.Id === imageNode.attrs.rId);

    expect(found).toBeTruthy();
    expect(found.attributes.Target).toBe('media/image.png');
  });
});
