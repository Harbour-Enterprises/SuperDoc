import { CLEAR_INLINE_FORMATTING_KEYS, type InlineRunPatch, type InlineRunPatchKey } from '@superdoc/document-api';

const keys: readonly InlineRunPatchKey[] = CLEAR_INLINE_FORMATTING_KEYS;
const patch: InlineRunPatch = Object.fromEntries(keys.map((key) => [key, null]));

// @ts-expect-error The shared policy cannot be extended by consumers.
CLEAR_INLINE_FORMATTING_KEYS.push('lang');

void patch;
