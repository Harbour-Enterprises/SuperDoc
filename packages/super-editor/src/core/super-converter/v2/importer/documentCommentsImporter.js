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

    const parsedComment = nodeListHandler.handler({
      nodes: el.elements,
      nodeListHandler,
      docx,
      editor,
      converter,
      path: [el],
    });

    const { attrs } = parsedComment[0];
    const paraId = attrs['w14:paraId'];

    return {
      commentId: internalId || uuidv4(),
      importedId,
      creatorName: authorName,
      creatorEmail: authorEmail,
      createdTime: unixTimestampMs,
      textJson: parsedComment[0],
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
    const rangeData = extractCommentRangesFromDocument(docx);
    const commentsWithThreading = detectThreadingFromRanges(comments, rangeData);
    return commentsWithThreading.map((comment) => ({ ...comment, isDone: comment.isDone ?? false }));
  }

  const { elements: initialElements = [] } = commentsExtended;
  if (!initialElements?.length) return comments.map((comment) => ({ ...comment, isDone: comment.isDone ?? false }));

  const { elements = [] } = initialElements[0] ?? {};

  const commentEx = elements.filter((el) => el.name === 'w15:commentEx');

  return comments.map((comment) => {
    const extendedDef = commentEx.find((ce) => ce.attributes['w15:paraId'] === comment.paraId);
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

const extractCommentRangesFromDocument = (docx) => {
  const documentXml = docx['word/document.xml'];
  if (!documentXml) {
    return { rangeEvents: [], rangePositions: new Map() };
  }

  const rangeEvents = [];
  const rangePositions = new Map();
  let positionIndex = 0;
  let lastElementWasCommentMarker = false;

  const walkElements = (elements) => {
    if (!elements || !Array.isArray(elements)) return;

    elements.forEach((element) => {
      const isCommentStart = element.name === 'w:commentRangeStart';
      const isCommentEnd = element.name === 'w:commentRangeEnd';

      if (isCommentStart) {
        const commentId = element.attributes?.['w:id'];
        if (commentId !== undefined) {
          const id = String(commentId);
          rangeEvents.push({
            type: 'start',
            commentId: id,
          });
          if (!rangePositions.has(id)) {
            rangePositions.set(id, { startIndex: positionIndex, endIndex: -1 });
          } else {
            rangePositions.get(id).startIndex = positionIndex;
          }
        }
        lastElementWasCommentMarker = true;
      } else if (isCommentEnd) {
        const commentId = element.attributes?.['w:id'];
        if (commentId !== undefined) {
          const id = String(commentId);
          rangeEvents.push({
            type: 'end',
            commentId: id,
          });
          if (!rangePositions.has(id)) {
            rangePositions.set(id, { startIndex: -1, endIndex: positionIndex });
          } else {
            rangePositions.get(id).endIndex = positionIndex;
          }
        }
        lastElementWasCommentMarker = true;
      } else {
        if (lastElementWasCommentMarker) {
          positionIndex++;
          lastElementWasCommentMarker = false;
        }

        if (element.elements && Array.isArray(element.elements)) {
          walkElements(element.elements);
        }
      }
    });
  };

  if (documentXml.elements && documentXml.elements.length > 0) {
    const body = documentXml.elements[0];
    if (body.elements) {
      walkElements(body.elements);
    }
  }

  return { rangeEvents, rangePositions };
};

const detectThreadingFromNestedRanges = (comments, rangeEvents, skipComments = new Set()) => {
  const openRanges = [];
  const parentMap = new Map();

  rangeEvents.forEach((event) => {
    if (event.type === 'start') {
      if (!skipComments.has(event.commentId) && openRanges.length > 0) {
        for (let i = openRanges.length - 1; i >= 0; i--) {
          if (!skipComments.has(openRanges[i])) {
            parentMap.set(event.commentId, openRanges[i]);
            break;
          }
        }
      }
      openRanges.push(event.commentId);
    } else if (event.type === 'end') {
      const index = openRanges.lastIndexOf(event.commentId);
      if (index !== -1) {
        openRanges.splice(index, 1);
      }
    }
  });

  return parentMap;
};

const detectThreadingFromSharedPosition = (comments, rangePositions) => {
  const parentMap = new Map();
  const commentsByStartPosition = new Map();

  comments.forEach((comment) => {
    const position = rangePositions.get(comment.importedId);
    if (position && position.startIndex >= 0) {
      const startKey = position.startIndex;
      if (!commentsByStartPosition.has(startKey)) {
        commentsByStartPosition.set(startKey, []);
      }
      commentsByStartPosition.get(startKey).push(comment);
    }
  });

  commentsByStartPosition.forEach((commentsAtPosition) => {
    if (commentsAtPosition.length <= 1) return;

    const sorted = [...commentsAtPosition].sort((a, b) => a.createdTime - b.createdTime);
    const parentComment = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      parentMap.set(sorted[i].importedId, parentComment.importedId);
    }
  });

  return parentMap;
};

const detectThreadingFromMissingRanges = (comments, rangePositions) => {
  const parentMap = new Map();
  const commentsWithRanges = [];
  const commentsWithoutRanges = [];

  comments.forEach((comment) => {
    const position = rangePositions.get(comment.importedId);
    if (position && position.startIndex >= 0) {
      commentsWithRanges.push(comment);
    } else {
      commentsWithoutRanges.push(comment);
    }
  });

  commentsWithoutRanges.forEach((comment) => {
    const potentialParents = commentsWithRanges
      .filter((c) => c.createdTime < comment.createdTime)
      .sort((a, b) => b.createdTime - a.createdTime);

    if (potentialParents.length > 0) {
      parentMap.set(comment.importedId, potentialParents[0].importedId);
    }
  });

  return parentMap;
};

const detectThreadingFromRanges = (comments, rangeData) => {
  const { rangeEvents, rangePositions } = Array.isArray(rangeData)
    ? { rangeEvents: rangeData, rangePositions: new Map() }
    : rangeData;

  if (!rangeEvents || rangeEvents.length === 0) {
    if (comments.length > 1) {
      const parentMap = detectThreadingFromMissingRanges(comments, rangePositions);
      return applyParentRelationships(comments, parentMap);
    }
    return comments;
  }

  const commentsWithSharedPosition = findCommentsWithSharedStartPosition(comments, rangePositions);
  const nestedParentMap = detectThreadingFromNestedRanges(comments, rangeEvents, commentsWithSharedPosition);
  const sharedPositionParentMap = detectThreadingFromSharedPosition(comments, rangePositions);
  const missingRangeParentMap = detectThreadingFromMissingRanges(comments, rangePositions);

  const mergedParentMap = new Map([...missingRangeParentMap, ...nestedParentMap, ...sharedPositionParentMap]);

  return applyParentRelationships(comments, mergedParentMap);
};

const findCommentsWithSharedStartPosition = (comments, rangePositions) => {
  const sharedPositionComments = new Set();
  const commentsByStartPosition = new Map();

  comments.forEach((comment) => {
    const position = rangePositions.get(comment.importedId);
    if (position && position.startIndex >= 0) {
      const startKey = position.startIndex;
      if (!commentsByStartPosition.has(startKey)) {
        commentsByStartPosition.set(startKey, []);
      }
      commentsByStartPosition.get(startKey).push(comment.importedId);
    }
  });

  commentsByStartPosition.forEach((commentIds) => {
    if (commentIds.length > 1) {
      commentIds.forEach((id) => sharedPositionComments.add(id));
    }
  });

  return sharedPositionComments;
};

const applyParentRelationships = (comments, parentMap) => {
  return comments.map((comment) => {
    const parentImportedId = parentMap.get(comment.importedId);
    if (parentImportedId) {
      const parentComment = comments.find((c) => c.importedId === parentImportedId);
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
