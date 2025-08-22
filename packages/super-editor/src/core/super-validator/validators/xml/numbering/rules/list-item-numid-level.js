// @ts-check
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

function parseIntId(v) {
  if (v == null) return undefined; // catches undefined & null
  if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

/**
 * Ensure each listItem has numId and level. If missing, create parent list type,
 * create/generate a numbering definition and set attrs via tr.setNodeMarkup.
 * @param {import('../../../../types.js').ElementInfo[]} listItems
 * @param {import('../../../../types.js').Editor} editor
 * @param {import('prosemirror-state').Transaction} tr
 * @param {import('../../../../types.js').ValidatorLogger} logger
 * @returns {{ modified: boolean, results: string[] }}
 */
export function ensureListItemHasNumIdAndLevel(listItems, editor, tr, logger) {
  let modified = false;
  const results = [];

  listItems.forEach(({ node, pos }) => {
    const current = node.attrs || {};

    const isValidId = (n) => Number.isInteger(n) && n >= 0;

    let numId = parseIntId(current.numId);
    let level = parseIntId(current.level);

    const needsNumId = !isValidId(numId);
    const needsLevel = !isValidId(level);
    const $pos = tr.doc.resolve(pos);
    const parentList = $pos.parent;
    const listType = parentList?.type?.name === 'bulletList' ? 'bulletList' : 'orderedList';

    if (needsLevel) level = 0;
    if (needsNumId) {
      numId = ListHelpers.getNewListId(editor);
      ListHelpers.generateNewListDefinition({ numId, listType, editor });
      logger.debug('Generated numId for listItem at pos', pos, 'listType:', listType);
      results.push(`Created numId ${numId} for listItem at pos ${pos}`);
    }

    tr.setNodeMarkup(pos, null, { ...current, numId, level }, node.marks);
    modified = true;
  });

  return { modified, results };
}
