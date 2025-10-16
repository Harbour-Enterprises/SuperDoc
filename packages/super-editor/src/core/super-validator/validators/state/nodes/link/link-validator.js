// @ts-check
import { ensureValidLinkRID } from './rules/index.js';

/**
 * @typedef {import('prosemirror-state').Transaction} Transaction
 * @typedef {import('../../../../types.js').ValidatorLogger} ValidatorLogger
 * @typedef {import('../../../../types.js').Editor} Editor
 * @typedef {import('../../../../types.js').ValidatorFunction} ValidatorFunction
 * @typedef {import('../../../../types.js').ElementInfo} ElementInfo
 */

/**
 * Link mark validations
 *
 * 1. Ensure that every link mark has a valid rId attribute.
 *
 * @param {{ editor: Editor, logger: ValidatorLogger }} ctx
 * @returns {ValidatorFunction}
 */
export function createLinkMarkValidator({ editor, logger }) {
  /** @type {ValidatorFunction} */
  const validator = (tr, analysis, context = {}) => {
    const links = analysis.link || [];
    const relationshipCache = context.relationshipCache;

    const ruleResults = [ensureValidLinkRID(links, editor, tr, logger, relationshipCache)];

    const modified = ruleResults.some((r) => r.modified);
    const results = ruleResults.flatMap((r) => r.results);

    return { modified, results };
  };

  // Define the required elements for this validator
  validator.requiredElements = {
    marks: ['link'],
  };

  return validator;
}
