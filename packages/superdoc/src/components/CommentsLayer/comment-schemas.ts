import type { Comment } from './types';

/**
 * Default conversation schema structure
 */
export interface ConversationSchema {
  /** Unique identifier for the conversation */
  conversationId: string | null;
  /** ID of the document the conversation belongs to */
  documentId: string | null;
  /** Email of the conversation creator */
  creatorEmail: string | null;
  /** Name of the conversation creator */
  creatorName: string | null;
  /** Array of comments in the conversation */
  comments: Comment[];
  /** Selection information for the conversation */
  selection: unknown | null;
}

/**
 * Default comment schema structure
 */
export interface CommentSchema {
  /** The comment data */
  comment: Comment | null;
  /** User information */
  user: {
    /** User's name */
    name: string | null;
    /** User's email */
    email: string | null;
  };
  /** Timestamp of the comment */
  timestamp: number | null;
}

/**
 * Default conversation object
 */
export const conversation: ConversationSchema = {
  conversationId: null,
  documentId: null,
  creatorEmail: null,
  creatorName: null,
  comments: [],
  selection: null,
};

/**
 * Default comment object
 */
export const comment: CommentSchema = {
  comment: null,
  user: {
    name: null,
    email: null,
  },
  timestamp: null,
};
