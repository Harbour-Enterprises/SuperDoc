import { ensureValidImageRID } from './rules/index.js';
import type { Transaction } from 'prosemirror-state';
import type { ValidatorLogger, ValidatorFunction, DocumentAnalysis } from '../../../../types.js';
import type { Editor } from '@core/Editor.js';

/**
 * Image node validations
 *
 * 1. Ensure that every image node has a valid rId attribute.
 */
export function createImageNodeValidator({
  editor,
  logger,
}: {
  editor: Editor;
  logger: ValidatorLogger;
}): ValidatorFunction {
  const validator: ValidatorFunction = (tr: Transaction, analysis: DocumentAnalysis) => {
    const images = analysis.image || [];

    const ruleResults = [ensureValidImageRID(images, editor, tr, logger)];

    const modified = ruleResults.some((r) => r.modified);
    const results = ruleResults.flatMap((r) => r.results);

    return { modified, results };
  };

  // Define the required elements for this validator
  validator.requiredElements = {
    nodes: ['image'],
  };

  return validator;
}
