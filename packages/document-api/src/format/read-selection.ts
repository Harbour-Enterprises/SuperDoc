/**
 * `format.readSelection`: inline formatting summary across a selection.
 *
 * Reports, per requested `format.apply` key, whether the selection's value is
 * uniform, mixed, unset (direct view only) or unresolvable. Uniform values use
 * the exact shape `format.apply` accepts. A property is unresolvable when the
 * writer cannot preserve its meaning, including theme-dependent colors and
 * an explicit highlight suppression that would otherwise become inheritance.
 * Writing direct-view values back leaves the formatting unchanged; writing effective-view values back keeps the
 * effective formatting but may add direct formatting the run did not have.
 */
import type { SelectionTarget } from '../types/address.js';
import type { StoryLocator } from '../types/story.types.js';
import { DocumentApiValidationError } from '../errors.js';
import { assertNoUnknownFields } from '../validation-primitives.js';
import { isRecord } from '../object-guards.js';
import { isSelectionTarget } from '../validation/selection-target-validator.js';
import { validateStoryLocator } from '../validation/story-validator.js';
import type { InlineRunPatch, InlineRunPatchKey } from './inline-run-patch.js';
import { INLINE_PROPERTY_KEY_SET, INLINE_PROPERTY_REGISTRY } from './inline-run-patch.js';

/** `effective` resolves the style cascade; `direct` reads only run-level `w:rPr`. */
export type InlineReadView = 'effective' | 'direct';

/** Per-slot state for object-valued keys (`rFonts`, `lang`, `underline`, ...). */
export type InlineReadSlotState =
  | { state: 'uniform'; value: unknown }
  | { state: 'mixed' }
  | { state: 'unset' }
  | { state: 'unresolvable'; reason: string };

/** Read state for one inline key across the selection. */
export type InlineReadState<K extends InlineRunPatchKey = InlineRunPatchKey> =
  | { state: 'uniform'; value: InlineRunPatch[K] }
  /** `slots` is present only for object-valued keys whose slots disagree. */
  | { state: 'mixed'; slots?: Record<string, InlineReadSlotState> }
  /** Direct view only: no selected run sets the key directly. */
  | { state: 'unset' }
  | { state: 'unresolvable'; reason: string };

/**
 * Input payload for `format.readSelection`.
 *
 * Provide exactly one locator: `target`, `ref`, or `selection: 'current'` (the
 * live editor selection, including pending caret formatting).
 */
export interface FormatReadSelectionInput {
  target?: SelectionTarget;
  ref?: string;
  selection?: 'current';
  /** Keys to read; defaults to every `format.apply` key. */
  keys?: readonly InlineRunPatchKey[];
  /** Defaults to `effective`. */
  view?: InlineReadView;
  in?: StoryLocator;
}

/** Normalized adapter request: exactly one locator, explicit keys and view. */
export type FormatReadSelectionRequest = ({ target: SelectionTarget } | { ref: string } | { selection: 'current' }) & {
  keys: InlineRunPatchKey[];
  view: InlineReadView;
  in?: StoryLocator;
};

export interface FormatReadSelectionResult {
  /** True when the selection is a caret. */
  collapsed: boolean;
  /** True when pending caret formatting (toggled, not yet typed) was included. */
  pendingApplied?: boolean;
  /** Exactly the requested keys. */
  properties: { [K in InlineRunPatchKey]?: InlineReadState<K> };
}

export interface FormatReadSelectionAdapter {
  readSelection(request: FormatReadSelectionRequest): Promise<FormatReadSelectionResult>;
}

const ALLOWED_KEYS = new Set(['target', 'ref', 'selection', 'keys', 'view', 'in']);
const ALL_INLINE_KEYS = INLINE_PROPERTY_REGISTRY.map((entry) => entry.key) as InlineRunPatchKey[];

function normalizeLocator(input: Record<string, unknown>) {
  const provided = (['target', 'ref', 'selection'] as const).filter((field) => input[field] !== undefined);
  if (provided.length === 0) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      'format.readSelection input must provide one of "target", "ref" or "selection".',
      { fields: ['target', 'ref', 'selection'] },
    );
  }
  if (provided.length > 1) {
    throw new DocumentApiValidationError(
      'INVALID_INPUT',
      'format.readSelection input must provide only one of "target", "ref" or "selection".',
      { fields: provided },
    );
  }
  if (provided[0] === 'target') {
    if (!isSelectionTarget(input.target)) {
      throw new DocumentApiValidationError('INVALID_TARGET', 'target must be a SelectionTarget object.', {
        field: 'target',
        value: input.target,
      });
    }
    return { target: input.target };
  }
  if (provided[0] === 'ref') {
    if (typeof input.ref !== 'string' || input.ref === '') {
      throw new DocumentApiValidationError('INVALID_TARGET', 'ref must be a non-empty string.', {
        field: 'ref',
        value: input.ref,
      });
    }
    return { ref: input.ref };
  }
  if (input.selection !== 'current') {
    throw new DocumentApiValidationError('INVALID_INPUT', 'selection must be "current".', {
      field: 'selection',
      value: input.selection,
    });
  }
  return { selection: 'current' as const };
}

function normalizeKeys(keys: unknown): InlineRunPatchKey[] {
  if (keys === undefined) return [...ALL_INLINE_KEYS];
  if (!Array.isArray(keys)) {
    throw new DocumentApiValidationError('INVALID_INPUT', 'keys must be an array of inline property keys.', {
      field: 'keys',
    });
  }
  if (keys.length === 0) {
    throw new DocumentApiValidationError('INVALID_INPUT', 'keys must contain at least one inline property key.', {
      field: 'keys',
    });
  }
  const seen = new Set<string>();
  for (const key of keys) {
    if (typeof key !== 'string' || !INLINE_PROPERTY_KEY_SET.has(key as InlineRunPatchKey)) {
      throw new DocumentApiValidationError('INVALID_INPUT', `Unknown inline property key "${String(key)}" in keys.`, {
        field: 'keys',
        value: key,
      });
    }
    if (seen.has(key)) {
      throw new DocumentApiValidationError('INVALID_INPUT', `keys contains duplicate key "${key}".`, {
        field: 'keys',
        value: key,
      });
    }
    seen.add(key);
  }
  return [...keys] as InlineRunPatchKey[];
}

function validateRequest(input: unknown): FormatReadSelectionRequest {
  if (!isRecord(input)) {
    throw new DocumentApiValidationError('INVALID_INPUT', 'format.readSelection input must be a non-null object.');
  }
  assertNoUnknownFields(input, ALLOWED_KEYS, 'format.readSelection');
  validateStoryLocator(input.in, 'in');
  const locator = normalizeLocator(input);
  const view = input.view ?? 'effective';
  if (view !== 'effective' && view !== 'direct') {
    throw new DocumentApiValidationError('INVALID_INPUT', 'view must be "effective" or "direct".', {
      field: 'view',
      value: view,
    });
  }
  return {
    ...locator,
    keys: normalizeKeys(input.keys),
    view,
    ...(input.in ? { in: input.in as StoryLocator } : {}),
  } as FormatReadSelectionRequest;
}

/**
 * Executes `format.readSelection`. Validation failures reject before the
 * adapter is called.
 */
export async function executeFormatReadSelection(
  adapter: Partial<FormatReadSelectionAdapter> | undefined,
  input: FormatReadSelectionInput,
): Promise<FormatReadSelectionResult> {
  const request = validateRequest(input);
  const read = adapter?.readSelection;
  if (typeof read !== 'function') {
    throw new DocumentApiValidationError(
      'CAPABILITY_UNAVAILABLE',
      'format.readSelection is not available. The host engine has not provided an adapter for this capability.',
    );
  }
  return read.call(adapter, request);
}
