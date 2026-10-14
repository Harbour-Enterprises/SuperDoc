import type {
  DocumentApi,
  ContentControlsSetLockModeInput,
  ContentControlMutationResult,
} from '../../../packages/document-api/dist/index.js';

declare const doc: DocumentApi;
declare const input: ContentControlsSetLockModeInput;
const excluded: ContentControlMutationResult = doc.contentControls.setLockMode({ ...input, addToHistory: false });
const included: ContentControlMutationResult = doc.contentControls.setLockMode({ ...input, addToHistory: true });
const defaultHistory: ContentControlMutationResult = doc.contentControls.setLockMode(input);
// @ts-expect-error History policy is a boolean, not a truthy string.
doc.contentControls.setLockMode({ ...input, addToHistory: 'false' });
// @ts-expect-error The escape hatch belongs to lock operations, not arbitrary mutations.
doc.contentControls.replaceContent({ target: input.target, content: 'value', addToHistory: false });
void [excluded, included, defaultHistory];
