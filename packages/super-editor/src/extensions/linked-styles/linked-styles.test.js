import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextSelection } from 'prosemirror-state';
import { LinkedStylesPluginKey } from './plugin.js';
import { initTestEditor, loadTestDataForEditorTests } from '../../tests/helpers/helpers.js';

describe('LinkedStyles Extension', () => {
  const filename = 'paragraph_spacing_missing.docx';
  let docx, media, mediaFiles, fonts, editor, tr;
  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => {
    ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts }));
    tr = editor.state.tr;
    vi.clearAllMocks();
  });

  describe('Commands', () => {
    const style1 = { id: 'Heading1' };

    describe('setLinkedStyle', () => {
      it('should call applyLinkedStyleToTransaction with the correct style', () => {
        const result = editor.commands.setLinkedStyle(style1);

        expect(result).toBe(true);
        expect(editor.state.doc.content.content[0].attrs.styleId).toBe('Heading1');
      });
    });

    describe('toggleLinkedStyle', () => {
      const styleToToggle = { id: 'Heading1' };

      it('should return false for an empty selection', () => {
        tr.setSelection(TextSelection.create(tr.doc, 1)); // Cursor selection
        const result = editor.commands.toggleLinkedStyle(styleToToggle, 'paragraph');

        expect(result).toBe(false);
        expect(editor.state.doc.content.content[0].attrs.styleId).toBe(null);
      });

      it('should apply style when no style is currently set', () => {
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, 16))); // Select "First paragraph"
        editor.commands.toggleLinkedStyle(styleToToggle, 'paragraph');

        expect(editor.state.doc.content.content[0].attrs.styleId).toBe(styleToToggle.id);
      });

      it('should remove style when the same style is already applied', () => {
        editor.view.dispatch(tr.setNodeMarkup(17, null, { styleId: styleToToggle.id })); // Apply existing style to second paragraph

        expect(editor.state.doc.content.content[1].attrs.styleId).toBe(styleToToggle.id);

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(tr.doc, 18, 34))); // Select "Second paragraph"
        editor.commands.toggleLinkedStyle(styleToToggle, 'paragraph');
        expect(editor.state.doc.content.content[1].attrs.styleId).toBe(null);
      });

      it('should apply new style when a different style is already applied', () => {
        editor.view.dispatch(tr.setNodeMarkup(17, null, { styleId: 'Heading2' })); // Apply existing style to second paragraph

        expect(editor.state.doc.content.content[1].attrs.styleId).toBe('Heading2');

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(tr.doc, 18, 34))); // Select "Second paragraph"
        editor.commands.toggleLinkedStyle(styleToToggle, 'paragraph');
        expect(editor.state.doc.content.content[1].attrs.styleId).toBe('Heading1');
      });

      it('should return false if no node of the specified type can be found', () => {
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, 16))); // Select "First paragraph"

        const result = editor.commands.toggleLinkedStyle(styleToToggle, 'non-existent-type');

        expect(result).toBe(false);
      });
    });

    describe('setStyleById', () => {
      it('should apply style if styleId is valid', () => {
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, 16))); // Select "First paragraph"

        const result = editor.commands.setStyleById('Heading1');

        expect(result).toBe(true);
        expect(editor.state.doc.content.content[0].attrs.styleId).toBe('Heading1');
      });

      it('should return false if styleId is not found', () => {
        editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, 1, 16))); // Select "First paragraph"

        const result = editor.commands.setStyleById('invalid-id');

        expect(result).toBe(false);
        expect(editor.state.doc.content.content[0].attrs.styleId).toBe(null);
      });
    });
  });

  describe('Helpers', () => {
    let linkedStylesHelpers;

    beforeEach(() => {
      linkedStylesHelpers = editor.helpers.linkedStyles;
    });

    describe('getStyles', () => {
      it('should return all styles from the plugin state', () => {
        const styles = linkedStylesHelpers.getStyles();
        expect(styles).toEqual(editor.state.linkedStyles$.styles);
      });
    });

    describe('getStyleById', () => {
      it('should return the correct style by its ID', () => {
        const style = linkedStylesHelpers.getStyleById('Heading1');
        expect(style.id).toEqual('Heading1');
      });

      it('should return undefined if style is not found', () => {
        const style = linkedStylesHelpers.getStyleById('non-existent');
        expect(style).toBeUndefined();
      });
    });

    describe('getLinkedStyleString', () => {
      it('should call generateLinkedStyleString for a valid style ID', () => {
        const result = linkedStylesHelpers.getLinkedStyleString('Title');
        // Some environments include paragraph margins before run styles; assert on key properties only.
        expect(result).toContain('font-family: Aptos Display');
        expect(result).toContain('letter-spacing: -0.5pt');
        expect(result).toContain('font-size: 28pt');
      });

      it('should return an empty string for an invalid style ID', () => {
        const result = linkedStylesHelpers.getLinkedStyleString('invalid-id');
        expect(result).toBe('');
      });
    });
  });
});
