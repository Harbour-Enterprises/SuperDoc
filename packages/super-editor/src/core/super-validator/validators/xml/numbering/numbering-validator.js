// @ts-check
/**
 * @typedef {import('../../../types.js').ValidatorLogger} ValidatorLogger
 * @typedef {import('../../../types.js').Editor} Editor
 * @typedef {import('../../../types.js').ValidatorFunction} ValidatorFunction
 */
import { ensureListItemHasNumIdAndLevel, ensureNumIdHasDefinition } from './rules/index.js';

export function createNumberingValidator({ editor, logger }) {
  /** @type {ValidatorFunction} */
  const validator = (tr, analysis) => {
    const listItems = analysis.listItem || [];

    const ruleResults = [
      ensureListItemHasNumIdAndLevel(listItems, editor, tr, logger),
      ensureNumIdHasDefinition(listItems, editor, tr, logger),
    ];

    const modified = ruleResults.some((r) => r.modified);
    const results = ruleResults.flatMap((r) => r.results);
    return { modified, results };
  };

  // Only list items carry numbering attrs in this schema
  validator.requiredElements = {
    nodes: ['listItem'],
  };

  return validator;
}
