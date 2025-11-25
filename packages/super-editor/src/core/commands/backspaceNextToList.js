// @ts-check
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { decreaseListIndent } from './decreaseListIndent.js';
import { isList, findNodePosition } from './list-helpers';

/**
 * Return nearest list container and its single listItem for our MS-Word model.
 * @param {import("prosemirror-state").EditorState} state
 * @returns {{ listDepth: number, listPos: number, listNode: import("prosemirror-model").Node, liNode: import("prosemirror-model").Node } | null}
 */
function getListContext(state) {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d - 1);
    if (isList(node)) {
      const listDepth = d - 1;
      const listPos = $from.before(listDepth);
      const listNode = node;
      const liNode = listNode.firstChild || null;
      if (!liNode || liNode.type.name !== 'listItem') return null;
      return { listDepth, listPos, listNode, liNode };
    }
  }
  return null;
}

/**
 * Handle backspace key behavior when the caret is next to a list.
 * - If inside a list item at start or the item is empty:
 *    level > 0  → outdent
 *    level = 0  → unwrap to paragraph(s)
 * - If outside a list and previous sibling is a list → merge with its last paragraph
 */
export const handleBackspaceNextToList =
  () =>
  ({ state, dispatch, editor }) => {
    const { selection, doc, schema } = state;
    const { $from } = selection;

    if (!selection.empty) return false;
    if ($from.parent.type.name !== 'paragraph') return false;

    // --- Case A: caret INSIDE a list item (our MS-Word model: list -> listItem -> paragraph)
    const ctx = getListContext(state);
    if (ctx) {
      const { listPos, listNode, liNode } = ctx;

      // Only trigger at the start of the item's current paragraph OR if the item is empty
      const atStartOfParagraph = $from.parentOffset === 0;
      const itemIsEmpty = liNode.childCount > 0 ? liNode.firstChild?.content.size === 0 : true;
      if (!atStartOfParagraph && !itemIsEmpty) return false;

      const level = Number(liNode.attrs?.level ?? 0);

      // 1) Try to OUTDENT if we have room
      if (level > 0) {
        const tr1 = state.tr.setMeta('updateListSync', true);
        const didOutdent =
          typeof decreaseListIndent === 'function' &&
          decreaseListIndent()({
            editor,
            state,
            tr: tr1,
            dispatch: (t) => dispatch && t && dispatch(t),
          });

        if (didOutdent) return true;

        // Fallback (shouldn't be needed if command works): manually drop level
        const liPos = listPos + 1; // list + (open) => first child pos
        const newLevel = Math.max(0, level - 1);
        const trFallback = state.tr.setMeta('updateListSync', true);
        trFallback.setNodeMarkup(liPos, null, { ...liNode.attrs, level: newLevel });
        dispatch(trFallback);
        return true;
      }

      // 2) Already at level 0 → unwrap the WHOLE list into its item content
      const replacement =
        liNode && liNode.content && liNode.content.size > 0
          ? liNode.content
          : Fragment.from(schema.nodes.paragraph.create());
      const from = listPos;
      const to = listPos + listNode.nodeSize;

      const tr = state.tr.setMeta('updateListSync', true);
      tr.replaceWith(from, to, replacement);

      // Caret at start of the first inserted paragraph
      const newPos = from + 1;
      tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), 1)).scrollIntoView();

      dispatch(tr);
      return true;
    }

    // --- Case B: caret OUTSIDE a list; previous sibling is a list → merge
    // Only fire when caret is at start of a paragraph
    if ($from.parentOffset !== 0) return false;

    const parentDepth = $from.depth - 1;
    if (parentDepth < 0) return false;

    const container = $from.node(parentDepth);
    const idx = $from.index(parentDepth);
    if (idx === 0) return false; // nothing before

    const beforeNode = container.child(idx - 1);
    if (!beforeNode || !isList(beforeNode)) return false;

    // Previous is a list with single listItem per our model
    const listItem = beforeNode.lastChild;
    if (!listItem || listItem.type.name !== 'listItem') return false;

    const targetPara = listItem.lastChild;
    if (!targetPara || targetPara.type.name !== 'paragraph') return false;

    const paraStartPos = findNodePosition(doc, targetPara);
    if (paraStartPos == null) return false;

    const inlineContent = Fragment.from($from.parent.content);

    const tr = state.tr.setMeta('updateListSync', true);

    // Remove the current empty/at-start paragraph
    const thisParaStart = $from.before();
    tr.delete(thisParaStart, thisParaStart + $from.parent.nodeSize);

    // Append its inline content into the last paragraph of the previous list
    const insertPos = paraStartPos + 1 + targetPara.content.size;
    tr.insert(insertPos, inlineContent);

    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos), 1));

    dispatch(tr);
    return true;
  };
