import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '../Extension.js';
import type { Editor } from '../Editor.js';

/**
 * For reference.
 * https://prosemirror.net/docs/ref/#history.history
 */
export const EditorFocus = Extension.create({
  name: 'editorFocus',

  addPmPlugins() {
    const editor = this.editor as Editor | undefined;

    const editorFocusPlugin = new Plugin({
      key: new PluginKey('editorFocus'),
      props: {
        handleDOMEvents: {
          focus: (view, event) => {
            if (!editor) return false;
            editor.isFocused = true;

            const tr = editor.state.tr.setMeta('focus', { event }).setMeta('addToHistory', false);

            view.dispatch(tr);
            return false;
          },
          blur: (view, event) => {
            if (!editor) return false;
            editor.isFocused = false;

            const tr = editor.state.tr.setMeta('blur', { event }).setMeta('addToHistory', false);

            view.dispatch(tr);
            return false;
          },
        },
      },
    });

    return [editorFocusPlugin];
  },
});
