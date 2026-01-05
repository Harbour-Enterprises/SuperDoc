/**
 * Command type augmentations for comment operations.
 *
 * @module CommentCommands
 */

/** Options for insertComment command */
export type InsertCommentOptions = {
  /** Unique identifier for the comment */
  commentId?: string;
  /** Imported comment ID from external source */
  importedId?: string;
  /** Whether the comment is internal (not visible to external users) */
  isInternal?: boolean;
  /** Skip emitting the commentsUpdate event */
  skipEmit?: boolean;
  /** Comment body as HTML/text */
  text?: string;
  /** Explicit comment body (preferred over text when provided) */
  commentText?: string;
  /** Comment creator name */
  creatorName?: string;
  /** Comment creator email */
  creatorEmail?: string;
  /** Comment creator image URL */
  creatorImage?: string;
  /** Comment creation timestamp (ms) */
  createdTime?: number;
  /** Document/file ID */
  fileId?: string;
  /** Document ID (alias of fileId) */
  documentId?: string;
  /** Allow extra metadata fields */
  [key: string]: unknown;
};

/** Options for removeComment command */
export type RemoveCommentOptions = {
  /** The comment ID to remove */
  commentId?: string;
  /** The imported comment ID to remove */
  importedId?: string;
};

/** Options for setActiveComment command */
export type SetActiveCommentOptions = {
  /** The comment ID to set as active */
  commentId: string;
};

/** Options for setCommentInternal command */
export type SetCommentInternalOptions = {
  /** The comment ID to update */
  commentId: string;
  /** Whether the comment should be internal */
  isInternal: boolean;
};

/** Options for resolveComment command */
export type ResolveCommentOptions = {
  /** The comment ID to resolve */
  commentId: string;
};

export interface CommentCommands {
  /**
   * Insert a comment at the current selection
   * @param options - Comment creation options
   * @example
   * // Insert a comment with auto-generated ID
   * editor.commands.insertComment()
   *
   * // Insert with specific options
   * editor.commands.insertComment({
   *   commentId: 'comment-123',
   *   isInternal: true,
   *   text: '<p>Review this section</p>'
   * })
   */
  insertComment: (options?: InsertCommentOptions) => boolean;

  /**
   * Remove a comment by its ID
   * @param options - Object containing commentId or importedId
   * @example
   * editor.commands.removeComment({ commentId: 'comment-123' })
   * editor.commands.removeComment({ importedId: 'imported-456' })
   */
  removeComment: (options: RemoveCommentOptions) => boolean;

  /**
   * Set the active comment (highlight and focus)
   * @param options - Object containing commentId
   * @example
   * editor.commands.setActiveComment({ commentId: 'comment-123' })
   */
  setActiveComment: (options: SetActiveCommentOptions) => boolean;

  /**
   * Set whether a comment is internal (not visible to external users)
   * @param options - Object containing commentId and isInternal flag
   * @example
   * editor.commands.setCommentInternal({ commentId: 'comment-123', isInternal: true })
   */
  setCommentInternal: (options: SetCommentInternalOptions) => boolean;

  /**
   * Resolve a comment
   * @param options - Object containing commentId
   * @example
   * editor.commands.resolveComment({ commentId: 'comment-123' })
   */
  resolveComment: (options: ResolveCommentOptions) => boolean;

  /**
   * Set cursor position to a comment by ID
   * @param id - The comment ID to navigate to
   * @example
   * editor.commands.setCursorById('comment-123')
   */
  setCursorById: (id: string) => boolean;
}

declare module '../../core/types/ChainedCommands.js' {
  interface ExtensionCommandMap extends CommentCommands {}
}
