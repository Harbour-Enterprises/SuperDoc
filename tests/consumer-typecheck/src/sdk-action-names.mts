import type { ActionName } from '../../../packages/sdk/langs/node/dist/index.js';

const valid: ActionName = 'insert_paragraphs';
valid satisfies string;
// @ts-expect-error Unknown actions must remain outside the public literal union.
const invalid: ActionName = '__invalid_action__';
// @ts-expect-error Numeric keys must not become action names.
const numeric: ActionName = 42;
void invalid;
void numeric;
