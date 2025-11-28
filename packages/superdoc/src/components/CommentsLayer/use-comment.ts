import { ref, reactive, type Ref, type UnwrapNestedRefs } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import { syncCommentsToClients } from '../../core/collaboration/helpers';
import { comments_module_events } from '@superdoc/common';
import useSelection, { type UseSelectionReturn } from '../../helpers/use-selection';
import type { SuperDoc } from '../../core/types';
import type { Mention, ImportedAuthor, TrackedChangeType, SelectionBounds } from './types';

/**
 * Comment event data for updates
 */
interface CommentEventData {
  /** Event type */
  type: string;
  /** The comment data */
  comment: CommentValues;
  /** Array of changes (for update events) */
  changes?: Array<{ key: string; value: unknown; previousValue?: unknown }>;
  /** Additional properties for various event types */
  [key: string]: unknown;
}

/**
 * User information
 */
export interface CommentUser {
  /** User's name */
  name: string;
  /** User's email */
  email: string;
  /** User's image/avatar (optional) */
  image?: string;
}

/**
 * Selection parameters for comment initialization
 */
interface CommentSelectionParams {
  /** Document ID */
  documentId: string;
  /** Page number */
  page: number;
  /** Selection bounds */
  selectionBounds: SelectionBounds;
  /** Optional source identifier */
  source?: string;
}

/**
 * Parameters for initializing a comment
 */
export interface UseCommentParams {
  /** Unique user identifier */
  uid?: string;
  /** Unique identifier for the comment */
  commentId?: string;
  /** Imported comment's ID */
  importedId?: string;
  /** Parent's comment ID */
  parentCommentId?: string;
  /** ID of the file the comment belongs to */
  fileId?: string;
  /** MIME type of the file */
  fileType?: string;
  /** Version number when comment was created */
  createdAtVersionNumber?: number;
  /** Whether the comment is internal */
  isInternal?: boolean;
  /** Whether the comment is focused */
  isFocused?: boolean;
  /** Email of the comment creator */
  creatorEmail?: string;
  /** Name of the comment creator */
  creatorName?: string;
  /** Image/avatar of the comment creator */
  creatorImage?: string;
  /** Timestamp when the comment was created */
  createdTime?: number;
  /** Information about imported author */
  importedAuthor?: ImportedAuthor | null;
  /** HTML text content of the comment */
  commentText?: string;
  /** Selection information for the comment */
  selection?: CommentSelectionParams;
  /** Whether this is a tracked change */
  trackedChange?: boolean;
  /** Type of tracked change */
  trackedChangeType?: TrackedChangeType | null;
  /** Text of the tracked change */
  trackedChangeText?: string | null;
  /** Text that was deleted */
  deletedText?: string | null;
  /** Timestamp when comment was resolved */
  resolvedTime?: number | null;
  /** Email of user who resolved the comment */
  resolvedByEmail?: string | null;
  /** Name of user who resolved the comment */
  resolvedByName?: string | null;
}

/**
 * Comment values object returned by getValues()
 */
export interface CommentValues {
  /** Unique user identifier */
  uid?: string;
  /** Unique identifier for the comment */
  commentId: string;
  /** Imported comment's ID */
  importedId?: string;
  /** Parent's comment ID */
  parentCommentId?: string;
  /** ID of the file the comment belongs to */
  fileId?: string;
  /** MIME type of the file */
  fileType?: string;
  /** Array of mentioned users */
  mentions: Mention[];
  /** Version number when comment was created */
  createdAtVersionNumber?: number;
  /** Email of the comment creator */
  creatorEmail?: string;
  /** Name of the comment creator */
  creatorName?: string;
  /** Image/avatar of the comment creator */
  creatorImage?: string;
  /** Timestamp when the comment was created */
  createdTime?: number;
  /** Information about imported author */
  importedAuthor?: ImportedAuthor | null;
  /** Whether the comment is internal */
  isInternal: boolean;
  /** HTML text content of the comment */
  commentText: string;
  /** Selection information for the comment */
  selection: ReturnType<UseSelectionReturn['getValues']> | null;
  /** Whether this is a tracked change */
  trackedChange?: boolean;
  /** Text of the tracked change */
  trackedChangeText?: string | null;
  /** Type of tracked change */
  trackedChangeType?: TrackedChangeType | null;
  /** Text that was deleted */
  deletedText?: string | null;
  /** Timestamp when comment was resolved */
  resolvedTime?: number | null;
  /** Email of user who resolved the comment */
  resolvedByEmail?: string | null;
  /** Name of user who resolved the comment */
  resolvedByName?: string | null;
}

/**
 * Parameters for setText method
 */
export interface SetTextParams {
  /** The new text value */
  text: string;
  /** The SuperDoc instance */
  superdoc: SuperDoc;
  /** Whether to suppress propagating the update */
  suppressUpdate?: boolean;
}

/**
 * Parameters for resolveComment method
 */
export interface ResolveCommentParams {
  /** Email of the user resolving the comment */
  email: string;
  /** Name of the user resolving the comment */
  name: string;
  /** The SuperDoc instance */
  superdoc: SuperDoc;
}

/**
 * Parameters for setIsInternal method
 */
export interface SetIsInternalParams {
  /** The new isInternal value */
  isInternal: boolean;
  /** The SuperDoc instance */
  superdoc: SuperDoc;
}

/**
 * Return type of the useComment composable
 */
export interface UseCommentReturn {
  /** Unique user identifier */
  uid: Ref<string | undefined>;
  /** Unique identifier for the comment */
  commentId: string;
  /** Imported comment's ID */
  importedId?: string;
  /** Parent's comment ID */
  parentCommentId?: string;
  /** ID of the file the comment belongs to */
  fileId?: string;
  /** MIME type of the file */
  fileType?: string;
  /** Array of mentioned users */
  mentions: Ref<Mention[]>;
  /** Reference to the comment DOM element */
  commentElement: Ref<HTMLElement | null>;
  /** Whether the comment is focused */
  isFocused: Ref<boolean>;
  /** Email of the comment creator */
  creatorEmail?: string;
  /** Name of the comment creator */
  creatorName?: string;
  /** Image/avatar of the comment creator */
  creatorImage?: string;
  /** Timestamp when the comment was created */
  createdTime?: number;
  /** Whether the comment is internal */
  isInternal: Ref<boolean>;
  /** HTML text content of the comment */
  commentText: Ref<string>;
  /** Selection information for the comment */
  selection: UseSelectionReturn;
  /** Floating position coordinates */
  floatingPosition: { top: number; left: number; right: number; bottom: number };
  /** Whether this is a tracked change */
  trackedChange: Ref<boolean | undefined>;
  /** Text that was deleted */
  deletedText: Ref<string | null | undefined>;
  /** Type of tracked change */
  trackedChangeType: Ref<TrackedChangeType | null | undefined>;
  /** Text of the tracked change */
  trackedChangeText: Ref<string | null | undefined>;
  /** Timestamp when comment was resolved */
  resolvedTime: Ref<number | null | undefined>;
  /** Email of user who resolved the comment */
  resolvedByEmail: Ref<string | null | undefined>;
  /** Name of user who resolved the comment */
  resolvedByName: Ref<string | null | undefined>;
  /** Information about imported author */
  importedAuthor: Ref<ImportedAuthor | null | undefined>;
  /** Set the text content of the comment */
  setText: (params: SetTextParams) => void;
  /** Get the raw values of the comment */
  getValues: () => CommentValues;
  /** Mark this comment as resolved */
  resolveComment: (params: ResolveCommentParams) => void;
  /** Update the isInternal value */
  setIsInternal: (params: SetIsInternalParams) => void;
  /** Set this comment as active in the editor */
  setActive: (superdoc: SuperDoc) => void;
  /** Update the position of the comment */
  updatePosition: (
    coords: { top: number; left: number; right: number; bottom: number },
    parentElement: HTMLElement,
  ) => void;
  /** Get the user information for this comment */
  getCommentUser: () => CommentUser;
}

/**
 * Vue composable for managing individual comment state and actions
 *
 * This composable provides comprehensive comment management including:
 * - Reactive state for all comment properties
 * - Text content management with mention extraction
 * - Resolution and internal/external status tracking
 * - Position updates for floating comments
 * - Collaboration sync with other clients
 *
 * @param params - Comment initialization parameters
 * @returns Comment state and action methods
 *
 * @example
 * const comment = useComment({
 *   commentId: 'comment-123',
 *   fileId: 'doc-456',
 *   creatorEmail: 'user@example.com',
 *   creatorName: 'John Doe',
 *   commentText: '<p>This is a comment</p>',
 *   selection: {
 *     documentId: 'doc-456',
 *     page: 1,
 *     selectionBounds: { top: 100, left: 50, width: 200, height: 20 }
 *   }
 * });
 *
 * comment.setText({ text: 'Updated text', superdoc });
 * comment.resolveComment({ email: 'user@example.com', name: 'John Doe', superdoc });
 */
export default function useComment(params: UseCommentParams): UnwrapNestedRefs<UseCommentReturn> {
  const uid = ref(params.uid);
  const commentId = params.commentId || uuidv4();
  const importedId = params.importedId;
  const parentCommentId = params.parentCommentId;
  const fileId = params.fileId;
  const fileType = params.fileType;
  const createdAtVersionNumber = params.createdAtVersionNumber;
  const isInternal = ref(params.isInternal !== undefined ? params.isInternal : true);

  const mentions = ref<Mention[]>([]);

  const commentElement = ref<HTMLElement | null>(null);
  const isFocused = ref(params.isFocused || false);

  const creatorEmail = params.creatorEmail;
  const creatorName = params.creatorName;
  const creatorImage = params.creatorImage;
  const createdTime = params.createdTime || Date.now();
  const importedAuthor = ref<ImportedAuthor | null | undefined>(params.importedAuthor || null);

  const commentText = ref(params.commentText || '');

  const selection = params.selection
    ? useSelection(params.selection)
    : useSelection({
        documentId: fileId || '',
        page: 1,
        selectionBounds: {},
      });

  const floatingPosition = params.selection?.selectionBounds
    ? {
        ...params.selection.selectionBounds,
        top: params.selection.selectionBounds.top || 0,
        left: params.selection.selectionBounds.left || 0,
        right: params.selection.selectionBounds.right || 0,
        bottom: params.selection.selectionBounds.bottom || 0,
      }
    : { top: 0, left: 0, right: 0, bottom: 0 };

  // Tracked changes aka suggestions
  const trackedChange = ref(params.trackedChange);
  const trackedChangeType = ref<TrackedChangeType | null | undefined>(params.trackedChangeType || null);
  const trackedChangeText = ref<string | null | undefined>(params.trackedChangeText || null);
  const deletedText = ref<string | null | undefined>(params.deletedText || null);

  const resolvedTime = ref<number | null | undefined>(params.resolvedTime || null);
  const resolvedByEmail = ref<string | null | undefined>(params.resolvedByEmail || null);
  const resolvedByName = ref<string | null | undefined>(params.resolvedByName || null);

  /**
   * Mark this conversation as resolved with UTC date
   *
   * @param params - Resolution parameters including user email, name, and superdoc instance
   */
  const resolveComment = ({ email, name, superdoc }: ResolveCommentParams): void => {
    if (resolvedTime.value) return;
    resolvedTime.value = Date.now();
    resolvedByEmail.value = email;
    resolvedByName.value = name;

    if (trackedChange.value) {
      const emitData: CommentEventData = { type: comments_module_events.RESOLVED, comment: getValues() };
      propagateUpdate(superdoc, emitData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (superdoc.activeEditor as any)?.commands?.resolveComment({ commentId, importedId });
      return;
    }

    const emitData: CommentEventData = { type: comments_module_events.RESOLVED, comment: getValues() };
    propagateUpdate(superdoc, emitData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (superdoc.activeEditor as any)?.commands?.resolveComment({ commentId, importedId });
  };

  /**
   * Update the isInternal value of this comment
   *
   * @param params - Parameters including new isInternal value and superdoc instance
   */
  const setIsInternal = ({ isInternal: newIsInternal, superdoc }: SetIsInternalParams): void => {
    const previousValue = isInternal.value;
    if (previousValue === newIsInternal) return;

    // Update the isInternal value
    isInternal.value = newIsInternal;

    const emitData: CommentEventData = {
      type: comments_module_events.UPDATE,
      changes: [{ key: 'isInternal', value: newIsInternal, previousValue }],
      comment: getValues(),
    };
    propagateUpdate(superdoc, emitData);

    const activeEditor = superdoc.activeEditor;
    if (!activeEditor) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (activeEditor as any).commands.setCommentInternal({ commentId, importedId, isInternal: newIsInternal });
  };

  /**
   * Set this comment as the active comment in the editor
   *
   * @param superdoc - The SuperDoc instance
   */
  const setActive = (superdoc: SuperDoc): void => {
    const { activeEditor } = superdoc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (activeEditor as any)?.commands.setActiveComment({ commentId, importedId });
  };

  /**
   * Update the text value of this comment
   *
   * @param params - Parameters including new text, superdoc instance, and optional suppressUpdate flag
   */
  const setText = ({ text, superdoc, suppressUpdate }: SetTextParams): void => {
    commentText.value = text;

    // Track mentions
    mentions.value = extractMentions(text);

    if (suppressUpdate) return;

    const emitData: CommentEventData = {
      type: comments_module_events.UPDATE,
      changes: [{ key: 'text', value: text }],
      comment: getValues(),
    };
    propagateUpdate(superdoc, emitData);
  };

  /**
   * Extract mentions from comment contents
   *
   * @param htmlString - HTML string containing mention elements
   * @returns An array of unique mentions
   */
  const extractMentions = (htmlString: string): Mention[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const mentionElements = Array.from(doc.querySelectorAll('span[data-type="mention"]'));

    const uniqueMentions: Mention[] = [];
    mentionElements.forEach((span) => {
      const alreadyExists = uniqueMentions.some((m) => {
        const hasEmail = m.email === span.getAttribute('email');
        const hasName = m.name === span.getAttribute('name');
        return hasEmail && hasName;
      });

      if (!alreadyExists) {
        uniqueMentions.push({
          name: span.getAttribute('name') || '',
          email: span.getAttribute('email') || '',
        });
      }
    });

    return uniqueMentions;
  };

  /**
   * Update the selection bounds of this comment
   *
   * @param coords - Object containing the selection bounds
   * @param parentElement - The parent element to calculate relative position from
   */
  const updatePosition = (
    coords: { top: number; left: number; right: number; bottom: number },
    parentElement: HTMLElement,
  ): void => {
    if (selection.source) {
      selection.source.value = 'super-editor';
    }
    const parentTop = parentElement?.getBoundingClientRect()?.top || 0;

    const newCoords = {
      top: coords.top - parentTop,
      left: coords.left,
      right: coords.right,
      bottom: coords.bottom - parentTop,
    };
    Object.assign(selection.selectionBounds, newCoords);
  };

  /**
   * Get the user information for this comment
   *
   * @returns User object with name, email, and optional image
   */
  const getCommentUser = (): CommentUser => {
    const user = importedAuthor.value
      ? { name: importedAuthor.value.name || '(Imported)', email: importedAuthor.value.email || '' }
      : { name: creatorName || '', email: creatorEmail || '', image: creatorImage };

    return user;
  };

  /**
   * Emit updates to the end client, and sync with collaboration if necessary
   *
   * @param superdoc - The SuperDoc instance
   * @param event - The data to emit to the client
   */
  const propagateUpdate = (superdoc: SuperDoc, event: CommentEventData): void => {
    // Emit the event directly - it contains type, comment, and changes properties
    superdoc.emit?.('comments-update', event as unknown as { type: string; data: object });
    // Cast through unknown to allow the type assertion - syncCommentsToClients has stricter types
    // but accepts the same data at runtime
    syncCommentsToClients(
      superdoc as unknown as Parameters<typeof syncCommentsToClients>[0],
      event as unknown as Parameters<typeof syncCommentsToClients>[1],
    );
  };

  /**
   * Get the raw values of this comment
   *
   * @returns The raw values of this comment as a plain object
   */
  const getValues = (): CommentValues => {
    return {
      uid: uid.value,
      commentId,
      importedId,
      parentCommentId,
      fileId,
      fileType,
      mentions: mentions.value.map((u) => {
        return { ...u, name: u.name ? u.name : u.email };
      }),
      createdAtVersionNumber,
      creatorEmail,
      creatorName,
      creatorImage,
      createdTime,
      importedAuthor: importedAuthor.value,
      isInternal: isInternal.value,
      commentText: commentText.value,
      selection: selection ? selection.getValues() : null,
      trackedChange: trackedChange.value,
      trackedChangeText: trackedChangeText.value,
      trackedChangeType: trackedChangeType.value,
      deletedText: deletedText.value,
      resolvedTime: resolvedTime.value,
      resolvedByEmail: resolvedByEmail.value,
      resolvedByName: resolvedByName.value,
    };
  };

  return reactive({
    uid,
    commentId,
    importedId,
    parentCommentId,
    fileId,
    fileType,
    mentions,
    commentElement,
    isFocused,
    creatorEmail,
    creatorName,
    creatorImage,
    createdTime,
    isInternal,
    commentText,
    selection,
    floatingPosition,
    trackedChange,
    deletedText,
    trackedChangeType,
    trackedChangeText,
    resolvedTime,
    resolvedByEmail,
    resolvedByName,
    importedAuthor,

    // Actions
    setText,
    getValues,
    resolveComment,
    setIsInternal,
    setActive,
    updatePosition,
    getCommentUser,
  });
}
