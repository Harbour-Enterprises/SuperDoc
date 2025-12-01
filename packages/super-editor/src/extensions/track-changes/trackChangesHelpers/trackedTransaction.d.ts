import type { Transaction, EditorState } from 'prosemirror-state';
import type { User } from '@core/types/EditorConfig.js';

export interface TrackedTransactionParams {
  tr: Transaction;
  state: EditorState;
  user: User;
}

export function trackedTransaction(params: TrackedTransactionParams): Transaction;
