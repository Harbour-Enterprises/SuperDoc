import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  importedId?: string | number;
  commentId: string;
  internal?: boolean;
  isInternal?: boolean;
  textJson?: unknown;
  creatorName?: string | null;
  creatorEmail?: string | null;
  createdTime?: string | null;
  isDone?: boolean;
}

export interface Converter {
  comments?: Comment[];
}

export const resolveCommentMeta = ({
  converter,
  importedId,
}: {
  converter?: Converter;
  importedId?: string | number;
}) => {
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

export const ensureFallbackComment = ({
  converter,
  matchingImportedComment,
  commentId,
  importedId,
}: {
  converter?: Converter;
  matchingImportedComment?: Comment;
  commentId: string;
  importedId?: string | number;
}) => {
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
