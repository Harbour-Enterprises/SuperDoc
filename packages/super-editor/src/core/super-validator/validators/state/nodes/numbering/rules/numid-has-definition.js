// @ts-check
import { ListHelpers } from '../../../../../../helpers/list-numbering-helpers.js';

const parseIntId = (v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!/^\d+$/.test(s)) return undefined;
  return Number(s);
};

/**
 * Ensure each listItem.numId has a corresponding numbering definition.
 * If missing, generate it based on the parent list type.
 * @param {import('../../../../../types.js').ElementInfo[]} listItems
 * @param {import('../../../../../types.js').Editor} editor
 * @param {import('prosemirror-state').Transaction} tr
 * @param {import('../../../../../types.js').ValidatorLogger} logger
 * @returns {{ modified: boolean, results: string[] }}
 */
export function ensureNumIdHasDefinition(listItems, editor, tr, logger) {
  let modified = false;
  const results = [];
  const defs = editor?.converter?.numbering?.definitions || {};

  listItems.forEach(({ node, pos }) => {
    const parsed = parseIntId(node?.attrs?.numId);
    console.log(parsed);
    if (parsed === undefined) return; // other rule will fix it

    if (!defs[parsed]) {
      const $pos = tr.doc.resolve(pos);
      const listType = $pos.parent?.type?.name === 'bulletList' ? 'bulletList' : 'orderedList';
      ListHelpers.generateNewListDefinition({ numId: parsed, listType, editor });
      logger.debug('Generated missing definition for numId:', parsed, 'pos:', pos);
      results.push(`Generated numbering definition for numId ${parsed} at pos ${pos}`);
      modified = true;
    }
  });

  return { modified, results };
}
