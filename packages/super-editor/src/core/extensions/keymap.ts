import { Extension } from '../Extension.js';
import { isIOS } from '../utilities/isIOS.js';
import { isMacOS } from '../utilities/isMacOS.js';
import type { Editor } from '../Editor.js';
import type { Command } from '../types/ChainedCommands.js';
import type { Transaction } from 'prosemirror-state';

/**
 * Commands context passed to first() method
 */
interface CommandsContext {
  commands: Record<string, (...args: unknown[]) => Command>;
  tr: Transaction;
}

export const handleEnter = (editor: Editor): boolean => {
  const firstCommand = editor.commands.first as unknown as
    | ((fn: (ctx: CommandsContext) => (() => Command)[]) => boolean)
    | undefined;
  if (!firstCommand) return false;

  return firstCommand(({ commands }) => [
    () => commands.splitRun(),
    () => commands.newlineInCode(),
    () => commands.createParagraphNear(),
    () => commands.liftEmptyBlock(),
    () => commands.splitBlock(),
  ]);
};

export const handleBackspace = (editor: Editor): boolean => {
  const firstCommand = editor.commands.first as
    | ((fn: (ctx: CommandsContext) => (() => Command | boolean)[]) => boolean)
    | undefined;
  if (!firstCommand) return false;

  return firstCommand(({ commands, tr }) => [
    () => commands.undoInputRule(),
    () => {
      tr.setMeta('inputType', 'deleteContentBackward');
      return false;
    },
    () => commands.deleteSelection(),
    () => commands.removeNumberingProperties(),
    () => commands.joinBackward(),
    () => commands.selectNodeBackward(),
  ]);
};

export const handleDelete = (editor: Editor): boolean => {
  const firstCommand = editor.commands.first as unknown as
    | ((fn: (ctx: CommandsContext) => (() => Command)[]) => boolean)
    | undefined;
  if (!firstCommand) return false;

  return firstCommand(({ commands }) => [
    () => commands.deleteSelection(),
    () => commands.joinForward(),
    () => commands.selectNodeForward(),
  ]);
};

/**
 * For reference.
 * https://github.com/ProseMirror/prosemirror-commands/blob/master/src/commands.ts
 */
export const Keymap = Extension.create({
  name: 'keymap',

  addShortcuts() {
    const editor = this.editor;
    if (!editor) return {};

    const baseKeymap = {
      Enter: () => handleEnter(editor),
      'Shift-Enter': () => editor.commands.insertLineBreak(),
      'Mod-Enter': () => editor.commands.exitCode(),
      Backspace: () => handleBackspace(editor),
      'Mod-Backspace': () => handleBackspace(editor),
      'Shift-Backspace': () => handleBackspace(editor),
      Delete: () => handleDelete(editor),
      'Mod-Delete': () => handleDelete(editor),
      'Mod-a': () => editor.commands.selectAll(),
      Tab: () => editor.commands.insertTabNode(),
    };

    const pcBaseKeymap = {
      ...baseKeymap,
    };

    const macBaseKeymap = {
      ...baseKeymap,
      'Ctrl-h': () => handleBackspace(editor),
      'Alt-Backspace': () => handleBackspace(editor),
      'Ctrl-d': () => handleDelete(editor),
      'Ctrl-Alt-Backspace': () => handleDelete(editor),
      'Alt-Delete': () => handleDelete(editor),
      'Alt-d': () => handleDelete(editor),
      'Ctrl-a': () => editor.commands.selectTextblockStart(),
      'Ctrl-e': () => editor.commands.selectTextblockEnd(),
      'Ctrl-t': () => editor.commands.insertTabChar(),
    };

    if (isMacOS() || isIOS()) {
      return macBaseKeymap;
    }

    return pcBaseKeymap;
  },
});
