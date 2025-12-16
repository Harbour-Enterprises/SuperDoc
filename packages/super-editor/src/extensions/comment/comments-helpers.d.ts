import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { Transaction } from 'prosemirror-state';
import type { Converter } from './comment-import-helpers.js';

export interface CommentForExport {
  commentId: string | number;
  parentCommentId?: string | number | null;
  createdTime?: number | string | null;
}

export function prepareCommentsForExport(
  doc: PmNode,
  tr: Transaction,
  schema: Schema,
  comments?: CommentForExport[],
): Transaction;

export function prepareCommentsForImport(doc: PmNode, tr: Transaction, schema: Schema, converter?: Converter): void;
