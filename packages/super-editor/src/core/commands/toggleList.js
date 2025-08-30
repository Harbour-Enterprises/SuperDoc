import { TextSelection } from 'prosemirror-state';
import { findParentNode } from '../helpers/findParentNode.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Find the nearest list node at the given position.
 * @param {import("prosemirror-model").ResolvedPos} $pos
 * @param {import("prosemirror-model").NodeType} OrderedType
 * @param {import("prosemirror-model").NodeType} BulletType
 * @returns {{ node: import("prosemirror-model").Node, pos: number } | null}
 */
export function nearestListAt($pos, OrderedType, BulletType) {
  for (let d = $pos.depth; d >= 0; d--) {
    const node = $pos.node(d);
    if (node.type === OrderedType || node.type === BulletType) {
      return { node, pos: $pos.before(d), depth: d };
    }
  }
  return null;
}

/**
 * Collect all top-level list nodes that intersect with the given selection.
 * @param {Object} param0
 * @param {import("prosemirror-model").Node} param0.doc - The ProseMirror document.
 * @param {import("prosemirror-state").Selection} param0.selection - The ProseMirror selection.
 * @param {import("prosemirror-model").NodeType} param0.OrderedType - The ordered list node type.
 * @param {import("prosemirror-model").NodeType} param0.BulletType - The bullet list node type.
 * @returns {Array} An array of intersecting list nodes.
 */
export function collectIntersectingTopLists({ doc, selection, OrderedType, BulletType }) {
  const { from, to, $from, $to } = selection;
  const hit = new Map();

  const startList = nearestListAt($from, OrderedType, BulletType);
  if (startList) hit.set(startList.pos, startList);

  const endList = nearestListAt($to, OrderedType, BulletType);
  if (endList) hit.set(endList.pos, endList);

  doc.nodesBetween(from, to, (node, pos, parent) => {
    const isList = node.type === OrderedType || node.type === BulletType;
    if (!isList) return true;
    const parentIsList = parent && (parent.type === OrderedType || parent.type === BulletType);
    if (!parentIsList) hit.set(pos, { node, pos, depth: null });
    return false;
  });

  return Array.from(hit.values()).sort((a, b) => b.pos - a.pos);
}

/**
 * Rebuild a list node with a new numbering scheme.
 * @param {Object} param0
 * @param {import("prosemirror-model").Node} param0.oldList - The old list node to rebuild.
 * @param {import("prosemirror-model").NodeType} param0.toType - The target list node type.
 * @param {import("prosemirror-view").EditorView} param0.editor - The ProseMirror editor view.
 * @param {import("prosemirror-model").Schema} param0.schema - The ProseMirror schema.
 * @param {String|null} param0.fixedNumId - A fixed numbering ID, if any.
 * @returns {import("prosemirror-model").Node}
 */
export function rebuildListNodeWithNewNum({ oldList, toType, editor, schema, fixedNumId }) {
  const OrderedType = schema.nodes.orderedList;

  const numId = fixedNumId ?? ListHelpers.getNewListId(editor);
  if (fixedNumId == null) {
    ListHelpers.generateNewListDefinition({ numId, listType: toType, editor });
  }

  const items = [];
  for (let i = 0; i < oldList.childCount; i++) {
    const li = oldList.child(i);
    if (li.type.name !== 'listItem') continue;

    const level = Number(li.attrs?.level ?? 0);
    const listLevel = Array.isArray(li.attrs?.listLevel) ? li.attrs.listLevel : [level + 1];

    const { numFmt, lvlText } = ListHelpers.getListDefinitionDetails({
      numId,
      level,
      listType: toType,
      editor,
    });

    const contentJSON = li.content ? li.content.toJSON() : [];
    const firstBlock = contentJSON?.[0] ?? { type: 'paragraph', content: [] };

    items.push(
      ListHelpers.createListItemNodeJSON({
        level,
        listLevel,
        numId,
        numFmt: numFmt ?? (toType === OrderedType ? 'decimal' : 'bullet'),
        lvlText: lvlText ?? (toType === OrderedType ? '%1.' : '•'),
        contentNode: firstBlock,
      }),
    );
  }

  const isOrdered = toType === OrderedType;
  const containerJSON = {
    type: isOrdered ? 'orderedList' : 'bulletList',
    attrs: {
      listId: numId,
      'list-style-type': isOrdered ? (items[0]?.attrs?.listNumberingType ?? 'decimal') : 'bullet',
      ...(isOrdered ? { order: 0 } : {}),
    },
    content: items,
  };

  return editor.schema.nodeFromJSON(containerJSON);
}

/**
 * Set the selection span in the transaction to match the original span.
 * @param {import("prosemirror-state").Transaction} tr The ProseMirror transaction.
 * @param {number} fromBefore The start position of the original span.
 * @param {number} toBefore The end position of the original span.
 */
export function setMappedSelectionSpan(tr, fromBefore, toBefore) {
  const mappedFrom = tr.mapping.map(fromBefore, -1);
  const mappedTo = tr.mapping.map(toBefore, 1);
  const $from = tr.doc.resolve(Math.max(1, Math.min(mappedFrom, tr.doc.content.size)));
  const $to = tr.doc.resolve(Math.max(1, Math.min(mappedTo, tr.doc.content.size)));
  tr.setSelection(TextSelection.between($from, $to));
}

/**
 * Toggle a list type in the editor.
 * @param {String} listType The type of list to toggle (e.g., "bulletList" or "orderedList").
 * @returns {Function} The command function.
 */
export const toggleList =
  (listType) =>
  ({ editor, state, tr, dispatch }) => {
    const { selection, doc } = state;
    const { from, to, empty } = selection;

    const OrderedType = editor.schema.nodes.orderedList;
    const BulletType = editor.schema.nodes.bulletList;
    const TargetType = typeof listType === 'string' ? editor.schema.nodes[listType] : listType;

    const sameListAtCursor = findParentNode((n) => n.type === TargetType)(selection);

    // 1) Same type: unwrap, then restore span over the unwrapped content
    if (sameListAtCursor) {
      const { pos, node } = sameListAtCursor;
      const spanFromBefore = pos;
      const spanToBefore = pos + node.nodeSize;

      const paras = [];
      for (let i = 0; i < node.childCount; i++) {
        const li = node.child(i);
        paras.push(li.firstChild || editor.schema.nodes.paragraph.create());
      }
      tr.replaceWith(pos, pos + node.nodeSize, paras);

      setMappedSelectionSpan(tr, spanFromBefore, spanToBefore);
      if (dispatch) dispatch(tr);
      return true;
    }

    // 2) Intersects list(s): convert containers; keep whole touched span selected
    const touchedLists = collectIntersectingTopLists({ doc, selection, OrderedType, BulletType });

    if (touchedLists.length > 0) {
      // Compute span BEFORE we start mutating
      let spanFromBefore = Infinity;
      let spanToBefore = -Infinity;
      for (const { node, pos } of touchedLists) {
        spanFromBefore = Math.min(spanFromBefore, pos);
        spanToBefore = Math.max(spanToBefore, pos + node.nodeSize);
      }

      const switchingToOrdered = TargetType === OrderedType;
      let sharedNumId = null;
      if (switchingToOrdered) {
        sharedNumId = ListHelpers.getNewListId(editor);
        ListHelpers.generateNewListDefinition({ numId: sharedNumId, listType: TargetType, editor });
      }

      for (const { node: oldList, pos } of touchedLists) {
        const mapped = tr.mapping.map(pos);
        const newList = rebuildListNodeWithNewNum({
          oldList,
          toType: TargetType,
          editor,
          schema: editor.schema,
          fixedNumId: switchingToOrdered ? sharedNumId : null,
        });
        tr.replaceWith(mapped, mapped + oldList.nodeSize, newList);
      }

      setMappedSelectionSpan(tr, spanFromBefore, spanToBefore);
      if (dispatch) dispatch(tr);
      return true;
    }

    // 3) Not in/over a list: wrap paragraphs (multi-node); keep whole original span selected

    /**
     * Collect all paragraph nodes in the current selection.
     * @returns {Array<{ node: Node, pos: number }>} An array of paragraph nodes and their positions.
     */
    const collectParagraphs = () => {
      const out = [];
      doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph') {
          const nodeFrom = pos,
            nodeTo = pos + node.nodeSize;
          if (nodeFrom < to && nodeTo > from) out.push({ node, pos });
          return false;
        }
        return true;
      });
      return out;
    };

    if (!empty && from !== to) {
      const paragraphs = collectParagraphs();
      if (paragraphs.length > 1) {
        // span BEFORE mutations
        let spanFromBefore = Math.min(...paragraphs.map((p) => p.pos));
        let spanToBefore = Math.max(...paragraphs.map((p) => p.pos + p.node.nodeSize));

        const numId = ListHelpers.getNewListId(editor);
        ListHelpers.generateNewListDefinition({ numId, listType: TargetType, editor });

        // Replace from end to start to avoid shifting
        for (let i = paragraphs.length - 1; i >= 0; i--) {
          const { node, pos } = paragraphs[i];
          const listNode = ListHelpers.createSchemaOrderedListNode({
            level: 0,
            numId,
            listType: TargetType,
            editor,
            listLevel: [1],
            contentNode: node.toJSON(),
          });
          // Do not rely on insertNewList’s selection side-effect; we’ll set it after the loop
          tr.replaceWith(pos, pos + node.nodeSize, listNode);
        }

        setMappedSelectionSpan(tr, spanFromBefore, spanToBefore);
        if (dispatch) dispatch(tr);
        return true;
      }
    }

    // Single paragraph case (keep default caret behavior)
    const paraAtCursor = findParentNode((n) => n.type.name === 'paragraph')(selection);
    if (!paraAtCursor) return false;

    {
      const { node: paragraph, pos } = paraAtCursor;
      const numId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({ numId, listType: TargetType, editor });

      const listNode = ListHelpers.createSchemaOrderedListNode({
        level: 0,
        numId,
        listType: TargetType,
        editor,
        listLevel: [1],
        contentNode: paragraph.toJSON(),
      });

      tr.replaceWith(pos, pos + paragraph.nodeSize, listNode);
      if (dispatch) dispatch(tr);
      return true;
    }
  };
