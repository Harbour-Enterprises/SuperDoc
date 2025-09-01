// @ts-check
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { isList } from './list-helpers';

/**
 * Get the context information for the current paragraph.
 * @param {import("prosemirror-state").EditorState} state
 * @returns {Object|null} Context information for the paragraph or null if not found.
 */
export function getParaCtx(state) {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const n = $from.node(d);
    if (n.type.name === 'paragraph') {
      // pos before paragraph by walking from $from to that depth:
      const before = $from.before(d);
      const endInside = before + 1 + n.content.size;
      return { para: n, paraDepth: d, before, endInside };
    }
  }
  return null;
}

/**
 * Check if the cursor is at the visual end of the paragraph.
 * @param {import("prosemirror-state").EditorState} state
 * @param {Object} ctx
 * @returns {boolean}
 */
export function atVisualParaEnd(state, ctx) {
  const { $from } = state.selection;
  const { para, paraDepth, endInside } = ctx;

  // paragraph parent at end
  if ($from.parent.type.name === 'paragraph' && $from.parentOffset === $from.parent.content.size) return true;

  // run parent at end AND this run is last inline in the paragraph
  if ($from.parent.type.name === 'run' && $from.parentOffset === $from.parent.content.size) {
    const idxInPara = $from.index(paraDepth);
    return idxInPara === para.childCount - 1;
  }

  // fallback exact check
  return $from.pos === endInside;
}

/**
 * Get the position and next sibling node at a given block depth.
 * @param {import("prosemirror-state").EditorState} state
 * @param {number} depth
 * @returns {{ pos: number|null, next: import("prosemirror-model").Node|null }}
 */
function getNextSiblingAtDepth(state, depth) {
  // `$from.after(depth)` is the position just after the node at `depth` (i.e., before the next sibling)
  const pos = state.selection.$from.after(depth);
  if (pos == null) return { pos: null, next: null };
  const $pos = state.doc.resolve(pos);
  return { pos, next: $pos.nodeAfter || null };
}

/**
 * Handle delete key behavior when the caret is next to a list.
 * @returns {Function} The command function.
 */
export const handleDeleteNextToList =
  () =>
  ({ state, dispatch }) => {
    const { selection } = state;
    const { $from } = selection;
    if (!selection.empty) return false;

    const ctx = getParaCtx(state);
    if (!ctx) return false;
    const { paraDepth, endInside: paraEnd } = ctx;

    if (!atVisualParaEnd(state, ctx)) return false;

    const tr = state.tr;
    tr.setMeta('suppressAutoList', true);

    const insertAtParaEnd = (frag) => {
      const mapped = tr.mapping.map(paraEnd, 1);
      tr.insert(mapped, frag);
      return mapped;
    };

    // Are we in a list item? (and at which list depth)
    let listItemDepth = -1;
    let listDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      const maybeLI = $from.node(d - 1);
      if (maybeLI.type.name === 'listItem') {
        listItemDepth = d - 1;
        if (d - 2 >= 0 && isList($from.node(d - 2))) listDepth = d - 2;
        break;
      }
    }

    // If in LI and there’s another paragraph in the same LI: let default delete join inside LI
    if (listItemDepth !== -1 && listDepth !== -1) {
      const li = $from.node(listItemDepth);
      const paraIdxInLI = $from.index(listItemDepth + 1); // index among LI children
      if (paraIdxInLI < li.childCount - 1) return false;
    }

    // Determine the “current block” depth to look after:
    // - inside LI: the LIST is the current block (so we look after the whole list)
    // - otherwise: the PARAGRAPH is the current block
    const currentBlockDepth = listItemDepth !== -1 && listDepth !== -1 ? listDepth : paraDepth;

    const { pos: nextBeforePos, next: nextNode } = getNextSiblingAtDepth(state, currentBlockDepth);
    if (nextBeforePos == null || !nextNode) return false;

    // Merge a paragraph that sits at `nextBeforePos`
    const mergeParagraphAt = (beforePos) => {
      // The node to merge is exactly nodeAfter at beforePos
      const livePara = tr.doc.resolve(beforePos).nodeAfter;
      if (!livePara || livePara.type.name !== 'paragraph') return false;

      if (livePara.content.size === 0) {
        tr.delete(beforePos, beforePos + livePara.nodeSize);
        dispatch?.(tr);
        return true;
      }

      const ins = insertAtParaEnd(Fragment.from(livePara.content));
      // delete the source paragraph (careful: map both ends)
      const delFrom = tr.mapping.map(beforePos, 1);
      const delTo = tr.mapping.map(beforePos + livePara.nodeSize, 1);
      tr.delete(delFrom, delTo);

      const selPos = tr.mapping.map(ins + livePara.content.size, -1);
      tr.setSelection(TextSelection.near(tr.doc.resolve(selPos), -1)).scrollIntoView();
      dispatch?.(tr);
      return true;
    };

    // Merge from a list (single LI invariant). Swallow even if nothing to merge to prevent structural join.
    const mergeListAt = (beforePos) => {
      const liveList = tr.doc.resolve(beforePos).nodeAfter;
      if (!liveList || !isList(liveList)) return true; // swallow, block joinForward

      const li = liveList.firstChild;
      if (!li || li.type.name !== 'listItem' || li.childCount === 0) {
        tr.delete(beforePos, beforePos + liveList.nodeSize);
        dispatch?.(tr);
        return true;
      }

      // first non-empty paragraph
      let content = null;
      for (let i = 0; i < li.childCount; i++) {
        const ch = li.child(i);
        if (ch.type.name === 'paragraph' && ch.content.size > 0) {
          content = ch.content;
          break;
        }
      }

      if (content) insertAtParaEnd(Fragment.from(content));

      // delete the whole list
      const delFrom = tr.mapping.map(beforePos, 1);
      const delTo = tr.mapping.map(beforePos + liveList.nodeSize, 1);
      tr.delete(delFrom, delTo);

      const endPos = tr.mapping.map(paraEnd + (content ? content.size : 0), -1);
      tr.setSelection(TextSelection.near(tr.doc.resolve(endPos), -1)).scrollIntoView();
      dispatch?.(tr);
      return true;
    };

    if (nextNode.isTextblock) {
      const changed = mergeParagraphAt(nextBeforePos);
      return changed ? true : false; // only swallow if we actually merged/deleted
    }
    if (isList(nextNode)) {
      return mergeListAt(nextBeforePos); // swallow to prevent structural list merge
    }

    // Unknown block: let default behavior proceed
    return false;
  };
