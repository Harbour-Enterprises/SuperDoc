import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DecorationSet } from 'prosemirror-view';
import { LinkedStylesPluginKey, createLinkedStylesPlugin } from '../../extensions/linked-styles/plugin.js';
import { initTestEditor, loadTestDataForEditorTests } from '../helpers/helpers.js';

describe('LinkedStyles plugin (plugin.js)', () => {
  const filename = 'paragraph_spacing_missing.docx';
  let docx, media, mediaFiles, fonts, editor;

  beforeAll(async () => ({ docx, media, mediaFiles, fonts } = await loadTestDataForEditorTests(filename)));
  beforeEach(() => ({ editor } = initTestEditor({ content: docx, media, mediaFiles, fonts })));

  it('init returns {} when converter missing', () => {
    const fake = { options: { mode: 'docx' }, state: editor.state, converter: null };
    const plugin = createLinkedStylesPlugin(fake);
    const initState = plugin.spec.state.init();
    expect(initState).toEqual({});
  });

  it('init returns {} when mode !== docx', () => {
    const fake = { options: { mode: 'md' }, state: editor.state, converter: editor.converter };
    const plugin = createLinkedStylesPlugin(fake);
    const initState = plugin.spec.state.init();
    expect(initState).toEqual({});
  });

  it('produces decorations when in docx mode with linked styles', () => {
    // Plugin is already part of the editor via extension set
    const state = LinkedStylesPluginKey.getState(editor.state);
    expect(state).toBeTruthy();
    expect(state.styles?.length >= 0).toBe(true);
    // Decorations should be a DecorationSet (possibly empty in very small docs)
    expect(state.decorations).toBeInstanceOf(DecorationSet);
    const decos = state.decorations.find(0, editor.state.doc.content.size);
    expect(Array.isArray(decos)).toBe(true);
  });

  it('does not override inline font-size when present', () => {
    const { state } = editor;
    // Find first text node position
    let textPos = null;
    let textLen = 0;
    state.doc.descendants((node, pos) => {
      if (!textPos && node.isText && node.text?.length) {
        textPos = pos;
        textLen = node.nodeSize;
        return false;
      }
      return true;
    });
    expect(textPos).toBeGreaterThan(0);

    // Apply an inline font-size via textStyle that should block style font-size
    const tr = editor.state.tr.addMark(
      textPos,
      textPos + textLen,
      editor.schema.marks.textStyle.create({ fontSize: '16pt' }),
    );
    editor.view.dispatch(tr);

    const pluginState = LinkedStylesPluginKey.getState(editor.state);
    const decos = pluginState.decorations.find(textPos, textPos + textLen);
    // Ensure no decoration forces font-size from style over the inline mark
    const hasStyleFontSize = decos.some((d) => /font-size\s*:/.test(d.spec?.attributes?.style || ''));
    expect(hasStyleFontSize).toBe(false);
  });
});

