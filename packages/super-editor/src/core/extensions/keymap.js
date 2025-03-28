import { Extension } from '../Extension.js';
import { isIOS } from '../utilities/isIOS.js';
import { isMacOS } from '../utilities/isMacOS.js';

/**
 * For reference.
 * https://github.com/ProseMirror/prosemirror-commands/blob/master/src/commands.ts
 */
export const Keymap = Extension.create({
  name: 'keymap',

  addShortcuts() {
    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.newlineInCode(),
        () => commands.createParagraphNear(),
        () => commands.liftEmptyBlock(),
        () => commands.splitBlock(),
      ]);

    const handleBackspace = () =>
      this.editor.commands.first(({ commands, tr }) => [
        () => commands.undoInputRule(),
        () => {
          tr.setMeta('inputType', 'deleteContentBackward');
          return false;
        },
        () => commands.deleteSelection(),
        () => commands.joinBackward(),
        () => commands.selectNodeBackward(),
      ]);

    const handleDelete = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.deleteSelection(),
        () => commands.joinForward(),
        () => commands.selectNodeForward(),
      ]);

    const baseKeymap = {
      Enter: handleEnter,
      'Mod-Enter': () => this.editor.commands.exitCode(),
      Backspace: handleBackspace,
      'Mod-Backspace': handleBackspace,
      'Shift-Backspace': handleBackspace,
      Delete: handleDelete,
      'Mod-Delete': handleDelete,
      'Mod-a': () => this.editor.commands.selectAll(),
      Tab: () => this.editor.commands.insertTabNode(),
    };

    const pcBaseKeymap = {
      ...baseKeymap,
    };

    const macBaseKeymap = {
      ...baseKeymap,
      'Ctrl-h': handleBackspace,
      'Alt-Backspace': handleBackspace,
      'Ctrl-d': handleDelete,
      'Ctrl-Alt-Backspace': handleDelete,
      'Alt-Delete': handleDelete,
      'Alt-d': handleDelete,
      'Ctrl-a': () => this.editor.commands.selectTextblockStart(),
      'Ctrl-e': () => this.editor.commands.selectTextblockEnd(),
      'Ctrl-t': () => this.editor.commands.insertTabChar(),
    };

    if (isMacOS() || isIOS()) {
      return macBaseKeymap;
    }

    return pcBaseKeymap;
  },
});
