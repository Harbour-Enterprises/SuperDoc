import { CommentMarkName } from './comments-constants.js';
import { CommentsPluginKey } from './comments-plugin.js';
import { ensureFallbackComment, resolveCommentMeta } from './comment-import-helpers.js';

/**
 * Remove comment by id
 *
 * @param {Object} param0
 * @param {string} param0.commentId The comment ID
 * @param {import('prosemirror-state').EditorState} state The current editor state
 * @param {import('prosemirror-state').Transaction} tr The current transaction
 * @param {Function} param0.dispatch The dispatch function
 * @returns {void}
 */
export const removeCommentsById = ({ commentId, state, tr, dispatch }) => {
  const positions = getCommentPositionsById(commentId, state.doc);

  // Remove the mark
  positions.forEach(({ from, to }) => {
    tr.removeMark(from, to, state.schema.marks[CommentMarkName]);
  });
  dispatch(tr);
};

/**
 * Get the positions of a comment by ID
 *
 * @param {String} commentId The comment ID
 * @param {import('prosemirror-model').Node} doc The prosemirror document
 * @returns {Array} The positions of the comment
 */
export const getCommentPositionsById = (commentId, doc) => {
  const positions = [];
  doc.descendants((node, pos) => {
    const { marks } = node;
    const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);

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
 * Prepare comments for export by converting the marks back to commentRange nodes
 *
 * @param {import('prosemirror-model').Node} doc The prosemirror document
 * @param {import('prosemirror-state').Transaction} tr The preparation transaction
 * @param {import('prosemirror-model').Schema} schema The editor schema
 * @param {Array[Object]} comments The comments to prepare
 * @returns {void}
 */
export const prepareCommentsForExport = (doc, tr, schema, comments = []) => {
  // Collect a min..max range for every commentId (and children), then insert a
  // single start/end pair per id. This prevents fragmented highlights when marks
  // span multiple adjacent nodes.
  const ranges = new Map();

  const addRange = (id, from, to, attrs = {}) => {
    if (!id || id === 'pending') return;
    const existing = ranges.get(id);
    if (existing) {
      existing.from = Math.min(existing.from, from);
      existing.to = Math.max(existing.to, to);
      existing.attrs = { ...existing.attrs, ...attrs };
    } else {
      ranges.set(id, { from, to, attrs: { ...attrs } });
    }
  };

  doc.descendants((node, pos) => {
    const commentMarks = node.marks?.filter((mark) => mark.type.name === CommentMarkName);
    commentMarks.forEach((commentMark) => {
      if (!commentMark) return;
      const { attrs = {} } = commentMark;
      const { commentId } = attrs;
      const from = pos;
      const to = pos + node.nodeSize;

      addRange(commentId, from, to, attrs);

      // Also include child comments so they inherit the same span
      const childComments = comments
        .filter((c) => c.parentCommentId === commentId)
        .sort((a, b) => a.createdTime - b.createdTime);

      childComments.forEach((c) => {
        addRange(c.commentId, from, to, c);
      });
    });
  });

  const insertions = [];
  ranges.forEach((range, id) => {
    const attrs = getPreparedComment(range.attrs);
    // Preserve internal flag if present
    if (range.attrs.internal !== undefined) {
      attrs.internal = range.attrs.internal;
    }
    const startNode = schema.nodes.commentRangeStart.create(attrs);
    const endNode = schema.nodes.commentRangeEnd.create(attrs);
    insertions.push({ pos: range.from, node: startNode });
    insertions.push({ pos: range.to, node: endNode });
  });

  insertions
    .sort((a, b) => a.pos - b.pos)
    .forEach(({ pos, node }) => {
      const mappedPos = tr.mapping.map(pos);
      tr.insert(mappedPos, node);
    });

  return tr;
};

/**
 * Generate the prepared comment attrs for export
 *
 * @param {Object} attrs The comment mark attributes
 * @returns {Object} The prepared comment attributes
 */
export const getPreparedComment = (attrs) => {
  const { commentId, internal } = attrs;
  return {
    'w:id': commentId,
    internal: internal,
  };
};

/**
 * Prepare comments for import by removing the commentRange nodes and replacing with marks
 *
 * @param {import('prosemirror-model').Node} doc The prosemirror document
 * @param {import('prosemirror-state').Transaction} tr The preparation transaction
 * @param {import('prosemirror-model').Schema} schema The editor schema
 * @returns {void}
 */
export const prepareCommentsForImport = (doc, tr, schema, converter) => {
  const toMark = [];
  const toDelete = [];

  doc.descendants((node, pos) => {
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
        commentId: resolvedCommentId,
        importedId,
        internal,
        start: pos,
      });

      ensureFallbackComment({
        converter,
        matchingImportedComment,
        commentId: resolvedCommentId,
        importedId,
      });

      // We'll remove this node from the final doc
      toDelete.push({ start: pos, end: pos + 1 });
    }

    // When we reach the commentRangeEnd, add a mark spanning from start to current pos,
    // then mark it for deletion as well.
    else if (type.name === 'commentRangeEnd') {
      const itemToMark = toMark.find((p) => p.importedId === importedId);
      if (!itemToMark) return; // No matching start? just skip

      const { start } = itemToMark;
      const markAttrs = {
        commentId: itemToMark.commentId,
        importedId,
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
 * a suggester made
 *
 * @param {Object} attrs The tracked change node attributes. Contains before/after lists
 * @returns {String} The human-readable format of the changes
 */
export const translateFormatChangesToEnglish = (attrs = {}) => {
  const { before = [], after = [] } = attrs;

  const beforeTypes = new Set(before.map((mark) => mark.type));
  const afterTypes = new Set(after.map((mark) => mark.type));

  const added = [...afterTypes].filter((type) => !beforeTypes.has(type));
  const removed = [...beforeTypes].filter((type) => !afterTypes.has(type));

  const messages = [];

  // Detect added formatting (excluding textStyle, handled separately)
  const nonTextStyleAdded = added.filter((type) => !['textStyle', 'commentMark'].includes(type));
  if (nonTextStyleAdded.length) {
    messages.push(`Added formatting: ${nonTextStyleAdded.join(', ')}`);
  }

  // Detect removed formatting (excluding textStyle, handled separately)
  const nonTextStyleRemoved = removed.filter((type) => !['textStyle', 'commentMark'].includes(type));
  if (nonTextStyleRemoved.length) {
    messages.push(`Removed formatting: ${nonTextStyleRemoved.join(', ')}`);
  }

  // Handling textStyle changes separately
  const beforeTextStyle = before.find((mark) => mark.type === 'textStyle')?.attrs || {};
  const afterTextStyle = after.find((mark) => mark.type === 'textStyle')?.attrs || {};

  const textStyleChanges = [];

  // Function to convert camelCase to human-readable format
  const formatAttrName = (attr) => attr.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

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
 * Get the highlight color for a comment or tracked changes node
 *
 * @param {Object} param0
 * @param {String} param0.activeThreadId The active comment ID
 * @param {String} param0.threadId The current thread ID
 * @param {Boolean} param0.isInternal Whether the comment is internal or external
 * @param {EditorView} param0.editor The current editor view
 * @returns {String} The color to use for the highlight
 */
export const getHighlightColor = ({ activeThreadId, threadId, isInternal, editor }) => {
  if (!editor.options.isInternal && isInternal) return 'transparent';
  const pluginState = CommentsPluginKey.getState(editor.state);
  const color = isInternal ? pluginState.internalColor : pluginState.externalColor;
  const alpha = activeThreadId == threadId ? '44' : '22';
  return `${color}${alpha}`;
};
