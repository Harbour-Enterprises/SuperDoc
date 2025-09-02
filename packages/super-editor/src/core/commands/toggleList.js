// @ts-check
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { findParentNode } from '../helpers/findParentNode.js';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

/**
 * Find the nearest list node at the given position.
 * @param {import("prosemirror-model").ResolvedPos} $pos
 * @param {import("prosemirror-model").NodeType} OrderedType
 * @param {import("prosemirror-model").NodeType} BulletType
 * @returns {{ node: import("prosemirror-model").Node, pos: number, depth: number } | null}
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
 * Determine the effective list kind, accounting for lists styled as bullets.
 * @param {import("prosemirror-model").Node} node
 * @returns {'ordered' | 'bullet' | null}
 */
function getEffectiveListKind(node) {
  if (!node) return null;
  const typeName = node.type?.name;
  const style = node.attrs?.['list-style-type'];

  if (typeName === 'bulletList') return 'bullet';
  if (typeName === 'orderedList') {
    if (style === 'bullet') return 'bullet';
    const firstLI = node.firstChild;
    const liFmt = firstLI?.attrs?.listNumberingType;
    if (liFmt === 'bullet') return 'bullet';
    return 'ordered';
  }
  return null;
}

/**
 * Collect all top-level list nodes that intersect with the given selection.
 * @param {Object} param0
 * @param {import("prosemirror-model").Node} param0.doc
 * @param {import("prosemirror-state").Selection} param0.selection
 * @param {import("prosemirror-model").NodeType} param0.OrderedType
 * @param {import("prosemirror-model").NodeType} param0.BulletType
 * @returns {Array<{ node: import("prosemirror-model").Node, pos: number, depth: number | null }>}
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
 * Compute hierarchical counters (listLevel) for ordered lists that contain multiple LIs.
 * @param {Array<import("prosemirror-model").Node>} liNodes
 * @returns {Array<number[]>}
 */
function computeListLevels(liNodes) {
  const levelsOut = [];
  const counters = [];
  for (let i = 0; i < liNodes.length; i++) {
    const lvl = Math.max(0, Number(liNodes[i]?.attrs?.level ?? 0));
    while (counters.length <= lvl) counters.push(0);
    counters.splice(lvl + 1);
    counters[lvl] = (counters[lvl] ?? 0) + 1;
    levelsOut.push(counters.slice(0, lvl + 1));
  }
  return levelsOut;
}

/**
 * Rebuild a list node with a new numbering scheme.
 * Preserves full item content and merges original attrs (run/paragraph props),
 * then overrides numbering-related fields for both ordered and bullet lists.
 * @param {Object} param0
 * @param {import("prosemirror-model").Node} param0.oldList
 * @param {import("prosemirror-model").NodeType} param0.toType
 * @param {import("../Editor.js").Editor} param0.editor
 * @param {import("prosemirror-model").Schema} param0.schema
 * @param {String|null} param0.fixedNumId
 * @returns {import("prosemirror-model").Node}
 */
export function rebuildListNodeWithNewNum({ oldList, toType, editor, schema, fixedNumId }) {
  const OrderedType = schema.nodes.orderedList;
  const isOrdered = toType === OrderedType;

  // Always create a list definition + numId for the target kind (bullet or ordered)
  const numId = fixedNumId ?? ListHelpers.getNewListId(editor);
  if (fixedNumId == null) {
    ListHelpers.generateNewListDefinition?.({ numId: Number(numId), listType: toType, editor });
  }

  // Collect list items from old container
  const liNodes = [];
  for (let i = 0; i < oldList.childCount; i++) {
    const li = oldList.child(i);
    if (li?.type?.name === 'listItem') liNodes.push(li);
  }

  const computedLevels = isOrdered ? computeListLevels(liNodes) : [];

  const items = [];
  for (let i = 0; i < liNodes.length; i++) {
    const li = liNodes[i];

    const level = Math.max(0, Number(li.attrs?.level ?? 0));
    const listLevel = isOrdered
      ? (computedLevels[i] ?? [i + 1])
      : Array.isArray(li.attrs?.listLevel)
        ? li.attrs.listLevel
        : [level + 1];

    const details =
      ListHelpers.getListDefinitionDetails?.({ numId: Number(numId), level, listType: toType, editor }) || {};

    const effectiveFmt = isOrdered ? details.numFmt || 'decimal' : details.numFmt || 'bullet';
    const effectiveLvlText = isOrdered ? details.lvlText || '%1.' : details.lvlText || '•';

    const baseAttrs = li.attrs || {};
    const itemAttrs = {
      ...baseAttrs,
      level,
      listLevel,
      numId,
      numPrType: 'inline',
      listNumberingType: effectiveFmt,
      lvlText: effectiveLvlText,
    };

    const contentJSON = li.content && li.content.size > 0 ? li.content.toJSON() : [{ type: 'paragraph', content: [] }];

    items.push({
      type: 'listItem',
      attrs: itemAttrs,
      content: contentJSON,
    });
  }

  const containerJSON = {
    type: isOrdered ? 'orderedList' : 'bulletList',
    attrs: {
      listId: numId,
      'list-style-type': isOrdered
        ? (items[0]?.attrs?.listNumberingType ?? 'decimal')
        : (items[0]?.attrs?.listNumberingType ?? 'bullet'),
      ...(isOrdered ? { order: 1 } : {}),
    },
    content: items,
  };

  return editor.schema.nodeFromJSON(containerJSON);
}

/**
 * Build multiple list containers (MS-Word model: each list has exactly one listItem).
 * All containers share the same numId so numbering/markers continue across them.
 * @param {Object} param0
 * @param {Array<{ node: import("prosemirror-model").Node, pos: number }>} param0.paragraphs
 * @param {'ordered'|'bullet'} param0.targetKind
 * @param {import("../Editor.js").Editor} param0.editor
 * @param {import("prosemirror-model").Schema} param0.schema
 * @returns {import("prosemirror-model").Node[]} array of list containers
 */
function buildListContainersFromParagraphs({ paragraphs, targetKind, editor, schema }) {
  const OrderedType = schema.nodes.orderedList;
  const BulletType = schema.nodes.bulletList;
  const toType = targetKind === 'ordered' ? OrderedType : BulletType;

  // One shared numId/definition for all containers
  const numId = ListHelpers.getNewListId(editor);
  ListHelpers.generateNewListDefinition?.({ numId, listType: toType, editor });

  const isOrdered = targetKind === 'ordered';
  const containers = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const { node } = paragraphs[i];
    const level = 0;
    const listLevel = [1]; // top-level item in its own container

    const numFmt = isOrdered ? 'decimal' : 'bullet';
    const lvlText = isOrdered ? '%1.' : '•';

    const itemJSON = ListHelpers.createListItemNodeJSON({
      level,
      listLevel,
      numId,
      numFmt,
      lvlText,
      contentNode: node.toJSON(), // preserve runs
    });

    // Ensure runtime-critical attrs
    itemJSON.attrs = {
      ...(itemJSON.attrs || {}),
      level,
      listLevel,
      numId,
      numPrType: 'inline',
      listNumberingType: numFmt,
      lvlText,
    };

    const containerJSON = {
      type: isOrdered ? 'orderedList' : 'bulletList',
      attrs: {
        listId: numId,
        'list-style-type': isOrdered ? 'decimal' : 'bullet',
        ...(isOrdered ? { order: 1 } : {}),
      },
      content: [itemJSON],
    };

    containers.push(editor.schema.nodeFromJSON(containerJSON));
  }

  return containers;
}

/**
 * Set the selection span in the transaction to match the original span.
 * @param {import("prosemirror-state").Transaction} tr
 * @param {number} fromBefore
 * @param {number} toBefore
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
 * Unwrap only when the effective kind already matches the target kind.
 * Otherwise, convert touched list container(s). For multi-paragraph wraps,
 * create one container per paragraph (MS-Word model).
 * @param {String|import("prosemirror-model").NodeType} listType
 * @returns {Function}
 */
export const toggleList =
  (listType) =>
  ({ editor, state, tr, dispatch }) => {
    const { selection, doc } = state;

    const OrderedType = editor.schema.nodes.orderedList;
    const BulletType = editor.schema.nodes.bulletList;
    const TargetType = typeof listType === 'string' ? editor.schema.nodes[listType] : listType;
    const targetKind = TargetType === OrderedType ? 'ordered' : 'bullet';

    const near = nearestListAt(selection.$from, OrderedType, BulletType);
    const nearKind = near ? getEffectiveListKind(near.node) : null;

    // A) Inside some list
    if (near) {
      const isSameAsTarget = nearKind === targetKind;

      // A1) Effective kind already target → unwrap that list only
      if (isSameAsTarget) {
        const { pos, node } = near;
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

      // A2) Different effective kind → convert touched containers (never unwrap)
      let touchedLists = collectIntersectingTopLists({ doc, selection, OrderedType, BulletType });

      // Fallback: caret case (no intersecting top lists collected)
      if (touchedLists.length === 0) {
        touchedLists = [{ node: near.node, pos: near.pos, depth: near.depth }];
      }

      // Compute span BEFORE mutations
      let spanFromBefore = Infinity;
      let spanToBefore = -Infinity;
      for (const { node, pos } of touchedLists) {
        spanFromBefore = Math.min(spanFromBefore, pos);
        spanToBefore = Math.max(spanToBefore, pos + node.nodeSize);
      }

      let sharedNumId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition?.({ numId: sharedNumId, listType: TargetType, editor });

      // Replace from bottom-up to keep positions stable
      touchedLists.sort((a, b) => b.pos - a.pos);
      for (const { node: oldList, pos } of touchedLists) {
        const mapped = tr.mapping.map(pos);
        const newList = rebuildListNodeWithNewNum({
          oldList,
          toType: TargetType,
          editor,
          schema: editor.schema,
          fixedNumId: String(sharedNumId),
        });
        tr.replaceWith(mapped, mapped + oldList.nodeSize, newList);
      }

      setMappedSelectionSpan(tr, spanFromBefore, spanToBefore);
      if (dispatch) dispatch(tr);
      return true;
    }

    // B) Not inside a list: wrap paragraphs (MS-Word model → one container per paragraph)
    const { from, to, empty } = selection;

    /**
     * Collect all paragraph nodes in the current selection.
     * @returns {Array<{ node: import("prosemirror-model").Node, pos: number }>}
     */
    const collectParagraphs = () => {
      const out = [];
      doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph') {
          const nodeFrom = pos;
          const nodeTo = pos + node.nodeSize;
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
        // span BEFORE mutation
        const first = paragraphs[0];
        const last = paragraphs[paragraphs.length - 1];
        const spanFromBefore = first.pos;
        const spanToBefore = last.pos + last.node.nodeSize;

        const containers = buildListContainersFromParagraphs({
          paragraphs,
          targetKind,
          editor,
          schema: editor.schema,
        });

        tr.replaceWith(spanFromBefore, spanToBefore, Fragment.from(containers));
        setMappedSelectionSpan(tr, spanFromBefore, spanToBefore);

        if (dispatch) dispatch(tr);
        return true;
      }
    }

    // Single paragraph case
    const paraAtCursor = findParentNode((n) => n.type.name === 'paragraph')(selection);
    if (!paraAtCursor) return false;

    {
      const { node: paragraph, pos } = paraAtCursor;
      const containers = buildListContainersFromParagraphs({
        paragraphs: [{ node: paragraph, pos }],
        targetKind,
        editor,
        schema: editor.schema,
      });

      tr.replaceWith(pos, pos + paragraph.nodeSize, containers[0]);
      if (dispatch) dispatch(tr);
      return true;
    }
  };
