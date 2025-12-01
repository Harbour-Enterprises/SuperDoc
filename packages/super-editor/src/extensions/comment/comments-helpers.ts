import { CommentMarkName } from './comments-constants.js';
import { CommentsPluginKey } from './comments-plugin.js';
import { ensureFallbackComment, resolveCommentMeta, type Converter } from './comment-import-helpers.js';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { Node as PmNode, Schema, Mark as PmMark } from 'prosemirror-model';
import type { Editor } from '@core/Editor.js';

/**
 * Remove comment by id.
 */
export const removeCommentsById = ({
  commentId,
  importedId,
  state,
  tr,
  dispatch,
}: {
  commentId?: string;
  importedId?: string;
  state: EditorState;
  tr: Transaction;
  dispatch?: (tr: Transaction) => void;
}) => {
  const targetId = commentId || importedId;
  if (!targetId) return;

  const positions = getCommentPositionsById(targetId, state.doc);

  // Remove the mark
  positions.forEach(({ from, to }) => {
    tr.removeMark(from, to, state.schema.marks[CommentMarkName]);
  });
  dispatch?.(tr);
};

/**
 * Get the positions of a comment by ID.
 */
export const getCommentPositionsById = (commentId: string, doc: PmNode): Array<{ from: number; to: number }> => {
  const positions: Array<{ from: number; to: number }> = [];
  doc.descendants((node: PmNode, pos: number) => {
    const { marks } = node;
    const commentMark = marks.find((mark: PmMark) => mark.type.name === CommentMarkName);

    if (commentMark) {
      const { attrs } = commentMark;
      const { commentId: currentCommentId } = attrs;
      if (commentId === currentCommentId) {
        positions.push({ from: pos, to: pos + node.nodeSize });
      }
    }
  });
  return positions;
};

/**
 * Prepare comments for export by converting the marks back to commentRange nodes.
 */
export const prepareCommentsForExport = (
  doc: PmNode,
  tr: Transaction,
  schema: Schema,
  comments: Array<{
    commentId: string | number;
    parentCommentId?: string | number | null;
    createdTime?: number | string | null;
  }> = [],
) => {
  // Collect all pending insertions in an array
  const startNodes: Array<{ pos: number; node: PmNode }> = [];
  const endNodes: Array<{ pos: number; node: PmNode }> = [];
  const seen = new Set<string>();

  doc.descendants((node: PmNode, pos: number) => {
    const commentMarks = node.marks?.filter((mark) => mark.type.name === CommentMarkName);
    commentMarks.forEach((commentMark) => {
      if (commentMark) {
        const { attrs = {} } = commentMark;
        const { commentId } = attrs as { commentId?: string | number };

        const commentKey = commentId != null ? String(commentId) : 'pending';
        if (commentKey === 'pending') return;
        if (seen.has(commentKey)) return;
        seen.add(commentKey);

        const commentStartNodeAttrs = getPreparedComment(commentMark.attrs);
        const startNode = schema.nodes.commentRangeStart.create(commentStartNodeAttrs);
        startNodes.push({
          pos,
          node: startNode,
        });

        const endNode = schema.nodes.commentRangeEnd.create(commentStartNodeAttrs);
        endNodes.push({
          pos: pos + node.nodeSize,
          node: endNode,
        });

        const parentId = commentKey;
        if (parentId) {
          const childComments = comments
            .filter((c) => String(c.parentCommentId) === parentId)
            .sort((a, b) => Number(a.createdTime ?? 0) - Number(b.createdTime ?? 0));

          childComments.forEach((c) => {
            const childMark = getPreparedComment(c);
            const childStartNode = schema.nodes.commentRangeStart.create(childMark);
            seen.add(String(c.commentId));
            startNodes.push({
              pos: pos,
              node: childStartNode,
            });

            const childEndNode = schema.nodes.commentRangeEnd.create(childMark);
            endNodes.push({
              pos: pos + node.nodeSize,
              node: childEndNode,
            });
          });
        }
      }
    });
  });

  startNodes.forEach((n) => {
    const { pos, node } = n;
    const mappedPos = tr.mapping.map(pos);

    tr.insert(mappedPos, node);
  });

  endNodes.forEach((n) => {
    const { pos, node } = n;
    const mappedPos = tr.mapping.map(pos);

    tr.insert(mappedPos, node);
  });

  return tr;
};

/**
 * Generate the prepared comment attrs for export.
 */
export const getPreparedComment = (attrs: { commentId?: string | number; internal?: boolean | null }) => {
  const { commentId, internal } = attrs;
  return {
    'w:id': commentId != null ? String(commentId) : '',
    internal: internal,
  };
};

/**
 * Prepare comments for import by removing the commentRange nodes and replacing with marks.
 */
export const prepareCommentsForImport = (doc: PmNode, tr: Transaction, schema: Schema, converter?: Converter) => {
  const toMark: Array<{ commentId: string; importedId: string; internal?: boolean; start: number }> = [];
  const toDelete: Array<{ start: number; end: number }> = [];

  doc.descendants((node: PmNode, pos: number) => {
    const { type } = node;

    const commentNodes = ['commentRangeStart', 'commentRangeEnd', 'commentReference'];
    if (!commentNodes.includes(type.name)) return;

    const { resolvedCommentId, importedId, internal, matchingImportedComment } = resolveCommentMeta({
      converter,
      importedId: node.attrs['w:id'],
    });

    // If the node is a commentRangeStart, record it so we can place a mark once we find the end.
    if (type.name === 'commentRangeStart') {
      toMark.push({
        commentId: String(resolvedCommentId),
        importedId: String(importedId ?? resolvedCommentId),
        internal,
        start: pos,
      });

      ensureFallbackComment({
        converter,
        matchingImportedComment,
        commentId: String(resolvedCommentId),
        importedId,
      });

      // We'll remove this node from the final doc
      toDelete.push({ start: pos, end: pos + 1 });
    }

    // When we reach the commentRangeEnd, add a mark spanning from start to current pos,
    // then mark it for deletion as well.
    else if (type.name === 'commentRangeEnd') {
      const itemToMark = toMark.find((p) => p.importedId === String(importedId));
      if (!itemToMark) return; // No matching start? just skip

      const { start } = itemToMark;
      const markAttrs = {
        commentId: String(itemToMark.commentId),
        importedId: importedId != null ? String(importedId) : undefined,
        internal: itemToMark.internal,
      };

      tr.addMark(start, pos + 1, schema.marks[CommentMarkName].create(markAttrs));
      toDelete.push({ start: pos, end: pos + 1 });
    }

    // commentReference nodes likewise get deleted
    else if (type.name === 'commentReference') {
      toDelete.push({ start: pos, end: pos + 1 });
    }
  });

  // Sort descending so deletions don't mess up positions
  toDelete
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end }) => {
      tr.delete(start, end);
    });
};

/**
 * Translate a list of before/after marks into a human-readable format we can
 * display in tracked change comments. This tells us what formatting changes
 * a suggester made.
 */
interface MarkWithType {
  type: string;
  attrs?: Record<string, unknown>;
}

export const translateFormatChangesToEnglish = (attrs: Record<string, unknown> = {}): string => {
  const { before = [], after = [] } = attrs as { before?: MarkWithType[]; after?: MarkWithType[] };

  const beforeTypes = new Set(before.map((mark) => mark.type));
  const afterTypes = new Set(after.map((mark) => mark.type));

  const added = [...afterTypes].filter((type) => !beforeTypes.has(type));
  const removed = [...beforeTypes].filter((type) => !afterTypes.has(type));

  const messages: string[] = [];

  // Detect added formatting (excluding textStyle, handled separately)
  const nonTextStyleAdded = added.filter((type) => !['textStyle', 'commentMark'].includes(String(type)));
  if (nonTextStyleAdded.length) {
    messages.push(`Added formatting: ${nonTextStyleAdded.join(', ')}`);
  }

  // Detect removed formatting (excluding textStyle, handled separately)
  const nonTextStyleRemoved = removed.filter((type) => !['textStyle', 'commentMark'].includes(String(type)));
  if (nonTextStyleRemoved.length) {
    messages.push(`Removed formatting: ${nonTextStyleRemoved.join(', ')}`);
  }

  // Handling textStyle changes separately
  const beforeTextStyle = before.find((mark) => mark.type === 'textStyle')?.attrs || {};
  const afterTextStyle = after.find((mark) => mark.type === 'textStyle')?.attrs || {};

  const textStyleChanges: string[] = [];

  // Function to convert camelCase to human-readable format
  const formatAttrName = (attr: string) => attr.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

  Object.keys({ ...beforeTextStyle, ...afterTextStyle }).forEach((attr) => {
    const beforeValue = beforeTextStyle[attr];
    const afterValue = afterTextStyle[attr];

    if (beforeValue !== afterValue) {
      if (afterValue === null) {
        // Ignore attributes that are now null
        return;
      } else if (attr === 'color') {
        // Special case: Simplify color change message
        textStyleChanges.push(`Changed color`);
      } else {
        const label = formatAttrName(attr); // Convert camelCase to lowercase words
        if (beforeValue === undefined || beforeValue === null) {
          textStyleChanges.push(`Set ${label} to ${afterValue}`);
        } else {
          textStyleChanges.push(`Changed ${label} from ${beforeValue} to ${afterValue}`);
        }
      }
    }
  });

  if (textStyleChanges.length) {
    messages.push(`Modified text style: ${textStyleChanges.join(', ')}`);
  }

  return messages.length ? messages.join('. ') : 'No formatting changes.';
};

/**
 * Get the highlight color for a comment or tracked changes node.
 */
export const getHighlightColor = ({
  activeThreadId,
  threadId,
  isInternal,
  editor,
}: {
  activeThreadId?: string | null;
  threadId?: string | null;
  isInternal?: boolean;
  editor: Editor;
}) => {
  if (!editor) return 'transparent';
  if (!editor.options.isInternal && isInternal) return 'transparent';
  const pluginState = CommentsPluginKey.getState(editor.state);
  const color = isInternal ? pluginState?.internalColor : pluginState?.externalColor;
  const alpha = activeThreadId == threadId ? '44' : '22';
  return `${color || '#000000'}${alpha}`;
};
