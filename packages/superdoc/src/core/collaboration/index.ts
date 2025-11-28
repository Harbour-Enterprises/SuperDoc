/**
 * Collaboration module exports
 * Provides functionality for real-time collaboration, permissions, and comment synchronization
 */

// Permissions
export { PERMISSIONS, isAllowed } from './permissions';
export type {
  Permission,
  Role,
  User,
  Comment,
  TrackedChange,
  PermissionResolverParams,
  PermissionResolver,
  PermissionContext,
} from './permissions';

// Collaboration provider
export { createProvider } from './collaboration';
export type { CollaborationConfig } from './collaboration';

// Comment synchronization
export { addYComment, updateYComment, deleteYComment, getCommentIndex } from './collaboration-comments';
export type { Comment as CommentData, CommentEvent } from './collaboration-comments';

// Collaboration helpers
export {
  initCollaborationComments,
  initSuperdocYdoc,
  makeDocumentsCollaborative,
  syncCommentsToClients,
} from './helpers';
