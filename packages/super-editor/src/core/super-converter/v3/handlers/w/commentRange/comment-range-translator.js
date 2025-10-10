// @ts-check
import { NodeTranslator } from '@translator';
import { idAttrConfig } from './attributes/index.js';

/**
 * @type {import('@translator').XmlNodeName}
 * This will be either `commentRangeStart` or `commentRangeEnd` since we use the same translator for both.
 */
const XML_NODE_NAME = 'w:commentRange';
/**
 * @type {import('@translator').SuperDocNodeOrKeyName}
 * This will be either `commentRangeStart` or `commentRangeEnd` since we use the same translator for both.
 */
const SD_NODE_NAME = 'commentRange';

/**
 * Decode the commentRange(Start|End) node back into OOXML <w:commentRange(Start|End)>.
 * @param {import('@translator').SCDecoderConfig} params
 * @returns {import('@translator').SCDecoderResult}
 */
const decode = (params) => {
  const { node, comments, commentsExportType, exportedCommentDefs } = params;

  if (!node) return;
  if (!comments) return;
  if (exportedCommentDefs?.length === 0) return;
  if (commentsExportType === 'clean') return;

  const commentNodeId = node.attrs['w:id'];

  const originalComment = comments.find((comment) => {
    return comment.commentId == commentNodeId;
  });
  if (!originalComment) return;

  const parentCommentId = originalComment.parentCommentId;
  const parentComment = comments.find(
    ({ commentId, importedId }) => commentId === parentCommentId || importedId === parentCommentId,
  );
  const isInternal = parentComment?.isInternal || originalComment.isInternal;
  if (commentsExportType === 'external' && isInternal) return;

  const isResolved = !!originalComment.resolvedTime;
  if (isResolved) return;

  if (node.type !== 'commentRangeStart' && node.type !== 'commentRangeEnd') {
    return;
  }
  const { type } = node;
  const commentIndex = comments.findIndex((comment) => comment.commentId === originalComment.commentId);
  let commentSchema = getCommentSchema(type, commentIndex);

  if (type === 'commentRangeEnd') {
    const commentReference = {
      name: 'w:r',
      elements: [{ name: 'w:commentReference', attributes: { 'w:id': String(commentIndex) } }],
    };
    commentSchema = [commentSchema, commentReference];
  }

  return commentSchema;
};

/**
 * Generate a w:commentRangeStart or w:commentRangeEnd node
 *
 * @param {'commentRangeStart' | 'commentRangeEnd'} type Must be 'commentRangeStart' or 'commentRangeEnd'
 * @param {number} commentIndex The comment index
 * @returns {Object} The comment node
 */
const getCommentSchema = (type, commentIndex) => {
  return {
    name: `w:${type}`,
    attributes: {
      'w:id': String(commentIndex),
    },
  };
};

const getConfig = (type) => ({
  xmlName: `${XML_NODE_NAME}${type}`,
  sdNodeOrKeyName: `${SD_NODE_NAME}${type}`,
  type: NodeTranslator.translatorTypes.NODE,
  encode: () => {},
  decode,
  attributes: [idAttrConfig],
});

export const commentRangeStartTranslator = NodeTranslator.from(getConfig('Start'));
export const commentRangeEndTranslator = NodeTranslator.from(getConfig('End'));
