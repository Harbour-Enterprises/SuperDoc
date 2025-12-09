import { Plugin, PluginKey } from 'prosemirror-state';
import { Extension } from '../Extension.js';

/**
 * Editable extension controls whether the editor accepts user input.
 *
 * When editable is false, all user interactions are blocked:
 * - Text input via beforeinput events
 * - Mouse interactions via mousedown
 * - Focus via automatic blur
 * - Click, double-click, and triple-click events
 * - Keyboard shortcuts via handleKeyDown
 * - Paste and drop events
 */
export const Editable = Extension.create({
  name: 'editable',

  addPmPlugins() {
    const editor = this.editor;
    const editablePlugin = new Plugin({
      key: new PluginKey('editable'),
      props: {
        editable: () => editor.options.editable,
        handleDOMEvents: {
          beforeinput: (_view, event) => {
            if (!editor.options.editable) {
              event.preventDefault();
              return true;
            }
            return false;
          },
          mousedown: (_view, event) => {
            if (!editor.options.editable) {
              event.preventDefault();
              return true;
            }
            return false;
          },
          focus: (view, event) => {
            if (!editor.options.editable) {
              event.preventDefault();
              view.dom.blur();
              return true;
            }
            return false;
          },
        },
        handleClick: () => !editor.options.editable,
        handleDoubleClick: () => !editor.options.editable,
        handleTripleClick: () => !editor.options.editable,
        handleKeyDown: () => !editor.options.editable,
        handlePaste: () => !editor.options.editable,
        handleDrop: () => !editor.options.editable,
      },
    });

    return [editablePlugin];
  },
});
