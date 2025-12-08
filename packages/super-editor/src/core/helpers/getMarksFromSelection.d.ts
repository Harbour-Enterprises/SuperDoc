import type { EditorState } from 'prosemirror-state';
import type { Mark } from 'prosemirror-model';

export function getMarksFromSelection(state: EditorState): Mark[];
