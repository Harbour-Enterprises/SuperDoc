import { CommentMarkName } from './comments-constants.js';
import { COMMENTS_XML_DEFINITIONS } from '@converter/exporter-docx-defs.js';


/**
 * Remove comment by id
 * 
 * @param {Object} param0 
 * @param {string} param0.commentId The comment ID
 * @param {string} param0.importedId The imported ID
 * @param {import('prosemirror-state').EditorState} state The current editor state
 * @param {import('prosemirror-state').Transaction} tr The current transaction
 * @param {Function} param0.dispatch The dispatch function
 * @returns {void}
 */
export const removeCommentsById = ({ commentId, importedId, state, tr, dispatch }) => {
  const positions = getCommentPositionsById(commentId, importedId, state.doc);
  
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
 * @param {String} importedId The imported ID
 * @param {import('prosemirror-model').Node} doc The prosemirror document
 * @returns {Array} The positions of the comment
 */
export const getCommentPositionsById = (commentId, importedId, doc) => {
  const positions = [];
  doc.descendants((node, pos) => {
    const { marks } = node;
    const commentMark = marks.find((mark) => mark.type.name === CommentMarkName);
  
    if (commentMark) {
      const { attrs } = commentMark;
      const { commentId: currentCommentId, importedId: currentImportedId } = attrs;
      const wid = currentCommentId || currentImportedId;
      if (wid == commentId || wid == importedId) {
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
  // Collect all pending insertions in an array
  const startNodes = [];
  const endNodes = [];
  const seen = new Set();

  doc.descendants((node, pos) => {
    const commentMarks = node.marks?.filter(mark => mark.type.name === CommentMarkName);
    commentMarks.forEach((commentMark) => {
      if (commentMark) {

        const { attrs = {} } = commentMark;
        const { commentId, importedId } = attrs;

        if (commentId === 'pending') return;
        if (seen.has(commentId || importedId)) return;
        seen.add(commentId || importedId);

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

        const parentId = commentId || importedId;
        if (parentId) {
          const childComments = comments
            .filter((c) => c.parentCommentId == parentId || c.parentCommentId == parentId)
            .sort((a, b) => a.createdTime - b.createdTime);

          childComments.forEach((c) => {
            const childMark =  getPreparedComment(c);
            const childStartNode = schema.nodes.commentRangeStart.create(childMark);
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
 * Generate the prepared comment attrs for export
 * 
 * @param {Object} attrs The comment mark attributes
 * @returns {Object} The prepared comment attributes
 */
export const getPreparedComment = (attrs) => {
  const { commentId, importedId, internal } = attrs;
  const wid = commentId ? commentId : importedId;
  return {
    'w:id': wid,
    internal: internal,
  };
}


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

    // If the node is a commentRangeStart, record it so we can place a mark once we find the end.
    if (type.name === 'commentRangeStart') {
      toMark.push({
        'w:id': node.attrs['w:id'],
        internal: false,
        start: pos,
      });
    
      // We'll remove this node from the final doc
      toDelete.push({ start: pos, end: pos + 1 });
    }

    // When we reach the commentRangeEnd, add a mark spanning from start to current pos,
    // then mark it for deletion as well.
    else if (type.name === 'commentRangeEnd') {
      const itemToMark = toMark.find((p) => p['w:id'] === node.attrs['w:id']);
      if (!itemToMark) return; // No matching start? just skip

      const { start } = itemToMark;
      const markAttrs = {
        importedId: node.attrs['w:id'],
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

  const beforeTypes = new Set(before.map(mark => mark.type));
  const afterTypes = new Set(after.map(mark => mark.type));

  const added = [...afterTypes].filter(type => !beforeTypes.has(type));
  const removed = [...beforeTypes].filter(type => !afterTypes.has(type));

  const messages = [];

  // Detect added formatting (excluding textStyle, handled separately)
  const nonTextStyleAdded = added.filter(type => !["textStyle", "commentMark"].includes(type));
  if (nonTextStyleAdded.length) {
    messages.push(`Added formatting: ${nonTextStyleAdded.join(', ')}`);
  }

  // Detect removed formatting (excluding textStyle, handled separately)
  const nonTextStyleRemoved = removed.filter(type => !["textStyle", "commentMark"].includes(type));
  if (nonTextStyleRemoved.length) {
    messages.push(`Removed formatting: ${nonTextStyleRemoved.join(', ')}`);
  }

  // Handling textStyle changes separately
  const beforeTextStyle = before.find(mark => mark.type === "textStyle")?.attrs || {};
  const afterTextStyle = after.find(mark => mark.type === "textStyle")?.attrs || {};

  const textStyleChanges = [];

  // Function to convert camelCase to human-readable format
  const formatAttrName = (attr) => attr.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

  Object.keys({ ...beforeTextStyle, ...afterTextStyle }).forEach(attr => {
    const beforeValue = beforeTextStyle[attr];
    const afterValue = afterTextStyle[attr];

    if (beforeValue !== afterValue) {
      if (afterValue === null) {
        // Ignore attributes that are now null
        return;
      } else if (attr === "color") {
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
