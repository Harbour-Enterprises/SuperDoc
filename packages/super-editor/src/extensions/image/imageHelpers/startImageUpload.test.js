import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { TextSelection } from 'prosemirror-state';
import { Doc as YDoc } from 'yjs';
import { loadTestDataForEditorTests, initTestEditor } from '@tests/helpers/helpers.js';
import * as processModule from './processUploadedImage.js';
import {
  checkAndProcessImage,
  replaceSelectionWithImagePlaceholder,
  uploadAndInsertImage,
} from './startImageUpload.js';
import { findPlaceholder, removeImagePlaceholder } from './imageRegistrationPlugin.js';
import * as docRelsModule from '@core/super-converter/docx-helpers/document-rels.js';

const originalAlert = window.alert;

describe('checkAndProcessImage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.alert = vi.fn();
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  it('returns empty result when file is larger than 5MB', async () => {
    const bytes = new Uint8Array(6 * 1024 * 1024);
    const file = new File([bytes], 'large.png', { type: 'image/png' });

    const spy = vi.spyOn(processModule, 'processUploadedImage');

    const result = await checkAndProcessImage({
      getMaxContentSize: () => ({ width: 800, height: 600 }),
      file,
    });

    expect(window.alert).toHaveBeenCalledWith('Image size must be less than 5MB');
    expect(result).toEqual({ file: null, size: { width: 0, height: 0 } });
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns processed image data when resizing succeeds', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'small.png', { type: 'image/png' });
    const processedFile = new File([new Uint8Array([4, 5, 6])], 'processed.png', { type: 'image/png' });

    vi.spyOn(processModule, 'processUploadedImage').mockResolvedValue({
      file: processedFile,
      width: 123,
      height: 456,
    });

    const result = await checkAndProcessImage({
      getMaxContentSize: () => ({ width: 1024, height: 768 }),
      file,
    });

    expect(result).toEqual({
      file: processedFile,
      size: { width: 123, height: 456 },
    });
  });

  it('returns empty result when resizing throws', async () => {
    const file = new File([new Uint8Array([7, 8, 9])], 'error.png', { type: 'image/png' });
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(processModule, 'processUploadedImage').mockRejectedValue(new Error('processing failed'));

    const result = await checkAndProcessImage({
      getMaxContentSize: () => ({ width: 1024, height: 768 }),
      file,
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error processing image:', expect.any(Error));
    expect(result).toEqual({ file: null, size: { width: 0, height: 0 } });

    consoleSpy.mockRestore();
  });
});

describe('image upload helpers integration', () => {
  const filename = 'blank-doc.docx';
  let docx, media, mediaFiles, fonts, editor;

  const createTestFile = (name = 'test.png') => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));

  beforeEach(() => {
    const ydoc = new YDoc();
    ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts, ydoc }));
  });

  it('respects lastSelection when in header or footer', () => {
    const id = {};
    const originalOptions = { ...editor.options };
    const headerSelection = TextSelection.create(editor.state.doc, 0, 0);
    editor.options.isHeaderOrFooter = true;
    editor.options.lastSelection = headerSelection;

    replaceSelectionWithImagePlaceholder({
      view: editor.view,
      editorOptions: editor.options,
      id,
    });

    expect(findPlaceholder(editor.view.state, id)).toBe(headerSelection.from);

    const cleanupTr = removeImagePlaceholder(editor.view.state, editor.view.state.tr, id);
    editor.view.dispatch(cleanupTr);

    editor.options.isHeaderOrFooter = originalOptions.isHeaderOrFooter;
    editor.options.lastSelection = originalOptions.lastSelection;
  });

  it('deletes the current selection before inserting a placeholder', () => {
    editor.commands.insertContentAt(0, 'abc');
    const id = {};

    editor.commands.selectAll();

    replaceSelectionWithImagePlaceholder({
      view: editor.view,
      editorOptions: editor.options,
      id,
    });

    const remainingText = editor.view.state.doc.textBetween(0, editor.view.state.doc.content.size, '\n', '\n');
    expect(remainingText).toBe('');

    const cleanupTr = removeImagePlaceholder(editor.view.state, editor.view.state.tr, id);
    editor.view.dispatch(cleanupTr);
  });

  it('returns early if the placeholder cannot be found', async () => {
    const placeholderId = {};
    replaceSelectionWithImagePlaceholder({
      view: editor.view,
      editorOptions: editor.options,
      id: placeholderId,
    });

    const uploadStub = vi.fn().mockResolvedValue('data:image/png;base64,AAA');
    editor.options.handleImageUpload = uploadStub;

    const missingId = {};
    await uploadAndInsertImage({
      editor,
      view: editor.view,
      file: createTestFile('missing.png'),
      size: { width: 10, height: 10 },
      id: missingId,
    });

    expect(uploadStub).toHaveBeenCalledTimes(1);
    expect(findPlaceholder(editor.view.state, missingId)).toBeNull();

    let imageCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'image') {
        imageCount += 1;
      }
    });
    expect(imageCount).toBe(0);

    const cleanupTr = removeImagePlaceholder(editor.view.state, editor.view.state.tr, placeholderId);
    editor.view.dispatch(cleanupTr);
  });

  it('handles collaboration uploads without throwing when ydoc is present', async () => {
    const id = {};
    editor.options.handleImageUpload = vi.fn().mockResolvedValue('data:image/png;base64,BBB');

    replaceSelectionWithImagePlaceholder({
      view: editor.view,
      editorOptions: editor.options,
      id,
    });

    await expect(
      uploadAndInsertImage({
        editor,
        view: editor.view,
        file: createTestFile('collab.png'),
        size: { width: 20, height: 20 },
        id,
      }),
    ).resolves.not.toThrow();
  });

  it('continues gracefully when relationship insertion fails', async () => {
    const id = {};
    editor.options.mode = 'docx';
    editor.options.handleImageUpload = vi.fn().mockResolvedValue('data:image/png;base64,CCC');

    const relSpy = vi.spyOn(docRelsModule, 'insertNewRelationship').mockImplementation(() => {
      throw new Error('insert failure');
    });

    replaceSelectionWithImagePlaceholder({
      view: editor.view,
      editorOptions: editor.options,
      id,
    });

    await uploadAndInsertImage({
      editor,
      view: editor.view,
      file: createTestFile('relationship.png'),
      size: { width: 30, height: 30 },
      id,
    });

    const imageNode = editor.state.doc.firstChild.firstChild;
    expect(imageNode.attrs.rId).toBeNull();

    relSpy.mockRestore();
  });
});

describe('uploadAndInsertImage collaboration branch (isolated)', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('calls addImageToCollaboration when ydoc is provided', async () => {
    vi.resetModules();

    vi.doMock('./imageRegistrationPlugin.js', () => ({
      findPlaceholder: () => 0,
      removeImagePlaceholder: (_state, tr) => tr,
      addImagePlaceholder: vi.fn(),
    }));

    vi.doMock('@core/super-converter/docx-helpers/document-rels.js', () => ({
      insertNewRelationship: vi.fn(() => 'rId100'),
    }));

    const { uploadAndInsertImage } = await import('./startImageUpload.js');

    const collabSpy = vi.fn();

    const editor = {
      options: {
        handleImageUpload: vi.fn().mockResolvedValue('http://example.com/image.png'),
        mode: 'docx',
        ydoc: {},
      },
      commands: {
        addImageToCollaboration: collabSpy,
      },
      storage: {
        image: { media: {} },
      },
    };

    const tr = {
      replaceWith: vi.fn(() => tr),
    };

    const view = {
      state: {
        tr,
        schema: {
          nodes: {
            image: {
              create: vi.fn(() => ({ attrs: {} })),
            },
          },
        },
      },
      dispatch: vi.fn(),
    };

    const file = new File([new Uint8Array([1])], 'collab.png', { type: 'image/png' });

    await uploadAndInsertImage({
      editor,
      view,
      file,
      size: { width: 10, height: 10 },
      id: {},
    });

    expect(collabSpy).toHaveBeenCalledWith({
      mediaPath: 'word/media/collab.png',
      fileData: 'http://example.com/image.png',
    });
  });
});
