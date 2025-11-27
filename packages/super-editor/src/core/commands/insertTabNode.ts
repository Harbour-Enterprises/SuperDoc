import { TextSelection } from 'prosemirror-state';
import type { Command, CommandProps } from '../types/ChainedCommands.js';

export const insertTabCharacter = ({ tr, state, dispatch }: CommandProps): boolean => {
  const { from } = tr.selection;
  const tabText = state.schema.text('\t');

  tr = tr.replaceSelectionWith(tabText);
  tr = tr.setSelection(TextSelection.create(tr.doc, from + 1));

  if (dispatch) dispatch(tr);
  return true;
};

export const insertTabNode =
  (): Command =>
  ({ tr, state, dispatch, editor }) => {
    const newPos = tr.selection.from;
    const tabNode = state.schema?.nodes?.tab?.create();

    // If tab node isn't defined, fallback to tab character
    if (!tabNode) return insertTabCharacter({ tr, state, dispatch, editor } as CommandProps);

    tr.insert(newPos, tabNode);
    if (dispatch) dispatch(tr);
    return true;
  };
