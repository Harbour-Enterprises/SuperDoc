import { v4 as uuidv4 } from 'uuid';
import { defaultNodeListHandler } from './docxImporter';

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
export function importCommentData({ docx, editor, converter }) {
  const nodeListHandler = defaultNodeListHandler();
  const comments = docx['word/comments.xml'];
  if (!comments) return;

  const { elements } = comments;
  if (!elements || !elements.length) return;

  const { elements: allComments = [] } = elements[0];
  const extractedComments = allComments.map((el) => {
    const { attributes } = el;
    const importedId = attributes['w:id'];
    const authorName = attributes['w:author'];
    const authorEmail = attributes['w:email'];
    const initials = attributes['w:initials'];
    const createdDate = attributes['w:date'];
    const internalId = attributes['custom:internalId'];
    const trackedChange = attributes['custom:trackedChange'] === 'true';
    const trackedChangeType = attributes['custom:trackedChangeType'];
    const trackedChangeText =
      attributes['custom:trackedChangeText'] !== 'null' ? attributes['custom:trackedChangeText'] : null;
    const trackedDeletedText =
      attributes['custom:trackedDeletedText'] !== 'null' ? attributes['custom:trackedDeletedText'] : null;

    const date = new Date(createdDate);
    const unixTimestampMs = date.getTime();

    const parsedElements = nodeListHandler.handler({
      nodes: el.elements,
      nodeListHandler,
      docx,
      editor,
      converter,
      path: [el],
    });

    const { attrs } = parsedElements[0];
    const paraId = attrs['w14:paraId'];

    return {
      commentId: internalId || uuidv4(),
      importedId,
      creatorName: authorName,
      creatorEmail: authorEmail,
      createdTime: unixTimestampMs,
      textJson: parsedElements[0],
      elements: parsedElements,
      initials,
      paraId,
      trackedChange,
      trackedChangeText,
      trackedChangeType,
      trackedDeletedText,
      isDone: false,
    };
  });

  const extendedComments = generateCommentsWithExtendedData({ docx, comments: extractedComments });
  return extendedComments;
}

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
  if (!comments?.length) return [];

  const commentsExtended = docx['word/commentsExtended.xml'];

  if (!commentsExtended) {
    // Google Docs uses nested comment ranges in document.xml to indicate threading
    // A child comment's range is nested inside the parent comment's range
    const commentRanges = extractCommentRangesFromDocument(docx);

    // Detect threading based on nested ranges
    const commentsWithThreading = detectThreadingFromRanges(comments, commentRanges);

    return commentsWithThreading.map((comment) => ({ ...comment, isDone: comment.isDone ?? false }));
  }

  const { elements: initialElements = [] } = commentsExtended;
  if (!initialElements?.length) return comments.map((comment) => ({ ...comment, isDone: comment.isDone ?? false }));

  const { elements = [] } = initialElements[0] ?? {};

  const commentEx = elements.filter((el) => el.name === 'w15:commentEx');

  return comments.map((comment) => {
    const extendedDef = commentEx.find((ce) => {
      // Check if any of the comment's elements are included in the extended comment's elements
      // Comments might have multiple elements, so we need to check if any of them are included in the extended comments
      const isIncludedInCommentElements = comment.elements?.some(
        (el) => el.attrs?.['w14:paraId'] === ce.attributes['w15:paraId'],
      );
      return isIncludedInCommentElements;
    });
    if (!extendedDef) return { ...comment, isDone: comment.isDone ?? false };

    const { isDone, paraIdParent } = getExtendedDetails(extendedDef);

    let parentComment;
    if (paraIdParent) parentComment = comments.find((c) => c.paraId === paraIdParent);

    const newComment = {
      ...comment,
      isDone: isDone ?? false,
      parentCommentId: parentComment?.commentId,
    };
    return newComment;
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
};

/**
 * Extract comment range order from document.xml
 * Google Docs uses nested comment ranges to indicate threading:
 * If comment B's range starts after comment A's range starts but before A's range ends,
 * then B is a child of A
 *
 * @param {Object} docx The parsed docx object
 * @returns {Array} Array of comment range events in order
 */
const extractCommentRangesFromDocument = (docx) => {
  const documentXml = docx['word/document.xml'];
  if (!documentXml) {
    return [];
  }

  const pendingComments = [];

  /**
   * Recursively walk through the document structure to find comment ranges
   * @param {Array} elements The XML elements to traverse
   */
  const walkElements = (elements) => {
    if (!elements || !Array.isArray(elements)) return;

    elements.forEach((element) => {
      if (element.name === 'w:commentRangeStart') {
        const commentId = element.attributes?.['w:id'];
        if (commentId !== undefined) {
          pendingComments.push({
            type: 'start',
            commentId: String(commentId),
          });
        }
      } else if (element.name === 'w:commentRangeEnd') {
        const commentId = element.attributes?.['w:id'];
        if (commentId !== undefined) {
          pendingComments.push({
            type: 'end',
            commentId: String(commentId),
          });
        }
      }

      // Recursively process child elements
      if (element.elements && Array.isArray(element.elements)) {
        walkElements(element.elements);
      }
    });
  };

  if (documentXml.elements && documentXml.elements.length > 0) {
    const body = documentXml.elements[0];
    if (body.elements) {
      walkElements(body.elements);
    }
  }

  return pendingComments;
};

/**
 * Detect threading relationships based on nested comment ranges
 * In Google Docs, a child comment's range is nested inside the parent's range.
 * We track the order of commentRangeStart/End events to detect nesting.
 *
 * @param {Array} comments Array of comment objects
 * @param {Array} rangeEvents Array of comment range events (start/end) in document order
 * @returns {Array} Comments with parentCommentId relationships established
 */
const detectThreadingFromRanges = (comments, rangeEvents) => {
  if (!rangeEvents || rangeEvents.length === 0) {
    return comments;
  }

  // Build a stack to track which comment ranges are currently open
  // When we see a start event, push it onto the stack
  // When we see an end event, pop until we find the matching start
  // Comments that start while another comment is on the stack are children of that comment
  const openRanges = [];
  const parentMap = new Map();

  rangeEvents.forEach((event) => {
    if (event.type === 'start') {
      // If there's an open range on the stack, the new comment is a child of it
      if (openRanges.length > 0) {
        const parentCommentId = openRanges[openRanges.length - 1];
        parentMap.set(event.commentId, parentCommentId);
      }
      openRanges.push(event.commentId);
    } else if (event.type === 'end') {
      const index = openRanges.lastIndexOf(event.commentId);
      if (index !== -1) {
        openRanges.splice(index, 1);
      }
    }
  });

  // Apply parent relationships to comments
  return comments.map((comment) => {
    const parentCommentId = parentMap.get(comment.importedId);
    if (parentCommentId) {
      const parentComment = comments.find((c) => c.importedId === parentCommentId);
      if (parentComment) {
        return {
          ...comment,
          parentCommentId: parentComment.commentId,
        };
      }
    }
    return comment;
  });
};
