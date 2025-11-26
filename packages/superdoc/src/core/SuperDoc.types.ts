/**
 * Type definitions for SuperDoc class
 *
 * This module contains all type definitions specific to the SuperDoc class,
 * including event types, awareness state, and internal interfaces.
 */

import type { User, Document, Editor } from './types';

/**
 * Awareness state for a connected user in collaboration mode.
 * Represents the real-time presence information of a user.
 */
export interface AwarenessState {
  /** User information */
  user?: User;
  /** Client ID from Yjs */
  clientId?: number;
  /** Cursor position in the document */
  cursor?: { anchor: number; head: number } | null;
  /** Additional awareness fields (e.g., selection, name, color) */
  [key: string]: unknown;
}

/**
 * Comment update event data structure.
 * Contains information about comment changes for the 'comments-update' event.
 */
export interface CommentsUpdateData {
  /** Comment values */
  comment?: {
    commentId: string;
    fileId?: string;
    [key: string]: unknown;
  };
  /** Array of changes for update events */
  changes?: Array<{
    key: string;
    value?: unknown;
    previousValue?: unknown;
    commentId?: string;
    fileId?: string;
  }>;
}

/**
 * ProseMirror transaction (simplified interface).
 * Represents a transaction from the underlying ProseMirror editor.
 */
export interface PMTransaction {
  /** Transaction steps */
  steps: unknown[];
  /** Transaction metadata */
  meta: Record<string, unknown>;
}

/**
 * SuperDoc event map for EventEmitter type safety.
 * Defines all events emitted by SuperDoc with their payload types.
 *
 * Note: Events that reference `SuperDoc` use a generic type parameter to avoid
 * circular imports. The actual SuperDoc class passes itself when extending EventEmitter.
 *
 * @example
 * ```typescript
 * superdoc.on('ready', ({ superdoc }) => {
 *   console.log('SuperDoc is ready!');
 * });
 *
 * superdoc.on('comments-update', ({ type, data }) => {
 *   if (type === 'add') {
 *     console.log('New comment:', data.comment);
 *   }
 * });
 * ```
 */
export interface SuperDocEvents {
  /** Fired before an editor instance is created */
  editorBeforeCreate: [{ editor: Editor }];
  /** Fired after an editor instance is created */
  editorCreate: [{ editor: Editor }];
  /** Fired when an editor instance is destroyed */
  editorDestroy: [];
  /** Fired when SuperDoc is fully initialized and ready */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ready: [{ superdoc: any }];
  /** Fired when comments are added, updated, deleted, or resolved */
  'comments-update': [{ type: string; data: CommentsUpdateData }];
  /** Fired when awareness state changes (user cursors, selections) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  'awareness-update': [{ context: any; states: AwarenessState[] }];
  /** Fired when document lock state changes */
  locked: [{ isLocked: boolean; lockedBy: User | null }];
  /** Fired when a PDF document is fully loaded and ready */
  'pdf-document-ready': [];
  /** Fired when the comments sidebar is toggled */
  'sidebar-toggle': [boolean];
  /** Fired when collaboration is established for an editor */
  'collaboration-ready': [{ editor: Editor }];
  /** Fired when editor content is updated */
  'editor-update': [{ editor: Editor }];
  /** Fired when there's an error loading or processing content */
  'content-error': [{ error: Error; editor: Editor; documentId: string; file: File | Blob | null }];
  /** Fired when an exception occurs */
  exception: [{ error: Error; document?: Document }];
  /** Fired when list definitions change in the document */
  'list-definitions-change': [{ definitions: Record<string, unknown> }];
  /** Fired when fonts are resolved and loaded */
  'fonts-resolved': [{ fonts: string[] }];
  /** Fired for layout pipeline telemetry events */
  'layout-pipeline': [{ type: string; data: Record<string, unknown> }];
  /** Fired on editor transactions with timing information */
  transaction: [{ editor: Editor; transaction: PMTransaction; duration: number }];
}
