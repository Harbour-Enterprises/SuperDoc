import { ref, shallowRef, type Ref, type ShallowRef, type UnwrapNestedRefs } from 'vue';
import { useField, type UseFieldReturn, type RawField } from './use-field';
import { documentTypes } from '@superdoc/common';
import useComment, { type UseCommentReturn, type UseCommentParams } from '../components/CommentsLayer/use-comment';
import type { Editor, Config } from '../core/types';
import type { Doc } from 'yjs';

/**
 * Annotation object structure
 */
export interface Annotation {
  [key: string]: unknown;
}

/**
 * Document initialization parameters
 */
export interface DocumentParams {
  /** Unique identifier for the document */
  id?: string;
  /** Type of the document */
  type?: string;
  /** Document data (File, Blob, or object) */
  data?: File | Blob | { type?: string } | null;
  /** Document state */
  state?: string;
  /** User's role for this document */
  role?: string;
  /** HTML content */
  html?: string;
  /** Markdown content */
  markdown?: string;
  /** Yjs document for collaboration */
  ydoc?: Doc;
  /** Hocuspocus or WebSocket provider for collaboration (HocuspocusProvider | WebsocketProvider) */
  provider?: unknown;
  /** WebSocket for collaboration */
  socket?: unknown;
  /** Whether this is a new file */
  isNewFile?: boolean;
  /** Field definitions */
  fields?: RawField[];
  /** Annotations */
  annotations?: Annotation[];
  /** Conversation/comment data */
  conversations?: UseCommentParams[];
}

/**
 * Return type of the useDocument composable
 */
export interface UseDocumentReturn {
  /** Document ID */
  id: string | undefined;
  /** Document data */
  data: File | Blob | { type?: string } | null | undefined;
  /** HTML content */
  html: string | undefined;
  /** Markdown content */
  markdown: string | undefined;
  /** Document type/MIME type */
  type: string | null;
  /** SuperDoc configuration */
  config: Config;
  /** Document state */
  state: string | undefined;
  /** User role */
  role: string | undefined;
  /** Core document instance */
  core: Ref<unknown>;
  /** Yjs document */
  ydoc: ShallowRef<Doc | undefined>;
  /** Hocuspocus or WebSocket provider (HocuspocusProvider | WebsocketProvider) */
  provider: ShallowRef<unknown>;
  /** WebSocket connection */
  socket: ShallowRef<unknown>;
  /** Whether this is a new file */
  isNewFile: Ref<boolean | undefined>;
  /** Container element reference */
  container: Ref<HTMLElement | null>;
  /** Page container elements */
  pageContainers: Ref<HTMLElement[]>;
  /** Whether the document is ready */
  isReady: Ref<boolean>;
  /** Whether rulers are shown */
  rulers: Ref<boolean | undefined>;
  /** Raw field data */
  rawFields: Ref<RawField[]>;
  /** Processed field objects */
  fields: Ref<UseFieldReturn[]>;
  /** Document annotations */
  annotations: Ref<Annotation[]>;
  /** Comments/conversations */
  conversations: Ref<UnwrapNestedRefs<UseCommentReturn>[]>;
  /** Set the editor instance */
  setEditor: (editor: Editor) => void;
  /** Get the editor instance */
  getEditor: () => Editor | null;
  /** Set the presentation editor instance */
  setPresentationEditor: (editor: Editor) => void;
  /** Get the presentation editor instance */
  getPresentationEditor: () => Editor | null;
  /** Remove all comments temporarily */
  removeComments: () => void;
  /** Restore previously removed comments */
  restoreComments: () => void;
  /** Remove a specific conversation by ID */
  removeConversation: (conversationId: string) => void;
}

/**
 * Vue composable for managing document state and lifecycle
 *
 * This composable provides comprehensive document management including:
 * - Document metadata and type handling
 * - Editor instance management (docx and presentation editors)
 * - Collaboration state (Yjs, providers, sockets)
 * - Fields, annotations, and comments management
 * - Container and placement references
 *
 * @param params - Document initialization parameters
 * @param superdocConfig - SuperDoc configuration object
 * @returns Document state and action methods
 *
 * @example
 * const document = useDocument({
 *   id: 'doc-123',
 *   type: 'docx',
 *   data: fileBlob,
 *   fields: rawFields,
 *   conversations: comments
 * }, config);
 *
 * document.setEditor(editorInstance);
 * const editor = document.getEditor();
 */
export default function useDocument(params: DocumentParams, superdocConfig: Config): UseDocumentReturn {
  const id = params.id;
  const type = initDocumentType(params);

  const data = params.data;
  const config = superdocConfig;
  const state = params.state;
  const role = params.role;
  const html = params.html;
  const markdown = params.markdown;

  // Placement
  const container = ref<HTMLElement | null>(null);
  const pageContainers = ref<HTMLElement[]>([]);
  const isReady = ref<boolean>(false);
  const rulers = ref<boolean | undefined>(superdocConfig.rulers);

  // Collaboration
  const ydoc = shallowRef<Doc | undefined>(params.ydoc);
  const provider = shallowRef<unknown>(params.provider);
  const socket = shallowRef<unknown>(params.socket);
  const isNewFile = ref<boolean | undefined>(params.isNewFile);

  // For docx
  const editorRef = shallowRef<Editor | null>(null);
  const setEditor = (ref: Editor): void => {
    editorRef.value = ref;
  };
  const getEditor = (): Editor | null => editorRef.value;

  const presentationEditorRef = shallowRef<Editor | null>(null);
  const setPresentationEditor = (ref: Editor): void => {
    presentationEditorRef.value = ref;
  };
  const getPresentationEditor = (): Editor | null => presentationEditorRef.value;

  /**
   * Initialize the mime type of the document
   *
   * @param param0 - The config object
   * @param param0.type - The type of document
   * @param param0.data - The data object
   * @returns The document type
   * @throws Error if the document type is not specified
   */
  function initDocumentType({
    type,
    data,
  }: {
    type?: string;
    data?: File | Blob | { type?: string } | null;
  }): string | null {
    if (data && typeof data === 'object' && 'type' in data && data.type) {
      return data.type;
    }
    if (type) {
      return type in documentTypes ? documentTypes[type as keyof typeof documentTypes] : null;
    }

    throw new Error('Document type not specified for doc: ' + JSON.stringify(params));
  }

  // Comments
  const removeComments = (): void => {
    conversationsBackup.value = conversations.value;
    conversations.value = [];
  };

  const restoreComments = (): void => {
    conversations.value = conversationsBackup.value;
    console.debug('[superdoc] Restored comments:', conversations.value);
  };

  // Modules
  const rawFields = ref<RawField[]>(params.fields || []);
  const fields = ref(params.fields?.map((f: RawField) => useField(f)) || []) as unknown as Ref<UseFieldReturn[]>;
  const annotations = ref<Annotation[]>(params.annotations || []);
  const conversations = ref<UnwrapNestedRefs<UseCommentReturn>[]>(initConversations());
  const conversationsBackup = ref<UnwrapNestedRefs<UseCommentReturn>[]>(conversations.value);

  /**
   * Initialize conversations/comments if the module is enabled
   *
   * @returns Array of conversation objects
   */
  function initConversations(): UnwrapNestedRefs<UseCommentReturn>[] {
    if (!config.modules?.comments) return [];
    return params.conversations?.map((c: UseCommentParams) => useComment(c)) || [];
  }

  const core = ref<unknown>(null);

  /**
   * Remove a conversation by its ID
   *
   * @param conversationId - The ID of the conversation to remove
   */
  const removeConversation = (conversationId: string): void => {
    const index = conversations.value.findIndex(
      (c: UnwrapNestedRefs<UseCommentReturn>) => c.commentId === conversationId,
    );
    if (index > -1) conversations.value.splice(index, 1);
  };

  const returnValue: UseDocumentReturn = {
    id,
    data,
    html,
    markdown,
    type,
    config,
    state,
    role,

    core,
    ydoc,
    provider,
    socket,
    isNewFile,

    // Placement
    container,
    pageContainers,
    isReady,
    rulers,

    // Modules
    rawFields,
    fields,
    annotations,
    conversations,

    // Actions
    setEditor,
    getEditor,
    setPresentationEditor,
    getPresentationEditor,
    removeComments,
    restoreComments,
    removeConversation,
  };

  return returnValue;
}
