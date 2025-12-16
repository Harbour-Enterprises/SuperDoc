import { ensureValidLinkRID } from './rules/index.js';
import type { Transaction } from 'prosemirror-state';
import type { ValidatorLogger, ValidatorFunction, DocumentAnalysis } from '../../../../types.js';
import type { Editor } from '@core/Editor.js';

/**
 * Link mark validations
 *
 * 1. Ensure that every link mark has a valid rId attribute.
 */
export function createLinkMarkValidator({
  editor,
  logger,
}: {
  editor: Editor;
  logger: ValidatorLogger;
}): ValidatorFunction {
  const validator: ValidatorFunction = (tr: Transaction, analysis: DocumentAnalysis) => {
    const links = analysis.link || [];

    const ruleResults = [ensureValidLinkRID(links, editor, tr, logger)];

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
