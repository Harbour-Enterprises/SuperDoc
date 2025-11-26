import { defineStore } from 'pinia';
import { ref, reactive, computed, type Ref, type UnwrapNestedRefs, type ComputedRef } from 'vue';
import { comments_module_events } from '@superdoc/common';
import { useSuperdocStore } from './superdoc-store';
import { syncCommentsToClients } from '../core/collaboration/helpers';
import {
  Editor as EditorClass,
  trackChangesHelpers,
  TrackChangesBasePluginKey,
  CommentsPluginKey,
} from '@harbour-enterprises/super-editor';
import { getRichTextExtensions } from '@harbour-enterprises/super-editor';
import useComment, { type UseCommentReturn, type UseCommentParams } from '../components/CommentsLayer/use-comment';
import { groupChanges, type GroupedChange } from '../helpers/group-changes';
import type { SuperDoc, Editor } from '../core/types';
import type { UseDocumentReturn } from '../composables/use-document';
import type { SelectionBounds } from './types';

/**
 * Editor commands interface for comment operations
 * Defines the command methods available on the editor for managing comments
 */
interface EditorCommentCommands {
  setActiveComment: (params: { commentId: string | null }) => void;
  insertComment: (params: Record<string, unknown> & { commentId: string; skipEmit?: boolean }) => void;
  removeComment: (params: { commentId: string; importedId?: string }) => void;
}

/**
 * Extended editor interface with comment commands
 */
interface EditorWithCommentCommands extends Editor {
  commands: EditorCommentCommands;
}

/**
 * ProseMirror transaction interface
 */
interface PMTransaction {
  setMeta: (key: unknown, value: unknown) => PMTransaction;
}

/**
 * ProseMirror editor state interface
 */
interface PMEditorState {
  tr: PMTransaction;
}

/**
 * ProseMirror view interface
 */
interface PMView {
  state: PMEditorState;
  dispatch: (tr: PMTransaction) => void;
}

/**
 * Extended editor interface with ProseMirror view access
 */
interface EditorWithView extends Editor {
  view: PMView;
  state: unknown;
}

/**
 * Comments module configuration
 */
interface CommentsConfig {
  /** Name of the module */
  name: string;
  /** Whether comments are read-only */
  readOnly: boolean;
  /** Whether users can resolve comments */
  allowResolve: boolean;
  /** Whether to show resolved comments */
  showResolved: boolean;
  /** Whether to suppress internal/external distinction */
  suppressInternalExternal?: boolean;
  /** Initial comments to load */
  comments?: UseCommentParams[];
}

/**
 * Selection object for creating comments
 */
interface Selection {
  /** Document ID */
  documentId: string;
  /** Page number */
  page: number;
  /** Selection bounds on the page */
  selectionBounds: SelectionBounds;
  /** Source of the selection */
  source?: string;
}

/**
 * Coordinates for tracked change events
 */
interface TrackedChangeCoords {
  /** Top position */
  top: number;
  /** Left position */
  left: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  [key: string]: unknown;
}

/**
 * Parameters for tracked change updates
 */
interface TrackedChangeParams {
  /** Event type ('add' or 'update') */
  event: 'add' | 'update';
  /** Change ID */
  changeId: string;
  /** Text of the tracked change */
  trackedChangeText?: string;
  /** Type of tracked change */
  trackedChangeType?: 'trackInsert' | 'trackDelete' | 'both' | 'trackFormat';
  /** Text that was deleted */
  deletedText?: string;
  /** Author email */
  authorEmail?: string;
  /** Author image/avatar */
  authorImage?: string;
  /** Date of the change */
  date?: number;
  /** Author name */
  author?: string;
  /** Imported author information */
  importedAuthor?: { name?: string; email?: string };
  /** Document ID */
  documentId: string;
  /** Coordinates of the change */
  coords?: TrackedChangeCoords;
}

/**
 * Comment event data structure
 */
interface CommentEventData {
  /** Event type */
  type: string;
  /** Comment data */
  comment: ReturnType<UseCommentReturn['getValues']>;
  /** Array of changes (for update events) */
  changes?: Array<{ key: string; value?: unknown; previousValue?: unknown; commentId?: string; fileId?: string }>;
}

/**
 * Comment text JSON structure from DOCX
 */
interface CommentTextJson {
  /** Type of the node */
  type: string;
  /** Node attributes */
  attrs?: Record<string, unknown>;
  /** Content array */
  content?: CommentTextJson[];
  /** Text content */
  text?: string;
  /** Text marks */
  marks?: unknown[];
}

/**
 * Loaded DOCX comment structure
 */
interface LoadedDocxComment {
  /** Comment ID */
  commentId: string;
  /** Parent comment ID */
  parentCommentId?: string;
  /** Comment text JSON */
  textJson: CommentTextJson;
  /** Creator name */
  creatorName: string;
  /** Creator email */
  creatorEmail: string;
  /** Creation time */
  createdTime: number;
  /** Whether the comment is resolved */
  isDone?: boolean;
  /** Whether this is a tracked change */
  trackedChange?: boolean;
  /** Tracked change text */
  trackedChangeText?: string;
  /** Tracked change type */
  trackedChangeType?: 'trackInsert' | 'trackDelete' | 'both' | 'trackFormat';
  /** Tracked deleted text */
  trackedDeletedText?: string;
}

/**
 * Comment position from editor
 */
interface CommentPosition {
  /** Top position */
  top: number;
  /** Left position */
  left: number;
  /** Right position */
  right: number;
  /** Bottom position */
  bottom: number;
  [key: string]: unknown;
}

/**
 * Comment positions keyed by comment ID
 */
type EditorCommentPositions = Record<string, CommentPosition>;

/**
 * Grouped comments return type
 */
interface GroupedComments {
  /** Active parent comments */
  parentComments: UnwrapNestedRefs<UseCommentReturn>[];
  /** Resolved comments */
  resolvedComments: UnwrapNestedRefs<UseCommentReturn>[];
}

/**
 * Debounce timers keyed by comment ID
 */
type DebounceTimers = Record<string, ReturnType<typeof setTimeout>>;

/**
 * Comments store return type
 */
interface CommentsStoreReturn {
  // Constants
  COMMENT_EVENTS: typeof comments_module_events;
  isDebugging: boolean;

  // State refs
  hasInitializedComments: Ref<boolean>;
  hasSyncedCollaborationComments: Ref<boolean>;
  editingCommentId: Ref<string | null>;
  activeComment: Ref<string | null>;
  commentDialogs: Ref<unknown[]>;
  overlappingComments: Ref<unknown[]>;
  overlappedIds: Set<string>;
  suppressInternalExternal: Ref<boolean>;
  pendingComment: Ref<UnwrapNestedRefs<UseCommentReturn> | null>;
  currentCommentText: Ref<string>;
  commentsList: Ref<UnwrapNestedRefs<UseCommentReturn>[]>;
  isCommentsListVisible: Ref<boolean>;
  generalCommentIds: Ref<string[]>;
  editorCommentIds: Ref<string[]>;
  commentsParentElement: Ref<HTMLElement | null>;
  editorCommentPositions: Ref<EditorCommentPositions>;
  hasInitializedLocations: Ref<boolean>;
  isCommentHighlighted: Ref<boolean>;

  // Floating comments state
  floatingCommentsOffset: Ref<number>;
  sortedConversations: Ref<unknown[]>;
  visibleConversations: Ref<unknown[]>;
  skipSelectionUpdate: Ref<boolean>;
  isFloatingCommentsReady: Ref<boolean>;

  // Computed getters
  getConfig: ComputedRef<CommentsConfig>;
  documentsWithConverations: ComputedRef<UseDocumentReturn[]>;
  getGroupedComments: ComputedRef<GroupedComments>;
  getFloatingComments: ComputedRef<UnwrapNestedRefs<UseCommentReturn>[]>;

  // Actions
  init: (config?: Partial<CommentsConfig>) => void;
  getComment: (id: string | number | undefined | null) => UnwrapNestedRefs<UseCommentReturn> | null;
  setActiveComment: (superdoc: SuperDoc, id: string | undefined | null) => void;
  getCommentLocation: (
    selection: {
      getContainerLocation: (parent: HTMLElement) => { top: number; left: number };
      selectionBounds: SelectionBounds;
    },
    parent: HTMLElement,
  ) => { top: number; left: number };
  hasOverlapId: (id: string) => boolean;
  getPendingComment: (params: {
    selection?: Selection;
    documentId?: string;
    parentCommentId?: string;
    [key: string]: unknown;
  }) => UnwrapNestedRefs<UseCommentReturn>;
  showAddComment: (superdoc: SuperDoc) => void;
  addComment: (params: {
    superdoc: SuperDoc;
    comment: UnwrapNestedRefs<UseCommentReturn>;
    skipEditorUpdate?: boolean;
  }) => void;
  cancelComment: (superdoc: SuperDoc) => void;
  deleteComment: (params: { commentId: string; superdoc: SuperDoc }) => void;
  removePendingComment: (superdoc: SuperDoc) => void;
  processLoadedDocxComments: (params: {
    superdoc: SuperDoc;
    editor: Editor;
    comments: LoadedDocxComment[];
    documentId: string;
  }) => Promise<void>;
  translateCommentsForExport: () => Array<ReturnType<UseCommentReturn['getValues']> & { commentJSON: unknown }>;
  handleEditorLocationsUpdate: (allCommentPositions: EditorCommentPositions | null) => void;
  handleTrackedChangeUpdate: (params: { superdoc: SuperDoc; params: TrackedChangeParams }) => void;
}

/**
 * Pinia store for managing comments and tracked changes
 *
 * This store handles:
 * - Comment creation, editing, deletion, and resolution
 * - Tracked changes (suggestions) from DOCX documents
 * - Comment positioning and floating comment layout
 * - Collaboration sync for multi-user editing
 * - Import/export of comments from DOCX format
 * - Threaded comments and conversations
 *
 * It works closely with the Super Editor to maintain comment state
 * and provides computed getters for grouped and filtered comment lists.
 */
export const useCommentsStore = defineStore('comments', (): CommentsStoreReturn => {
  // Lazy load superdocStore to avoid circular dependency
  // Access it within functions instead of module level
  const commentsConfig = reactive<CommentsConfig>({
    name: 'comments',
    readOnly: false,
    allowResolve: true,
    showResolved: false,
  });

  const isDebugging = false;
  const debounceTimers: DebounceTimers = {};

  const COMMENT_EVENTS = comments_module_events;
  const hasInitializedComments = ref<boolean>(false);
  const hasSyncedCollaborationComments = ref<boolean>(false);
  const commentsParentElement = ref<HTMLElement | null>(null);
  const hasInitializedLocations = ref<boolean>(false);
  const activeComment = ref<string | null>(null);
  const editingCommentId = ref<string | null>(null);
  const commentDialogs = ref<unknown[]>([]);
  const overlappingComments = ref<unknown[]>([]);
  const overlappedIds = new Set<string>([]);
  const suppressInternalExternal = ref<boolean>(true);
  const currentCommentText = ref<string>('');
  const commentsList = ref<UnwrapNestedRefs<UseCommentReturn>[]>([]);
  const isCommentsListVisible = ref<boolean>(false);
  const editorCommentIds = ref<string[]>([]);
  const editorCommentPositions = ref<EditorCommentPositions>({});
  const isCommentHighlighted = ref<boolean>(false);

  // Floating comments
  const floatingCommentsOffset = ref<number>(0);
  const sortedConversations = ref<unknown[]>([]);
  const visibleConversations = ref<unknown[]>([]);
  const skipSelectionUpdate = ref<boolean>(false);
  const isFloatingCommentsReady = ref<boolean>(false);
  const generalCommentIds = ref<string[]>([]);

  const pendingComment = ref<UnwrapNestedRefs<UseCommentReturn> | null>(null);

  /**
   * Initialize the store
   *
   * @param config - The comments module config from SuperDoc
   */
  const init = (config: Partial<CommentsConfig> = {}): void => {
    const updatedConfig = { ...commentsConfig, ...config };
    Object.assign(commentsConfig, updatedConfig);

    suppressInternalExternal.value = commentsConfig.suppressInternalExternal || false;

    // Map initial comments state
    if (config.comments && config.comments.length) {
      commentsList.value = config.comments?.map((c) => useComment(c)) || [];
    }
  };

  /**
   * Get a comment by either ID or imported ID
   *
   * @param id - The comment ID
   * @returns The comment object or null
   */
  const getComment = (id: string | number | undefined | null): UnwrapNestedRefs<UseCommentReturn> | null => {
    if (id === undefined || id === null) return null;
    return commentsList.value.find((c) => c.commentId == id || c.importedId == id) || null;
  };

  /**
   * Set the active comment or clear all active comments
   *
   * @param superdoc - The SuperDoc instance
   * @param id - The comment ID or null to clear
   */
  const setActiveComment = (superdoc: SuperDoc, id: string | undefined | null): void => {
    // If no ID, we clear any focused comments
    if (id === undefined || id === null) {
      activeComment.value = null;
      const editor = superdoc.activeEditor as EditorWithCommentCommands | null;
      if (editor?.commands?.setActiveComment) {
        editor.commands.setActiveComment({ commentId: null });
      }
      return;
    }

    const comment = getComment(id);
    if (comment) activeComment.value = comment.commentId;
    const editor = superdoc.activeEditor as EditorWithCommentCommands | null;
    if (editor?.commands?.setActiveComment) {
      editor.commands.setActiveComment({ commentId: activeComment.value });
    }
  };

  /**
   * Handle tracked change events from the editor.
   *
   * This method is called when a tracked change (insertion, deletion, or format change)
   * is created or updated in the document. It manages the corresponding comment-like
   * representation of the tracked change for display in the comments sidebar.
   *
   * For 'add' events, a new comment is created to represent the tracked change.
   * For 'update' events, the existing tracked change comment is updated with new text.
   *
   * @param params - Parameters containing superdoc and tracked change data
   * @param params.superdoc - The SuperDoc instance
   * @param params.params - Tracked change parameters
   * @param params.params.event - Event type: 'add' for new changes, 'update' for modifications
   * @param params.params.changeId - Unique identifier for the tracked change
   * @param params.params.trackedChangeText - The text content of the change
   * @param params.params.trackedChangeType - Type of change: 'trackInsert', 'trackDelete', 'both', or 'trackFormat'
   * @param params.params.deletedText - Original text that was deleted (for delete operations)
   * @param params.params.authorEmail - Email of the author who made the change
   * @param params.params.authorImage - Avatar image URL of the author
   * @param params.params.date - Timestamp when the change was made
   * @param params.params.author - Display name of the author
   * @param params.params.importedAuthor - Author info if imported from DOCX
   * @param params.params.documentId - ID of the document containing the change
   * @param params.params.coords - Position coordinates for the change
   */
  const handleTrackedChangeUpdate = ({
    superdoc,
    params,
  }: {
    superdoc: SuperDoc;
    params: TrackedChangeParams;
  }): void => {
    const {
      event,
      changeId,
      trackedChangeText,
      trackedChangeType,
      deletedText,
      authorEmail,
      authorImage,
      date,
      author: authorName,
      importedAuthor,
      documentId,
      coords,
    } = params;

    const comment = getPendingComment({
      documentId,
      commentId: changeId,
      trackedChange: true,
      trackedChangeText,
      trackedChangeType,
      deletedText,
      createdTime: date,
      creatorName: authorName,
      creatorEmail: authorEmail,
      creatorImage: authorImage,
      isInternal: false,
      importedAuthor,
      selection: coords
        ? {
            documentId,
            page: 1,
            selectionBounds: coords as SelectionBounds,
          }
        : undefined,
    });

    if (event === 'add') {
      // If this is a new tracked change, add it to our comments
      addComment({ superdoc, comment });
    } else if (event === 'update') {
      // If we have an update event, simply update the composable comment
      const existingTrackedChange = commentsList.value.find((comment) => comment.commentId === changeId);
      if (!existingTrackedChange) return;

      existingTrackedChange.trackedChangeText = trackedChangeText || null;

      if (deletedText) {
        existingTrackedChange.deletedText = deletedText;
      }

      const emitData: CommentEventData = {
        type: COMMENT_EVENTS.UPDATE,
        comment: existingTrackedChange.getValues(),
      };

      // Type assertion needed as syncCommentsToClients expects SuperDocWithCollaboration
      // which requires ydoc to be non-optional, but at runtime this is safe
      syncCommentsToClients(
        superdoc as unknown as Parameters<typeof syncCommentsToClients>[0],
        emitData as unknown as Parameters<typeof syncCommentsToClients>[1],
      );
      debounceEmit(changeId, emitData, superdoc);
    }
  };

  /**
   * Debounce emission of events to prevent excessive updates
   *
   * @param commentId - Comment ID for debouncing
   * @param event - Event data to emit
   * @param superdoc - SuperDoc instance
   * @param delay - Delay in milliseconds (default: 1000)
   */
  const debounceEmit = (commentId: string, event: CommentEventData, superdoc: SuperDoc, delay: number = 1000): void => {
    if (debounceTimers[commentId]) {
      clearTimeout(debounceTimers[commentId]);
    }

    debounceTimers[commentId] = setTimeout(() => {
      if (superdoc) {
        // Emit event directly - it contains type, comment, and changes properties
        superdoc.emit?.('comments-update', event as unknown as { type: string; data: object });
      }
      delete debounceTimers[commentId];
    }, delay);
  };

  /**
   * Show the add comment UI
   *
   * @param superdoc - The SuperDoc instance
   */
  const showAddComment = (superdoc: SuperDoc): void => {
    const superdocStore = useSuperdocStore(); // Access lazily
    const event = { type: COMMENT_EVENTS.PENDING };
    // Emit event directly
    superdoc.emit?.('comments-update', event as unknown as { type: string; data: object });

    const activeSelection = superdocStore.activeSelection as {
      documentId: string;
      selectionBounds: SelectionBounds;
      [key: string]: unknown;
    } | null;
    const selection = { ...(activeSelection || { documentId: '', selectionBounds: {} }) } as unknown as Selection;
    selection.selectionBounds = { ...(selection.selectionBounds || {}) } as SelectionBounds;

    if (superdocStore.selectionPosition?.source) {
      superdocStore.selectionPosition.source = null;
    }

    pendingComment.value = getPendingComment({
      selection,
      documentId: selection.documentId,
      parentCommentId: undefined,
    });
    if (!superdoc.config.isInternal) pendingComment.value.isInternal = false;

    const editor = superdoc.activeEditor as EditorWithCommentCommands | null;
    if (editor?.commands?.insertComment) {
      editor.commands.insertComment({
        ...pendingComment.value.getValues(),
        commentId: 'pending',
        skipEmit: true,
      });
    }

    if (pendingComment.value.selection.source === 'super-editor' && superdocStore.selectionPosition) {
      superdocStore.selectionPosition.source = 'super-editor';
    }

    activeComment.value = pendingComment.value.commentId;
  };

  /**
   * Generate the comments list separating resolved and active
   * We only return parent comments here, since CommentDialog.vue will handle threaded comments
   */
  const getGroupedComments: ComputedRef<GroupedComments> = computed(() => {
    const parentComments: UnwrapNestedRefs<UseCommentReturn>[] = [];
    const resolvedComments: UnwrapNestedRefs<UseCommentReturn>[] = [];
    const childCommentMap = new Map<string, UnwrapNestedRefs<UseCommentReturn>[]>();

    commentsList.value.forEach((comment: UnwrapNestedRefs<UseCommentReturn>) => {
      // Track resolved comments
      if (comment.resolvedTime) {
        resolvedComments.push(comment);
      }

      // Track parent comments
      else if (!comment.parentCommentId && !comment.resolvedTime) {
        parentComments.push({ ...comment });
      }

      // Track child comments (threaded comments)
      else if (comment.parentCommentId) {
        if (!childCommentMap.has(comment.parentCommentId)) {
          childCommentMap.set(comment.parentCommentId, []);
        }
        childCommentMap.get(comment.parentCommentId)!.push(comment);
      }
    });

    // Return only parent comments
    const sortedParentComments = parentComments.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
    const sortedResolvedComments = resolvedComments.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));

    return {
      parentComments: sortedParentComments,
      resolvedComments: sortedResolvedComments,
    };
  });

  /**
   * Check if an ID exists in the overlapped IDs set
   *
   * @param id - The ID to check
   * @returns True if the ID is in the overlapped set
   */
  const hasOverlapId = (id: string): boolean => overlappedIds.has(id);

  /**
   * Get all documents with conversations
   */
  const documentsWithConverations = computed(() => {
    const superdocStore = useSuperdocStore(); // Access lazily
    return superdocStore.documents;
  });

  /**
   * Get the comments configuration
   */
  const getConfig: ComputedRef<CommentsConfig> = computed(() => {
    return commentsConfig;
  });

  /**
   * Get the location of a comment relative to its parent
   *
   * @param selection - Selection object with position data
   * @param parent - Parent element for relative positioning
   * @returns Top and left coordinates
   */
  const getCommentLocation = (
    selection: {
      getContainerLocation: (parent: HTMLElement) => { top: number; left: number };
      selectionBounds: SelectionBounds;
    },
    parent: HTMLElement,
  ): { top: number; left: number } => {
    const containerBounds = selection.getContainerLocation(parent);
    const top = containerBounds.top + selection.selectionBounds.top;
    const left = containerBounds.left + selection.selectionBounds.left;
    return {
      top: top,
      left: left,
    };
  };

  /**
   * Get a new pending comment
   *
   * @param params - Comment initialization parameters
   * @returns New comment object
   */
  const getPendingComment = (params: {
    selection?: Selection;
    documentId?: string;
    parentCommentId?: string;
    [key: string]: unknown;
  }): UnwrapNestedRefs<UseCommentReturn> => {
    return _getNewcomment(params);
  };

  /**
   * Get the new comment object
   *
   * @param params - Comment initialization parameters
   * @returns New comment object
   */
  const _getNewcomment = (params: {
    selection?: Selection;
    documentId?: string;
    parentCommentId?: string;
    [key: string]: unknown;
  }): UnwrapNestedRefs<UseCommentReturn> => {
    const superdocStore = useSuperdocStore(); // Access lazily
    const { selection, documentId, parentCommentId, ...options } = params;
    let activeDocument: UseDocumentReturn | undefined;
    if (documentId) activeDocument = superdocStore.getDocument(documentId);
    else if (selection) activeDocument = superdocStore.getDocument(selection.documentId);

    if (!activeDocument) activeDocument = superdocStore.documents[0] as unknown as UseDocumentReturn;

    // At this point we should have an activeDocument, if not we have bigger problems
    if (!activeDocument) {
      throw new Error('No active document found when creating comment');
    }

    return useComment({
      fileId: activeDocument.id,
      fileType: activeDocument.type || undefined,
      parentCommentId,
      creatorEmail: superdocStore.user.email,
      creatorName: superdocStore.user.name,
      creatorImage: superdocStore.user.image,
      commentText: currentCommentText.value,
      selection,
      ...options,
    } as UseCommentParams);
  };

  /**
   * Remove the pending comment
   *
   * @param superdoc - The SuperDoc instance
   */
  const removePendingComment = (superdoc: SuperDoc): void => {
    const superdocStore = useSuperdocStore(); // Access lazily
    currentCommentText.value = '';
    pendingComment.value = null;
    activeComment.value = null;
    superdocStore.selectionPosition = null;

    const editor = superdoc.activeEditor as EditorWithCommentCommands | null;
    if (editor?.commands?.removeComment) {
      editor.commands.removeComment({ commentId: 'pending' });
    }
  };

  /**
   * Add a new comment to the document
   *
   * @param params - Parameters including superdoc, comment, and optional flags
   */
  const addComment = ({
    superdoc,
    comment,
    skipEditorUpdate = false,
  }: {
    superdoc: SuperDoc;
    comment: UnwrapNestedRefs<UseCommentReturn>;
    skipEditorUpdate?: boolean;
  }): void => {
    let parentComment = commentsList.value.find(
      (c: UnwrapNestedRefs<UseCommentReturn>) => c.commentId === activeComment.value,
    );
    if (!parentComment) parentComment = comment;

    // Type assertion needed - getValues() returns compatible structure for useComment
    const newComment = useComment(comment.getValues() as UseCommentParams);

    if (pendingComment.value) newComment.setText({ text: currentCommentText.value, superdoc, suppressUpdate: true });
    else newComment.setText({ text: comment.commentText || '', superdoc, suppressUpdate: true });
    newComment.selection.source = pendingComment.value?.selection?.source;

    // Set isInternal flag
    if (parentComment) {
      const isParentInternal = parentComment.isInternal;
      newComment.isInternal = isParentInternal;
    }

    // If the current user is not internal, set the comment to external
    if (!superdoc.config.isInternal) newComment.isInternal = false;

    // Add the new comments to our global list
    commentsList.value.push(newComment);

    // Clean up the pending comment
    removePendingComment(superdoc);

    // If this is not a tracked change, and it belongs to a Super Editor, and its not a child comment
    // We need to let the editor know about the new comment
    if (!skipEditorUpdate && !comment.trackedChange && superdoc.activeEditor && !comment.parentCommentId) {
      // Add the comment to the active editor
      const editor = superdoc.activeEditor as EditorWithCommentCommands;
      if (editor.commands?.insertComment) {
        editor.commands.insertComment({ ...newComment.getValues(), commentId: newComment.commentId, skipEmit: true });
      }
    }

    const event: CommentEventData = { type: COMMENT_EVENTS.ADD, comment: newComment.getValues() };

    // If collaboration is enabled, sync the comments to all clients
    // Type assertion needed as syncCommentsToClients expects SuperDocWithCollaboration
    syncCommentsToClients(
      superdoc as unknown as Parameters<typeof syncCommentsToClients>[0],
      event as unknown as Parameters<typeof syncCommentsToClients>[1],
    );

    // Emit event for end users
    superdoc.emit?.('comments-update', event as unknown as { type: string; data: object });
  };

  /**
   * Delete a comment and its child comments
   *
   * @param params - Parameters including commentId and superdoc
   */
  const deleteComment = ({
    commentId: commentIdToDelete,
    superdoc,
  }: {
    commentId: string;
    superdoc: SuperDoc;
  }): void => {
    const commentIndex = commentsList.value.findIndex((c) => c.commentId === commentIdToDelete);
    const comment = commentsList.value[commentIndex];
    const { commentId, importedId } = comment;
    const { fileId } = comment;

    const editor = superdoc.activeEditor as EditorWithCommentCommands | null;
    if (editor?.commands?.removeComment) {
      editor.commands.removeComment({ commentId, importedId });
    }

    // Remove the current comment
    commentsList.value.splice(commentIndex, 1);

    // Remove any child comments of the removed comment
    const childCommentIds = commentsList.value
      .filter((c: UnwrapNestedRefs<UseCommentReturn>) => c.parentCommentId === commentId)
      .map((c: UnwrapNestedRefs<UseCommentReturn>) => c.commentId || c.importedId);
    commentsList.value = commentsList.value.filter(
      (c: UnwrapNestedRefs<UseCommentReturn>) => !childCommentIds.includes(c.commentId),
    );

    const event: CommentEventData = {
      type: COMMENT_EVENTS.DELETED,
      comment: comment.getValues(),
      changes: [{ key: 'deleted', commentId, fileId }],
    };

    // Emit event for end users
    superdoc.emit?.('comments-update', event as unknown as { type: string; data: object });
    // Type assertion needed as syncCommentsToClients expects SuperDocWithCollaboration
    syncCommentsToClients(
      superdoc as unknown as Parameters<typeof syncCommentsToClients>[0],
      event as unknown as Parameters<typeof syncCommentsToClients>[1],
    );
  };

  /**
   * Cancel the pending comment
   *
   * @param superdoc - The SuperDoc instance
   */
  const cancelComment = (superdoc: SuperDoc): void => {
    removePendingComment(superdoc);
  };

  /**
   * Initialize loaded comments into SuperDoc by mapping the imported
   * comment data to SuperDoc useComment objects.
   *
   * Updates the commentsList ref with the new comments.
   *
   * @param params - Parameters including comments array, editor, and documentId
   */
  const processLoadedDocxComments = async ({
    superdoc,
    editor,
    comments,
    documentId,
  }: {
    superdoc: SuperDoc;
    editor: Editor;
    comments: LoadedDocxComment[];
    documentId: string;
  }): Promise<void> => {
    const superdocStore = useSuperdocStore(); // Access lazily
    const document = superdocStore.getDocument(documentId);
    if (!document) return;

    comments.forEach((comment: LoadedDocxComment) => {
      const htmlContent = getHtmlFromComment(comment.textJson);

      if (!htmlContent && !comment.trackedChange) {
        return;
      }

      const creatorName = comment.creatorName.replace('(imported)', '');
      const importedName = `${creatorName} (imported)`;
      const newComment = useComment({
        fileId: documentId,
        fileType: document.type || undefined,
        commentId: comment.commentId,
        isInternal: false,
        parentCommentId: comment.parentCommentId,
        creatorName,
        createdTime: comment.createdTime,
        creatorEmail: comment.creatorEmail,
        importedAuthor: {
          name: importedName,
          email: comment.creatorEmail,
        },
        commentText: getHtmlFromComment(comment.textJson),
        resolvedTime: comment.isDone ? Date.now() : null,
        resolvedByEmail: comment.isDone ? comment.creatorEmail : null,
        resolvedByName: comment.isDone ? importedName : null,
        trackedChange: comment.trackedChange || false,
        trackedChangeText: comment.trackedChangeText,
        trackedChangeType: comment.trackedChangeType,
        deletedText: comment.trackedDeletedText,
      });

      addComment({ superdoc, comment: newComment });
    });

    setTimeout(() => {
      // do not block the first rendering of the doc
      // and create comments asynchronously.
      createCommentForTrackChanges(editor);
    }, 0);
  };

  /**
   * Create comments for tracked changes that don't have comments
   *
   * @param editor - The Super Editor instance
   */
  const createCommentForTrackChanges = (editor: Editor): void => {
    const editorWithView = editor as EditorWithView;
    const trackedChanges = trackChangesHelpers.getTrackChanges(editorWithView.state);

    const groupedChanges: GroupedChange[] = groupChanges(trackedChanges);

    // Create comments for tracked changes
    // that do not have a corresponding comment (created in Word).
    const { tr } = editorWithView.view.state;
    const { dispatch } = editorWithView.view;

    groupedChanges.forEach(({ insertedMark, deletionMark, formatMark }, index) => {
      console.debug(`Create comment for track change: ${index}`);
      const foundComment = commentsList.value.find(
        (i: UnwrapNestedRefs<UseCommentReturn>) =>
          i.commentId === insertedMark?.mark.attrs.id ||
          i.commentId === deletionMark?.mark.attrs.id ||
          i.commentId === formatMark?.mark.attrs.id,
      );
      const isLastIteration = trackedChanges.length === index + 1;

      if (foundComment) {
        if (isLastIteration) {
          tr.setMeta(CommentsPluginKey, { type: 'force' });
        }
        return;
      }

      if (insertedMark || deletionMark || formatMark) {
        const trackChangesPayload: Record<string, unknown> = {
          ...(insertedMark && { insertedMark: insertedMark.mark }),
          ...(deletionMark && { deletionMark: deletionMark.mark }),
          ...(formatMark && { formatMark: formatMark.mark }),
        };

        if (isLastIteration) tr.setMeta(CommentsPluginKey, { type: 'force' });
        tr.setMeta(CommentsPluginKey, { type: 'forceTrackChanges' });
        tr.setMeta(TrackChangesBasePluginKey, trackChangesPayload);
      }
      dispatch(tr);
    });
  };

  /**
   * Translate comments for export to DOCX format
   *
   * @returns Array of comments with JSON schema
   */
  const translateCommentsForExport = (): Array<
    ReturnType<UseCommentReturn['getValues']> & { commentJSON: unknown }
  > => {
    const processedComments: Array<ReturnType<UseCommentReturn['getValues']> & { commentJSON: unknown }> = [];
    commentsList.value.forEach((comment: UnwrapNestedRefs<UseCommentReturn>) => {
      const values = comment.getValues();
      const richText = values.commentText;
      const schema = convertHtmlToSchema(richText);
      processedComments.push({
        ...values,
        commentJSON: schema,
      });
    });
    return processedComments;
  };

  /**
   * Convert HTML to ProseMirror schema
   *
   * @param commentHTML - HTML string to convert
   * @returns ProseMirror JSON node
   */
  const convertHtmlToSchema = (commentHTML: string): unknown => {
    const div = document.createElement('div');
    div.innerHTML = commentHTML;
    const editor = new EditorClass({
      mode: 'text',
      isHeadless: true,
      content: div,
      extensions: getRichTextExtensions(),
    });
    return editor.getJSON().content[0];
  };

  /**
   * Triggered when the editor locations are updated
   * Updates floating comment locations from the editor
   *
   * @param allCommentPositions - All comment positions from the editor
   */
  const handleEditorLocationsUpdate = (allCommentPositions: EditorCommentPositions | null): void => {
    editorCommentPositions.value = allCommentPositions || {};
  };

  /**
   * Get floating comments (comments that should be displayed in the sidebar)
   */
  const getFloatingComments: ComputedRef<UnwrapNestedRefs<UseCommentReturn>[]> = computed(() => {
    const comments = getGroupedComments.value?.parentComments
      .filter((c: UnwrapNestedRefs<UseCommentReturn>) => !c.resolvedTime)
      .filter((c: UnwrapNestedRefs<UseCommentReturn>) => {
        const keys = Object.keys(editorCommentPositions.value);
        const isPdfComment = c.selection?.source !== 'super-editor';
        if (isPdfComment) return true;
        const commentKey = c.commentId || c.importedId;
        return commentKey && keys.includes(commentKey);
      });
    return comments;
  });

  /**
   * Get HTML content from the comment text JSON (which uses DOCX schema)
   *
   * @param commentTextJson - The comment text JSON
   * @returns The HTML content or undefined
   */
  const normalizeCommentForEditor = (node: CommentTextJson | unknown): unknown => {
    if (!node || typeof node !== 'object') return node;

    const typedNode = node as CommentTextJson;

    const cloneMarks = (marks: unknown[] | undefined): unknown[] | undefined =>
      Array.isArray(marks)
        ? marks.filter(Boolean).map((mark: unknown) => {
            const typedMark = mark as Record<string, unknown>;
            return {
              ...typedMark,
              attrs: typedMark?.attrs ? { ...(typedMark.attrs as Record<string, unknown>) } : undefined,
            };
          })
        : undefined;

    const cloneAttrs = (attrs: Record<string, unknown> | undefined) =>
      attrs && typeof attrs === 'object' ? { ...attrs } : undefined;

    if (!Array.isArray(typedNode.content)) {
      return {
        type: typedNode.type,
        ...(typedNode.text !== undefined ? { text: typedNode.text } : {}),
        ...(typedNode.attrs ? { attrs: cloneAttrs(typedNode.attrs) } : {}),
        ...(typedNode.marks ? { marks: cloneMarks(typedNode.marks) } : {}),
      };
    }

    const normalizedChildren = typedNode.content
      .map((child: CommentTextJson) => normalizeCommentForEditor(child))
      .flat()
      .filter(Boolean);

    if (typedNode.type === 'run') {
      return normalizedChildren;
    }

    return {
      type: typedNode.type,
      ...(typedNode.attrs ? { attrs: cloneAttrs(typedNode.attrs) } : {}),
      ...(typedNode.marks ? { marks: cloneMarks(typedNode.marks) } : {}),
      content: normalizedChildren,
    };
  };

  /**
   * Get HTML from comment JSON
   *
   * @param commentTextJson - Comment text JSON structure
   * @returns HTML string or undefined
   */
  const getHtmlFromComment = (commentTextJson: CommentTextJson): string | undefined => {
    // If no content, we can't convert and its not a valid comment
    if (!commentTextJson.content?.length) return;

    try {
      const normalizedContent = normalizeCommentForEditor(commentTextJson);
      const schemaContent = Array.isArray(normalizedContent) ? normalizedContent[0] : normalizedContent;
      if (!schemaContent || !(schemaContent as CommentTextJson).content?.length) return undefined;
      const editor = new EditorClass({
        mode: 'text',
        isHeadless: true,
        content: schemaContent,
        loadFromSchema: true,
        extensions: getRichTextExtensions(),
      });
      return editor.getHTML();
    } catch (error) {
      console.warn('Failed to convert comment', error);
      return;
    }
  };

  return {
    COMMENT_EVENTS,
    isDebugging,
    hasInitializedComments,
    hasSyncedCollaborationComments,
    editingCommentId,
    activeComment,
    commentDialogs,
    overlappingComments,
    overlappedIds,
    suppressInternalExternal,
    pendingComment,
    currentCommentText,
    commentsList,
    isCommentsListVisible,
    generalCommentIds,
    editorCommentIds,
    commentsParentElement,
    editorCommentPositions,
    hasInitializedLocations,
    isCommentHighlighted,

    // Floating comments
    floatingCommentsOffset,
    sortedConversations,
    visibleConversations,
    skipSelectionUpdate,
    isFloatingCommentsReady,

    // Getters
    getConfig,
    documentsWithConverations,
    getGroupedComments,
    getFloatingComments,

    // Actions
    init,
    getComment,
    setActiveComment,
    getCommentLocation,
    hasOverlapId,
    getPendingComment,
    showAddComment,
    addComment,
    cancelComment,
    deleteComment,
    removePendingComment,
    processLoadedDocxComments,
    translateCommentsForExport,
    handleEditorLocationsUpdate,
    handleTrackedChangeUpdate,
  };
});
