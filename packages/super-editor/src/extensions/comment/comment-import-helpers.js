import { v4 as uuidv4 } from 'uuid';

export const resolveCommentMeta = ({ converter, importedId }) => {
  const comments = converter?.comments || [];
  const matchingImportedComment = comments.find((c) => c.importedId == importedId);

  const resolvedCommentId = matchingImportedComment?.commentId ?? (importedId ? String(importedId) : uuidv4());
  const internal = matchingImportedComment?.internal ?? matchingImportedComment?.isInternal ?? false;

  return {
    resolvedCommentId,
    importedId,
    internal,
    matchingImportedComment,
  };
};

export const ensureFallbackComment = ({ converter, matchingImportedComment, commentId, importedId }) => {
  if (matchingImportedComment || !converter) return;

  converter.comments = converter.comments || [];

  const alreadyExists = converter.comments.some((comment) => comment.commentId === commentId);
  if (alreadyExists) return;

  converter.comments.push({
    commentId,
    importedId,
    textJson: null,
    creatorName: null,
    creatorEmail: null,
    createdTime: null,
    isDone: false,
  });
};
