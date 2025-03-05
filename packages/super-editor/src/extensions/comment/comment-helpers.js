/**
 * Remove comment by id
 * 
 * @param {Object} param0 
 * @param {string} param0.commentId The comment ID
 * @param {string} param0.importedId The imported ID
 * @param {Object} param0.state The current state
 * @param {Object} param0.tr The current transaction
 * @param {Function} param0.dispatch The dispatch function
 * @returns {void}
 */
export const removeCommentsById = ({ commentId, importedId, state, tr, dispatch }) => {
  const positions = getCommentPositionsById(commentId, importedId, state.doc);
  if (positions.length) {
    positions.reverse().forEach(({ from, to }) => {
      tr.delete(from, to);
    }
    );
    dispatch(tr);
  }
};


/**
 * Get the positions of a comment by ID
 * 
 * @param {String} commentId The comment ID
 * @param {String} importedId The imported ID
 * @param {Object} doc The prosemirror document
 * @returns {Array} The positions of the comment
 */
export const getCommentPositionsById = (commentId, importedId, doc) => {
  const positions = [];
  doc.descendants((node, pos) => {
    const commentNodes = ['commentRangeStart', 'commentRangeEnd'];
    if (!commentNodes.includes(node.type.name)) return;

    const wid = node.attrs['w:id'];
    if (wid == commentId || wid == importedId) {
      positions.push({ from: pos, to: pos + node.nodeSize });
    }
  });
  return positions;
};
