// @ts-check
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { decreaseListIndent } from './decreaseListIndent.js';
import { isList, findNodePosition } from './list-helpers';

/**
 * Handle backspace key behavior when the caret is next to a list.
 * @returns {Function} A command function to be used in the editor.
 */
export const handleBackspaceNextToList =
  () =>
  ({ state, dispatch, editor }) => {
    const { selection, doc } = state;
    const { $from } = selection;

    if (!selection.empty) return false;
    if ($from.parent.type.name !== 'paragraph') return false;
    if ($from.parentOffset !== 0) return false; // Only at start of paragraph

    /* Case A: caret INSIDE a list */
    let depth = $from.depth;
    let listDepth = -1;
    while (depth > 0) {
      const n = $from.node(depth - 1);
      if (isList(n)) {
        listDepth = depth - 1;
        break;
      }
      depth--;
    }

    if (listDepth !== -1) {
      // We are inside a list’s single listItem (MS Word model).
      // 1) Try to decrease indent
      //    Note: provide a fresh tr to allow the command to operate.
      const tr1 = state.tr;
      if (decreaseListIndent && typeof decreaseListIndent === 'function') {
        const didOutdent = decreaseListIndent()({
          editor,
          state,
          tr: tr1,
          dispatch: (t) => t && dispatch && dispatch(t),
        });
        if (didOutdent) return true;
      }

      // 2) Already at minimum level: unwrap the list:
      //    Replace the WHOLE list block with its listItem content (paragraphs).
      const listNode = $from.node(listDepth);
      const li = listNode.firstChild;
      const posBeforeList = listDepth === 0 ? 0 : $from.before(listDepth);

      const tr = state.tr;
      // If the listItem has paragraphs/content, use that; otherwise drop an empty paragraph.
      const replacement =
        li && li.content && li.content.size > 0 ? li.content : Fragment.from(state.schema.nodes.paragraph.create());

      tr.replaceWith(posBeforeList, posBeforeList + listNode.nodeSize, replacement);

      // Put the caret at the start of the first inserted paragraph
      const newPos = posBeforeList + 1; // into first block node
      tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), 1)).scrollIntoView();

      dispatch(tr);
      return true;
    }

    /* Case B: caret OUTSIDE a list; previous sibling is a list */
    const parentDepth = $from.depth - 1;
    if (parentDepth < 0) return false;

    const container = $from.node(parentDepth);
    const idx = $from.index(parentDepth);

    // Must have a node before us
    if (idx === 0) return false;

    const beforeNode = container.child(idx - 1);
    if (!beforeNode || !isList(beforeNode)) return false;

    const listItem = beforeNode.lastChild;
    if (!listItem || listItem.type.name !== 'listItem') return false;

    // Merge into the last paragraph of the previous list
    const targetPara = listItem.lastChild;
    if (!targetPara || targetPara.type.name !== 'paragraph') return false;

    const paraStartPos = findNodePosition(doc, targetPara);
    if (paraStartPos == null) return false;

    const inlineContent = Fragment.from($from.parent.content);
    const tr = state.tr;
    tr.setMeta('updateListSync', true);

    const oldParaPos = $from.before(); // safe: parentDepth >= 0 and parent is paragraph
    tr.delete(oldParaPos, oldParaPos + $from.parent.nodeSize);

    const insertPos = paraStartPos + 1 + targetPara.content.size;
    tr.insert(insertPos, inlineContent);

    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos), 1));

    dispatch(tr);
    return true;
  };
