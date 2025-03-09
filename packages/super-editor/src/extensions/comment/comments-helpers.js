import { CommentMarkName } from './comments-constants.js';


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
 * @returns {void}
 */
export const prepareCommentsForExport = (doc, tr, schema) => {
  doc.descendants((node, pos) => {
    const { marks = [] } = node;
    const commentMark = marks.find(mark => mark.type.name === CommentMarkName);
    if (commentMark) {
      const { attrs } = commentMark;
      const { commentId, importedId, internal } = attrs;
  
      const commentStartNodeAttrs = {
        'w:id': commentId || importedId,
        internal,
      };

      const startNode = schema.nodes.commentRangeStart.create(commentStartNodeAttrs);
      const endNode = schema.nodes.commentRangeEnd.create(commentStartNodeAttrs);
  
      tr.insert(pos, startNode);
      tr.insert(pos + node.nodeSize + 1, endNode);
    }
  });
};

/**
 * Prepare comments for import by removing the commentRange nodes and replacing with marks
 * 
 * @param {import('prosemirror-model').Node} doc The prosemirror document
 * @param {import('prosemirror-state').Transaction} tr The preparation transaction
 * @param {import('prosemirror-model').Schema} schema The editor schema
 * @returns {void}
 */
export const prepareCommentsForImport = (doc, tr, schema) => {
  const toMark = [];
  const toDelete = [];
  doc.descendants((node, pos) => {
    const { type } = node;

    // If the node is a commentRangeStart, store the starting position. Will use it when we find the end
    if (type.name === 'commentRangeStart') {
      const startPos = {
        'w:id': node.attrs['w:id'],
        internal: node.attrs.internal,
        start: pos,
      }
      toMark.push(startPos);
      toDelete.push({ start: pos - 1, end: pos});
    }
    
    // Replace the comment range end with a mark
    else if (type.name === 'commentRangeEnd') {
      const itemToMark = toMark.find((p) => p['w:id'] === node.attrs['w:id']);
      if (!itemToMark) return;

      const { start } = itemToMark;
      const markAttrs = {
        importedId: itemToMark['w:id'],
        internal: itemToMark.internal
      };
      tr.addMark(start, pos + 1, schema.marks[CommentMarkName].create(markAttrs));
      toDelete.push({ start: pos, end: pos + 1 });
    }
    
    // Simply mark for deletion all commentReference nodes. They are already accounted for by the above
    else if (type.name === 'commentReference') {
      toDelete.push({ start: pos, end: pos + 1 });
    }
  });

  // Delete the comment nodes
  toDelete
  .sort((a, b) => b.end - a.end)
  .forEach((item) => {
    const { start, end } = item;
    tr.delete(end, end + 1);
    tr.delete(start, start + 1);
  });

};
