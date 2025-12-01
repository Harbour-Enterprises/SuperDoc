/**
 * Creates chainable editor state.
 * https://remirror.io/blog/chainable-commands/
 */
import type { EditorState, Transaction, Selection } from 'prosemirror-state';
import type { Mark, Node as PmNode } from 'prosemirror-model';

export type ChainableEditorState = EditorState & {
  tr: Transaction;
  selection: Selection;
  doc: PmNode;
  storedMarks: readonly Mark[] | null;
};

export function chainableEditorState(transaction: Transaction, state: EditorState): ChainableEditorState {
  let { selection, doc, storedMarks } = transaction;

  return {
    ...state,
    apply: state.apply.bind(state),
    applyTransaction: state.applyTransaction.bind(state),
    plugins: state.plugins,
    schema: state.schema,
    reconfigure: state.reconfigure.bind(state),
    toJSON: state.toJSON.bind(state),
    get storedMarks() {
      return storedMarks;
    },
    get selection() {
      return selection;
    },
    get doc() {
      return doc;
    },
    get tr() {
      selection = transaction.selection;
      doc = transaction.doc;
      storedMarks = transaction.storedMarks;
      return transaction;
    },
  };
}
