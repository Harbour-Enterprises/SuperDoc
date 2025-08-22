// @ts-check
import { ListHelpers } from '@helpers/list-numbering-helpers.js';

function parseIntId(v) {
  if (v == null) return undefined; // catches undefined & null
  if (typeof v === 'string' && v.trim().toLowerCase() === 'null') return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

/**
 * Ensure each listItem.numId has a corresponding numbering definition.
 * If missing, generate it based on the parent list type.
 * @param {import('../../../../types.js').ElementInfo[]} listItems
 * @param {import('../../../../types.js').Editor} editor
 * @param {import('prosemirror-state').Transaction} tr
 * @param {import('../../../../types.js').ValidatorLogger} logger
 * @returns {{ modified: boolean, results: string[] }}
 */
export function ensureNumIdHasDefinition(listItems, editor, tr, logger) {
  let modified = false;
  const results = [];
  const defs = editor?.converter?.numbering?.definitions || {};

  listItems.forEach(({ node, pos }) => {
    const id = parseIntId(node?.attrs?.numId);
    if (!Number.isInteger(id)) return; // don't create defs for null/NaN

    if (!defs[id]) {
      const $pos = tr.doc.resolve(pos);
      const listType = $pos.parent?.type?.name === 'bulletList' ? 'bulletList' : 'orderedList';
      ListHelpers.generateNewListDefinition({ numId: id, listType, editor });
      logger.debug('Generated missing definition for numId:', id, 'pos:', pos);
      results.push(`Generated numbering definition for numId ${id} at pos ${pos}`);
      modified = true;
    }
  });

  return { modified, results };
}
