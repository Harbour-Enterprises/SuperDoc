import { findParentNode } from '@helpers/index.js';
import { isList } from '@core/commands/list-helpers';
import { ListHelpers } from '@helpers/list-numbering-helpers.js';
import { getResolvedParagraphProperties } from '@extensions/paragraph/resolvedPropertiesCache.js';
import type { Editor } from '../Editor.js';
import type { Transaction } from 'prosemirror-state';
import type { Node, ResolvedPos } from 'prosemirror-model';

/**
 * Increase or decrease the numbering level of the currently selected list item.
 *
 * @param {number} delta The delta to apply to the current list level (e.g. +1 to indent, -1 to outdent).
 * @param {import('../Editor').Editor} editor The editor providing state and numbering data.
 * @param {import('prosemirror-state').Transaction} tr The transaction to mutate when the level changes.
 * @returns {boolean} True when the command handled the interaction (even if it was a no-op), otherwise false.
 */
export const changeListLevel = (delta: number, editor: Editor, tr: Transaction): boolean => {
  const { state } = editor;
  const { selection, doc: stateDoc } = state;

  const listItemsInSelection: Array<{ node: Node; pos: number }> = [];
  const seenPositions = new Set<number>();
  const doc = stateDoc ?? selection?.$from?.node?.(0);

  const collectListItem = (node: Node, pos: number): void => {
    if (isList(node) && !seenPositions.has(pos)) {
      listItemsInSelection.push({ node, pos });
      seenPositions.add(pos);
    }
  };

  const addEdgeNode = ($pos: ResolvedPos): void => {
    if (!$pos) return;
    const parentNode = $pos.parent;
    if (parentNode.type.name !== 'paragraph') return;
    const pos = typeof $pos.before === 'function' ? $pos.before() : null;
    if (!parentNode || pos == null) return;
    collectListItem(parentNode, pos);
  };

  const ranges =
    selection?.ranges?.length && Array.isArray(selection.ranges)
      ? selection.ranges
      : selection?.$from && selection?.$to
        ? [{ $from: selection.$from, $to: selection.$to }]
        : [];

  for (const range of ranges) {
    if (!range?.$from || !range?.$to) continue;

    if (doc?.nodesBetween) {
      doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => collectListItem(node, pos));
    }
    addEdgeNode(range.$from);
    addEdgeNode(range.$to);
  }

  if (!listItemsInSelection.length && selection) {
    const currentItem = findParentNode(isList)(selection);
    if (!currentItem) return false;
    listItemsInSelection.push({ node: currentItem.node, pos: currentItem.pos });
  }

  type Target = { node: Node; pos: number; numberingProperties: { numId: number; ilvl: number } };
  const targets: Target[] = [];
  let encounteredNegativeLevel = false;

  for (const item of listItemsInSelection) {
    const numberingProperties = getResolvedParagraphProperties(item.node)?.numberingProperties;

    if (!numberingProperties || numberingProperties.numId === undefined) continue;

    const currentLevel = Number.parseInt(String(numberingProperties.ilvl ?? '0'), 10);
    const normalizedLevel = Number.isNaN(currentLevel) ? 0 : currentLevel;
    const newLevel = normalizedLevel + delta;

    if (newLevel < 0) {
      encounteredNegativeLevel = true;
      continue;
    }

    if (!ListHelpers.hasListDefinition(editor, numberingProperties.numId, newLevel)) {
      return false; // Prevent invalid levels
    }

    targets.push({
      node: item.node,
      pos: item.pos,
      numberingProperties: {
        numId: numberingProperties.numId,
        ilvl: newLevel,
      },
    });
  }

  if (!targets.length) {
    return encounteredNegativeLevel ? true : false;
  }

  targets
    .sort((a, b) => a.pos - b.pos)
    .forEach(({ numberingProperties, node, pos }) => {
      updateNumberingProperties(numberingProperties, node, pos, editor, tr);
    });

  return true; // IMPORTANT: consume Tab so we don't indent paragraph text
};

/**
 * Apply new numbering metadata to a paragraph node and refresh related layout attributes.
 *
 * @param {{ numId: number, ilvl: number } | null} newNumberingProperties The numbering properties to set, or null to clear them.
 * @param {import('prosemirror-model').Node} paragraphNode The paragraph node being updated.
 * @param {number} pos Document position of the node, used for transaction updates.
 * @param {import('../Editor').Editor} editor The editor that supplies numbering and style resolution helpers.
 * @param {import('prosemirror-state').Transaction} tr The transaction receiving the updated node markup.
 */
export function updateNumberingProperties(
  newNumberingProperties: { numId: number; ilvl: number } | null,
  paragraphNode: Node,
  pos: number,
  editor: Editor,
  tr: Transaction,
): void {
  const newProperties = {
    ...(paragraphNode.attrs.paragraphProperties || {}),
    numberingProperties: newNumberingProperties ? { ...newNumberingProperties } : null,
  };

  if (paragraphNode.attrs.paragraphProperties?.styleId === 'ListParagraph') {
    // Word's default list paragraph style
    newProperties.styleId = null;
  }

  // Inline indentation is removed for compatibility with Word
  if (newProperties.indent) {
    delete newProperties.indent;
  }

  const newAttrs: Record<string, unknown> = {
    ...paragraphNode.attrs,
    paragraphProperties: newProperties,
    numberingProperties: newProperties.numberingProperties,
  };

  // Only explicitly set listRendering to null when removing list properties.
  // When adding/updating list properties, let numberingPlugin compute it via appendTransaction.
  // This prevents cache issues where the first transaction caches with null marker data.
  if (!newNumberingProperties) {
    (newAttrs as { listRendering?: unknown }).listRendering = null;
  }

  tr.setNodeMarkup(pos, null, newAttrs);
}
