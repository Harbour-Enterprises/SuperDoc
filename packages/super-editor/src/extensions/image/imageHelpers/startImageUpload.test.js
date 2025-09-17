import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TextSelection, EditorState } from 'prosemirror-state';
import { initTestEditor } from '@tests/helpers/helpers.js';
import * as uploadModule from './startImageUpload.js';

vi.mock('./processUploadedImage.js', () => ({
  processUploadedImage: vi.fn(() =>
    Promise.resolve({
      file: new File(['processed'], 'processed.png', { type: 'image/png' }),
      width: 320,
      height: 200,
    }),
  ),
}));

vi.mock('./imagePlaceholderPlugin.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ImagePlaceholderPluginKey: { key: 'ImagePlaceholder' },
    findPlaceholder: vi.fn(() => 1),
  };
});

vi.mock('@core/super-converter/docx-helpers/document-rels.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    insertNewRelationship: vi.fn(() => 'rId999'),
  };
});

describe('startImageUpload helpers', () => {
  let schema;

  beforeEach(() => {
    const { editor } = initTestEditor({ mode: 'text', content: '<p></p>' });
    schema = editor.schema;
    editor.destroy();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aborts oversized uploads', async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const editorStub = { options: { handleImageUpload: vi.fn() }, storage: { image: { media: {} } } };
    await uploadModule.startImageUpload({ editor: editorStub, view: {}, file });
    expect(alertSpy).toHaveBeenCalled();
  });

  it('uploadImage inserts the image and cleans up placeholder', async () => {
    const { findPlaceholder } = await import('./imagePlaceholderPlugin.js');
    const uploadHandler = vi.fn().mockResolvedValue('data:image/png;base64,uploaded');
    const file = new File(['content'], 'final.png', { type: 'image/png' });

    const doc = schema.nodes.doc.create(null, [schema.nodes.paragraph.create()]);
    const baseState = EditorState.create({ schema, doc });
    const view = {
      state: baseState.apply(baseState.tr.setSelection(TextSelection.atStart(doc))),
      dispatch(tr) {
        this.state = this.state.apply(tr);
      },
      focus: vi.fn(),
      hasFocus: () => true,
      nodeDOM: () => ({ getBoundingClientRect: () => ({ width: 50, height: 40 }), style: {} }),
    };

    const editor = {
      options: { mode: 'docx', ydoc: {} },
      storage: { image: { media: {} } },
      commands: {
        addImageToCollaboration: vi.fn(),
      },
    };

    await uploadModule.uploadImage({
      editor,
      view,
      file,
      size: { width: 120, height: 90 },
      uploadHandler,
    });

    expect(uploadHandler).toHaveBeenCalledWith(file);
    expect(findPlaceholder).toHaveBeenCalled();
    expect(editor.storage.image.media['word/media/final.png']).toBe('data:image/png;base64,uploaded');
  });
});
