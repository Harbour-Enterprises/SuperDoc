import { v4 as uuidv4 } from 'uuid';
import { defaultNodeListHandler } from "./docxImporter";

/**
 * Parse comments.xml into SuperDoc-ready comments
 * These will be available in converter.comments
 * 
 * @param {Object} param0 
 * @param {ParsedDocx} param0.docx The parsed docx object
 * @param {NodeListHandler} param0.nodeListHandler The node list handler
 * @param {SuperConverter} param0.converter The super converter instance
 * @param {Editor} param0.editor The editor instance
 * @returns {Array} The parsed comments
 */
export function importCommentData({ docx }) {
  const nodeListHandler = defaultNodeListHandler()
  const comments =  docx['word/comments.xml'];
  if (!comments) return;

  const { elements } = comments;
  if (!elements || !elements.length) return;

  const { elements: allComments } = elements[0];
  const extractedComments = allComments?.map((el) => {
    const { attributes } = el;
    const commentId = attributes['w:id'];
    const authorName = attributes['w:author'];
    const authorEmail = attributes['w:email'];
    const initials = attributes['w:initials'];
    const createdDate = attributes['w:date'];
    const date = new Date(createdDate);
    const unixTimestampMs = date.getTime();

    const { elements } = el;
    const commentData = elements[0];

    const { elements: commentElements } = commentData;
    const parsedComment = nodeListHandler.handler({
      nodes: el.elements, nodeListHandler, docx
    });

    const { attrs } = parsedComment[0];
    const paraId = attrs['w14:paraId'];

    return {
      id: uuidv4(),
      importedId: commentId,
      creatorName: authorName,
      creatorEmail: authorEmail,
      createdTime: unixTimestampMs,
      textJson: parsedComment[0],
      initials,
      paraId,
    };
  });

  const extendedComments = generateCommentsWithExtendedData({ docx, comments: extractedComments });
  return extendedComments;
};

/**
 * Import the commentsExtended.xml file to get the extended comment details
 * Note: This is where parent/child comment relationships are defined
 * 
 * @param {Object} param0 
 * @param {ParsedDocx} param0.docx The parsed docx object
 * @param {Array} param0.comments The comments to be extended
 * @returns {Array} The comments with extended details
 */
const generateCommentsWithExtendedData = ({ docx, comments }) => {
  const commentsExtended = docx['word/commentsExtended.xml'];
  if (!commentsExtended) return [];

  const { elements: initialElements } = commentsExtended;
  const { elements } = initialElements[0];

  const commentEx = elements.filter((el) => el.name === 'w15:commentEx');

  return comments.map((comment) => {
    const extendedDef = commentEx.find((ce) => ce.attributes['w15:paraId'] === comment.paraId);
    if (!extendedDef) return { ...comment };

    const { isDone, paraIdParent } = getExtendedDetails(extendedDef);

    let parentComment;
    if (paraIdParent) parentComment = comments.find((c) => c.paraId === paraIdParent);

    return {
      ...comment,
      isDone,
      parentCommentId: parentComment?.id,
    }
  });
};

/**
 * Extract the details from the commentExtended node
 * 
 * @param {Object} commentEx The commentExtended node
 * @returns {Object} Object contianing paraId, isDone and paraIdParent
 */
const getExtendedDetails = (commentEx) => {
  const { attributes } = commentEx;
  const paraId = attributes['w15:paraId'];
  const isDone = attributes['w15:done'] === '1' ? true : false;
  const paraIdParent = attributes['w15:paraIdParent'];
  return { paraId, isDone, paraIdParent };
}
