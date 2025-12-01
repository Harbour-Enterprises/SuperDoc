import { TextSelection } from 'prosemirror-state';
import type { Command } from '../types/ChainedCommands.js';

export const restoreSelection =
  (): Command =>
  ({ editor, state, tr }) => {
    const lastSelection = editor.options.lastSelection as { from: number; to: number } | undefined;
    if (lastSelection) {
      const selectionTr = tr.setSelection(TextSelection.create(state.doc, lastSelection.from, lastSelection.to));
      editor.view.dispatch(selectionTr);
    }
    return true;
  };
