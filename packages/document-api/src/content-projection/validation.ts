import { DocumentApiValidationError } from '../errors.js';
import type { SDProjectionReadInput } from '../types/content-projection.js';
import { SD_PROJECTION_REVIEW_MODES } from '../types/content-projection.js';
import { isStoryLocator } from '../types/story.types.js';
import { assertNoUnknownFields, isBlockNodeAddress } from '../validation-primitives.js';
import { isRecord } from '../object-guards.js';
import { isSelectionTarget } from '../validation/selection-target-validator.js';

const REVIEW_MODES = new Set<string>(SD_PROJECTION_REVIEW_MODES);
const COORDINATE_SPACES = new Set(['visible', 'tracked']);

export function validateProjectionReadInput(
  input: unknown,
  operationName: string,
  allowedFields: ReadonlySet<string>,
): asserts input is SDProjectionReadInput {
  if (!isRecord(input)) {
    throw new DocumentApiValidationError('INVALID_INPUT', `${operationName} input must be a non-null object.`);
  }
  assertNoUnknownFields(input, allowedFields, operationName);
  if (input.in !== undefined && !isStoryLocator(input.in)) {
    throw new DocumentApiValidationError('INVALID_INPUT', `${operationName}.in must be a valid StoryLocator.`);
  }
  if (input.reviewMode !== undefined && (typeof input.reviewMode !== 'string' || !REVIEW_MODES.has(input.reviewMode))) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      `${operationName}.reviewMode must be "final", "original", or "redline".`,
    );
  }
  if (input.scope !== undefined) validateProjectionScope(input.scope, operationName);
}

export function validateOptionalBoolean(value: unknown, field: string, operationName: string): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new DocumentApiValidationError('INVALID_INPUT', `${operationName}.${field} must be a boolean when provided.`);
  }
}

function validateProjectionScope(value: unknown, operationName: string): void {
  if (isBlockNodeAddress(value) && value.nodeId.length > 0) return;
  if (!isSelectionTarget(value)) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      `${operationName}.scope must be a valid block address or SelectionTarget.`,
    );
  }
  if (value.coordinateSpace !== undefined && !COORDINATE_SPACES.has(value.coordinateSpace)) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      `${operationName}.scope.coordinateSpace must be "visible" or "tracked".`,
    );
  }
  const stories = [
    value.story,
    value.start.kind === 'text' ? value.start.story : value.start.node.story,
    value.end.kind === 'text' ? value.end.story : value.end.node.story,
  ];
  if (stories.some((story) => story !== undefined && !isStoryLocator(story))) {
    throw new DocumentApiValidationError('INVALID_INPUT', `${operationName}.scope contains an invalid StoryLocator.`);
  }
}
