import type { Doc as YDoc, Array as YArray, Map as YMap } from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { createProvider } from '../collaboration/collaboration';
import type { SuperDoc, Document } from '../types/index';
import type { User } from './permissions';
import type { CollaborationConfig } from './collaboration';
import { addYComment, updateYComment, deleteYComment } from './collaboration-comments';
import useComment from '../../components/CommentsLayer/use-comment';

/**
 * Comment object returned by useComment composable
 */
interface UseCommentReturn {
  uid: { value: string };
  commentId: string;
  importedId?: string;
  parentCommentId?: string;
  fileId?: string;
  fileType?: string;
  mentions: { value: Array<{ name: string; email: string }> };
  commentElement: { value: HTMLElement | null };
  isFocused: { value: boolean };
  creatorEmail?: string;
  creatorName?: string;
  creatorImage?: string;
  createdTime?: number;
  isInternal: { value: boolean };
  commentText: { value: string };
  selection: unknown;
  floatingPosition: { top: number; left: number; right: number; bottom: number };
  trackedChange: { value: unknown };
  deletedText: { value: string | null };
  trackedChangeType: { value: string | null };
  trackedChangeText: { value: string | null };
  resolvedTime: { value: number | null };
  resolvedByEmail: { value: string | null };
  resolvedByName: { value: string | null };
  importedAuthor: { value: { name?: string; email?: string } | null };
  setText: (params: { text: string; superdoc: SuperDoc; suppressUpdate?: boolean }) => void;
  getValues: () => CommentValues;
  resolveComment: (params: { email: string; name: string; superdoc: SuperDoc }) => void;
  setIsInternal: (params: { isInternal: boolean; superdoc: SuperDoc }) => void;
  setActive: (superdoc: SuperDoc) => void;
  updatePosition: (
    coords: { top: number; left: number; right: number; bottom: number },
    parentElement: HTMLElement,
  ) => void;
  getCommentUser: () => { name: string; email: string; image?: string };
}

/**
 * Comment values object
 */
interface CommentValues {
  commentId: string;
  fileId?: string;
  [key: string]: unknown;
}

/**
 * Type guard to validate comment data from Yjs before converting
 * Ensures the data has the required structure for useComment
 *
 * @param data - Unknown data to validate
 * @returns True if data is a valid CommentValues object
 */
const isValidCommentData = (data: unknown): data is CommentValues => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.commentId === 'string' && obj.commentId.length > 0;
};

/**
 * Comment event for synchronization
 */
interface CommentSyncEvent {
  type: 'add' | 'update' | 'resolved' | 'deleted';
  comment: CommentValues;
}

/**
 * Document object with collaboration properties
 * Extends base Document - all collaboration properties are now in the base Document interface
 */
type CollaborativeDocument = Document;

/**
 * Comments store interface
 */
interface CommentsStore {
  commentsParentElement: HTMLElement | null;
  editorCommentIds: string[];
  hasSyncedCollaborationComments: boolean;
  commentsList: UseCommentReturn[];
  handleEditorLocationsUpdate: (parent: HTMLElement | null, ids: string[]) => void;
}

/**
 * SuperDoc instance with collaboration properties
 */
interface SuperDocWithCollaboration {
  provider?: WebsocketProvider | HocuspocusProvider;
  ydoc: YDoc;
  config: SuperDoc['config'];
  commentsStore: CommentsStore;
  isCollaborative?: boolean;
  colors: string[];
}

/**
 * Provider result from createProvider
 */
interface ProviderResult {
  provider: WebsocketProvider | HocuspocusProvider;
  ydoc: YDoc;
}

/**
 * Initialize sync for comments if the module is enabled
 *
 * @param superdoc - The SuperDoc instance
 */
export const initCollaborationComments = (superdoc: SuperDocWithCollaboration): void => {
  if (!superdoc.config.modules?.comments || !superdoc.provider) return;

  // If we have comments and collaboration, wait for sync and then let the store know when its ready
  const onSuperDocYdocSynced = () => {
    // Update the editor comment locations
    const parent = superdoc.commentsStore.commentsParentElement;
    const ids = superdoc.commentsStore.editorCommentIds;
    superdoc.commentsStore.handleEditorLocationsUpdate(parent, ids);
    superdoc.commentsStore.hasSyncedCollaborationComments = true;

    // Unsubscribe from both events
    (superdoc.provider as unknown as { off: (event: string, callback: () => void) => void })?.off(
      'synced',
      onSuperDocYdocSynced,
    );
    (superdoc.provider as unknown as { off: (event: string, callback: () => void) => void })?.off(
      'sync',
      onSuperDocYdocSynced,
    );
  };

  // Subscribe to both events to support both provider types
  // WebsocketProvider uses 'synced', HocuspocusProvider uses 'sync'
  (superdoc.provider as unknown as { on: (event: string, callback: () => void) => void }).on(
    'synced',
    onSuperDocYdocSynced,
  );
  (superdoc.provider as unknown as { on: (event: string, callback: () => void) => void }).on(
    'sync',
    onSuperDocYdocSynced,
  );

  // Get the comments array from the Y.Doc
  const commentsArray = superdoc.ydoc!.getArray('comments') as YArray<YMap<unknown>>;

  // Observe changes to the comments array
  commentsArray.observe((event) => {
    // Ignore events if triggered by the current user
    const currentUser = superdoc.config.user;
    const origin = event.transaction.origin as { user?: User } | undefined;
    const user = origin?.user;

    if (currentUser && user && currentUser.name === user.name && currentUser.email === user.email) return;

    // Update conversations
    const comments = commentsArray.toJSON();

    const seen = new Set<string>();
    const filtered: CommentValues[] = [];
    comments.forEach((c) => {
      // Validate comment data before adding to filtered list
      if (isValidCommentData(c) && !seen.has(c.commentId)) {
        seen.add(c.commentId);
        filtered.push(c);
      }
    });

    // Map validated comments to useComment instances
    // Type assertion needed as useComment returns reactive objects that differ from interface
    superdoc.commentsStore.commentsList = filtered.map((c) => useComment(c)) as unknown as UseCommentReturn[];
  });
};

/**
 * Initialize SuperDoc general Y.Doc for high level collaboration
 * Assigns superdoc.ydoc and superdoc.provider in place
 *
 * @param superdoc - The SuperDoc instance
 * @returns The ydoc and provider, or undefined if not configured
 */
export const initSuperdocYdoc = (superdoc: SuperDoc): ProviderResult | undefined => {
  const { isInternal } = superdoc.config;
  const baseName = `${superdoc.config.superdocId}-superdoc`;
  if (!superdoc.config.superdocId) return;

  const documentId = isInternal ? baseName : `${baseName}-external`;
  const superdocCollaborationOptions = {
    config: superdoc.config.modules?.collaboration as CollaborationConfig,
    user: superdoc.config.user as User,
    documentId,
    socket: (superdoc.config as unknown as Record<string, unknown>).socket as unknown,
    superdocInstance: superdoc,
  };

  const { provider: superdocProvider, ydoc: superdocYdoc } = createProvider(superdocCollaborationOptions);

  return { ydoc: superdocYdoc, provider: superdocProvider };
};

/**
 * Process SuperDoc's documents to make them collaborative by
 * adding provider, ydoc, awareness handler, and socket to each document.
 *
 * @param superdoc - The SuperDoc instance
 * @returns The processed documents
 */
export const makeDocumentsCollaborative = (superdoc: SuperDocWithCollaboration): CollaborativeDocument[] => {
  const processedDocuments: CollaborativeDocument[] = [];

  if (!superdoc.config.documents) return processedDocuments;

  superdoc.config.documents.forEach((doc, index) => {
    if (superdoc.config.user && superdoc.colors && superdoc.colors.length > 0) {
      // Add color property to user (not in base User type but set at runtime)
      (superdoc.config.user as unknown as Record<string, unknown>).color = superdoc.colors[0];
    }

    const options = {
      config: superdoc.config.modules?.collaboration as CollaborationConfig,
      user: superdoc.config.user as User,
      documentId: doc.id || '',
      socket: (superdoc.config as unknown as Record<string, unknown>).socket as unknown,
      superdocInstance: superdoc as unknown as SuperDoc,
    };

    const { provider, ydoc } = createProvider(options);

    // Mutate the existing document entry so downstream consumers (including Pinia store)
    // continue to see provider/ydoc on the same object reference.
    doc.provider = provider;
    doc.socket = (superdoc.config as unknown as Record<string, unknown>).socket as unknown;
    doc.ydoc = ydoc;
    doc.role = superdoc.config.role;
    doc.id = doc.id || options.documentId;

    processedDocuments.push(doc as CollaborativeDocument);
    // Keep config.documents in sync with the mutated document
    superdoc.config.documents![index] = doc;
  });

  // Ensure config.documents references the updated objects with provider/ydoc
  superdoc.config.documents = processedDocuments as unknown as SuperDoc['config']['documents'];

  return processedDocuments;
};

/**
 * Sync local comments with ydoc and other clients if in collaboration mode and comments module is enabled
 *
 * @param superdoc - The SuperDoc instance
 * @param event - The comment synchronization event
 */
export const syncCommentsToClients = (superdoc: SuperDocWithCollaboration, event: CommentSyncEvent): void => {
  if (!superdoc.isCollaborative || !superdoc.config.modules?.comments) return;

  const yArray = superdoc.ydoc!.getArray('comments') as YArray<YMap<unknown>>;

  switch (event.type) {
    case 'add':
      addYComment(yArray, superdoc.ydoc!, event, superdoc as unknown as SuperDoc);
      break;
    case 'update':
      updateYComment(yArray, superdoc.ydoc!, event, superdoc as unknown as SuperDoc);
      break;
    case 'resolved':
      updateYComment(yArray, superdoc.ydoc!, event, superdoc as unknown as SuperDoc);
      break;
    case 'deleted':
      deleteYComment(yArray, superdoc.ydoc!, event, superdoc as unknown as SuperDoc);
      break;
  }
};
