import { translateParagraphNode } from '../../exporter.js';
import { carbonCopy } from '../../../utilities/carbonCopy.js';
import { COMMENT_REF } from '../../exporter-docx-defs.js';

/**
 * Generate the end node for a comment
 * 
 * @param {Object} params The export params
 * @returns {Object} The translated w:commentRangeEnd node for the comment
 */
export function translateCommentNode(params, type) {
  const { node, commentsExportType, exportedCommentDefs = [] } = params;

  if (!exportedCommentDefs.length || commentsExportType === 'clean') return;
  
  const nodeId = node.attrs['w:id'];

  // Check if the comment is resolved
  const originalComment = params.comments.find((comment) => {
    return comment.commentId == nodeId || comment.importedId == nodeId;
  });
  const commentIndex = params.comments.findIndex((comment) => comment === originalComment);

  const isInternal = originalComment.isInternal;
  if (commentsExportType === 'external' && isInternal) return;

  const isResolved = !!originalComment.resolvedTime;
  if (isResolved) return;

  let commentSchema = getCommentSchema(type, commentIndex);
  if (type === 'End') {
    const commentReference = { name: 'w:commentReference', attributes: { 'w:id': String(commentIndex) } };
    commentSchema = [commentSchema, commentReference];
  };
  return commentSchema;
};

/**
 * Generate a w:commentRangeStart or w:commentRangeEnd node
 * 
 * @param {string} type Must be 'Start' or 'End'
 * @param {string} commentId The comment ID
 * @returns {Object} The comment node
 */
const getCommentSchema = (type, commentId) => {
  return {
    name: `w:commentRange${type}`,
    attributes: {
      'w:id': String(commentId),
    }
  };
};

/**
 * Generate the w:comment node for a comment
 * This is stored in comments.xml
 * 
 * @param {Object} comment The comment to export
 * @param {string} commentId The index of the comment
 * @returns {Object} The w:comment node for the comment
 */
export const getCommentDefinition = (comment, commentId) => {
  const translatedText = translateParagraphNode({ node: comment.commentJSON });

  return {
    type: 'element',
    name: 'w:comment',
    attributes: {
      'w:id': String(commentId),
      'w:author': comment.creatorName,
      'w:email': comment.creatorEmail,
      'w:date': toIsoNoFractional(comment.createdTime),
      'w:initials': getInitials(comment.creatorName),
      'w:done': comment.resolvedTime ? '1' : '0',
    },
    elements: [translatedText],
  };
};

/**
 * Get the initials of a name
 * 
 * @param {string} name The name to get the initials of
 * @returns {string | null} The initials of the name
 */
export const getInitials = (name) => {
  if (!name) return null;

  const preparedText = name.replace('(imported)', '').trim();
  const initials = preparedText.split(' ').map((word) => word[0]).join('');
  return initials;
};

/**
 * Convert a unix date to an ISO string without milliseconds
 * 
 * @param {number} unixMillis The date to convert
 * @returns {string} The date as an ISO string without milliseconds
 */
export const toIsoNoFractional = (unixMillis) => {
  const date = new Date(unixMillis || Date.now());
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};


/**
 * Updates or creates the `word/comments.xml` entry in a docx file structure.
 *
 * @param {Object[]} commentDefs - An array of comment definition objects.
 * @param {Object} convertedXml - The entire XML object representing the docx file structure.
 * @returns {Object} - The updated portion of the comments XML structure.
 */
export const updateCommentsXml = (commentDefs = [], commentsXml) => {
  const newCommentsXml = carbonCopy(commentsXml);

  // Re-build the comment definitions
  commentDefs.forEach((commentDef) => {
    commentDef.elements[0].elements.unshift(COMMENT_REF);
  });

  newCommentsXml.elements[0].elements = commentDefs;
  return newCommentsXml;
};
