import { ref, reactive, type Ref, type UnwrapNestedRefs } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import useSelection, { type UseSelectionReturn, type UseSelectionParams } from '../../helpers/use-selection';
import useComment, { type UseCommentParams, type UseCommentReturn } from './use-comment';

/**
 * Tracked change information for a conversation
 */
interface TrackedChangeInfo {
  /** Insertion tracked change data */
  insertion: unknown | null;
  /** Deletion tracked change data */
  deletion: unknown | null;
}

/**
 * Parameters for initializing a conversation
 */
export interface UseConversationParams {
  /** Unique identifier for the conversation */
  conversationId?: string;
  /** ID of the document the conversation belongs to */
  documentId?: string;
  /** Email of the conversation creator */
  creatorEmail?: string;
  /** Name of the conversation creator */
  creatorName?: string;
  /** Array of comment parameters to initialize comments */
  comments?: UseCommentParams[];
  /** Selection information for the conversation */
  selection?: UseSelectionParams;
  /** Whether to suppress highlighting */
  suppressHighlight?: boolean;
  /** Whether to suppress click interactions */
  suppressClick?: boolean;
  /** Thread identifier */
  thread?: string | null;
  /** Whether this is a tracked change */
  isTrackedChange?: boolean;
  /** Tracked change information */
  trackedChange?: TrackedChangeInfo;
  /** When the conversation was marked as done */
  markedDone?: string | null;
  /** Email of user who marked conversation as done */
  markedDoneByEmail?: string | null;
  /** Name of user who marked conversation as done */
  markedDoneByName?: string | null;
  /** Whether the conversation is focused */
  isFocused?: boolean;
  /** Whether the comment is internal */
  isInternal?: boolean;
}

/**
 * Conversation values object returned by getValues()
 */
export interface ConversationValues {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** ID of the document the conversation belongs to */
  documentId?: string;
  /** Email of the conversation creator */
  creatorEmail?: string;
  /** Name of the conversation creator */
  creatorName?: string;
  /** Array of comment values */
  comments: ReturnType<UseCommentReturn['getValues']>[];
  /** Selection information */
  selection: ReturnType<UseSelectionReturn['getValues']>;
  /** When the conversation was marked as done */
  markedDone: string | null;
  /** Email of user who marked conversation as done */
  markedDoneByEmail: string | null;
  /** Name of user who marked conversation as done */
  markedDoneByName: string | null;
  /** Whether the conversation is focused */
  isFocused: boolean;
}

/**
 * Return type of the useConversation composable
 */
export interface UseConversationReturn {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** Thread identifier */
  thread: Ref<string | null>;
  /** ID of the document the conversation belongs to */
  documentId?: string;
  /** Email of the conversation creator */
  creatorEmail?: string;
  /** Name of the conversation creator */
  creatorName?: string;
  /** Array of comment instances */
  comments: Ref<UnwrapNestedRefs<UseCommentReturn>[]>;
  /** Selection information */
  selection: UseSelectionReturn;
  /** When the conversation was marked as done */
  markedDone: Ref<string | null>;
  /** Email of user who marked conversation as done */
  markedDoneByEmail: Ref<string | null>;
  /** Name of user who marked conversation as done */
  markedDoneByName: Ref<string | null>;
  /** Whether the conversation is focused */
  isFocused: Ref<boolean>;
  /** Group identifier */
  group: Ref<string | null>;
  /** Reference to the conversation DOM element */
  conversationElement: Ref<HTMLElement | null>;
  /** Whether to suppress highlighting */
  suppressHighlight: Ref<boolean | undefined>;
  /** Whether to suppress click interactions */
  suppressClick: Ref<boolean>;
  /** Whether the comment is internal */
  isInternal: Ref<boolean>;
  /** Whether this is a tracked change */
  isTrackedChange: Ref<boolean>;
  /** Tracked change information */
  trackedChange: TrackedChangeInfo;
  /** Get the raw values of the conversation */
  getValues: () => ConversationValues;
  /** Mark this conversation as done */
  markDone: (email: string, name: string) => void;
}

/**
 * Vue composable for managing conversation state
 *
 * This composable provides state management for comment conversations,
 * including multiple comments in a thread, selection tracking, and
 * conversation resolution (marking as done).
 *
 * @param params - Conversation initialization parameters
 * @returns Conversation state and action methods
 *
 * @example
 * const conversation = useConversation({
 *   conversationId: 'conv-123',
 *   documentId: 'doc-456',
 *   creatorEmail: 'user@example.com',
 *   creatorName: 'John Doe',
 *   comments: [
 *     { commentText: 'First comment', creatorEmail: 'user@example.com' }
 *   ],
 *   selection: {
 *     documentId: 'doc-456',
 *     page: 1,
 *     selectionBounds: { top: 100, left: 50 }
 *   }
 * });
 *
 * conversation.markDone('user@example.com', 'John Doe');
 */
export default function useConversation(params: UseConversationParams): UseConversationReturn {
  const conversationId = params.conversationId || uuidv4();
  const documentId = params.documentId;
  const creatorEmail = params.creatorEmail;
  const creatorName = params.creatorName;
  const comments = ref<UnwrapNestedRefs<UseCommentReturn>[]>(
    params.comments ? params.comments.map((c) => useComment(c)) : [],
  );
  const selection = useSelection(params.selection || { documentId: documentId || '', page: 1, selectionBounds: {} });
  const suppressHighlight = ref(params.suppressHighlight);
  const suppressClick = ref(params.suppressClick || params.selection?.source === 'super-editor');
  const thread = ref<string | null>(params.thread == null ? null : params.thread);
  const isTrackedChange = ref(params.isTrackedChange || false);
  const trackedChange = reactive<TrackedChangeInfo>(params.trackedChange || { insertion: null, deletion: null });

  /* Mark done (resolve) conversations */
  const markedDone = ref<string | null>(params.markedDone || null);
  const markedDoneByEmail = ref<string | null>(params.markedDoneByEmail || null);
  const markedDoneByName = ref<string | null>(params.markedDoneByName || null);
  const group = ref<string | null>(null);
  const isInternal = ref(params.isInternal || true);

  const conversationElement = ref<HTMLElement | null>(null);

  const isFocused = ref(params.isFocused || false);

  /**
   * Mark this conversation as done with UTC date
   *
   * @param email - Email of the user marking the conversation as done
   * @param name - Name of the user marking the conversation as done
   */
  const markDone = (email: string, name: string): void => {
    markedDone.value = new Date().toISOString();
    markedDoneByEmail.value = email;
    markedDoneByName.value = name;
    group.value = null;
  };

  /**
   * Get the raw values of this conversation
   *
   * @returns The raw values of this conversation as a plain object
   */
  const getValues = (): ConversationValues => {
    const values: ConversationValues = {
      // Raw
      conversationId,
      documentId,
      creatorEmail,
      creatorName,

      comments: comments.value.map((c) => c.getValues()),
      selection: selection.getValues(),
      markedDone: markedDone.value,
      markedDoneByEmail: markedDoneByEmail.value,
      markedDoneByName: markedDoneByName.value,
      isFocused: isFocused.value,
    };
    return values;
  };

  const exposedData: UseConversationReturn = {
    conversationId,
    thread,
    documentId,
    creatorEmail,
    creatorName,
    comments,
    selection,
    markedDone,
    markedDoneByEmail,
    markedDoneByName,
    isFocused,
    group,
    conversationElement,
    suppressHighlight,
    suppressClick,
    isInternal,
    isTrackedChange,
    trackedChange,

    // Actions
    getValues,
    markDone,
  };

  return exposedData;
}
