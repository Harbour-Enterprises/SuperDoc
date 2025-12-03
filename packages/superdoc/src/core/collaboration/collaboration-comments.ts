import { Map as YMap, Array as YArray, Doc as YDoc } from 'yjs';
import type { SuperDoc } from '../types/index';

/**
 * Comment object structure
 */
export interface Comment {
  commentId: string;
  [key: string]: unknown;
}

/**
 * Event object containing a comment
 */
export interface CommentEvent {
  comment: Comment;
}

/**
 * Get the index of a comment in the YArray
 *
 * @param yArray - The Yjs array containing comments
 * @param comment - The comment to find
 * @returns The index of the comment, or -1 if not found
 */
export const getCommentIndex = (yArray: YArray<YMap<unknown>>, comment: Comment): number => {
  const baseArray = yArray.toJSON();
  return baseArray.findIndex((c) => {
    // Type assertion needed because toJSON() returns unknown[]
    const commentData = c as { commentId?: string };
    return commentData.commentId === comment.commentId;
  });
};

/**
 * Add a new comment to the Yjs document
 *
 * @param yArray - The Yjs array to add the comment to
 * @param ydoc - The Yjs document
 * @param event - The event containing the comment data
 * @param superdoc - The SuperDoc instance for user context
 */
export const addYComment = (
  yArray: YArray<YMap<unknown>>,
  ydoc: YDoc,
  event: CommentEvent,
  superdoc: SuperDoc,
): void => {
  const { comment } = event;
  const yComment = new YMap(Object.entries(comment));

  ydoc.transact(
    () => {
      yArray.push([yComment]);
    },
    { user: superdoc.user },
  );
};

/**
 * Update an existing comment in the Yjs document
 *
 * @param yArray - The Yjs array containing the comment
 * @param ydoc - The Yjs document
 * @param event - The event containing the updated comment data
 * @param superdoc - The SuperDoc instance for user context
 */
export const updateYComment = (
  yArray: YArray<YMap<unknown>>,
  ydoc: YDoc,
  event: CommentEvent,
  superdoc: SuperDoc,
): void => {
  const { comment } = event;
  const yComment = new YMap(Object.entries(comment));
  const commentIndex = getCommentIndex(yArray, comment);
  if (commentIndex === -1) return;

  ydoc.transact(
    () => {
      yArray.delete(commentIndex, 1);
      yArray.insert(commentIndex, [yComment]);
    },
    { user: superdoc.user },
  );
};

/**
 * Delete a comment from the Yjs document
 *
 * @param yArray - The Yjs array containing the comment
 * @param ydoc - The Yjs document
 * @param event - The event containing the comment to delete
 * @param superdoc - The SuperDoc instance for user context
 */
export const deleteYComment = (
  yArray: YArray<YMap<unknown>>,
  ydoc: YDoc,
  event: CommentEvent,
  superdoc: SuperDoc,
): void => {
  const { comment } = event;
  const commentIndex = getCommentIndex(yArray, comment);
  if (commentIndex === -1) return;

  ydoc.transact(
    () => {
      yArray.delete(commentIndex, 1);
    },
    { user: superdoc.user },
  );
};
