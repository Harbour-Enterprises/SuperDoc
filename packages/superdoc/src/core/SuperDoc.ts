import '../style.css';

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { Doc as YDoc } from 'yjs';
import type { App as VueApp } from 'vue';
import type { Pinia } from 'pinia';

import { DOCX, PDF, HTML } from '@superdoc/common';
import { SuperToolbar, createZip } from '@harbour-enterprises/super-editor';
import { SuperComments } from '../components/CommentsLayer/commentsList/super-comments-list';
import { createSuperdocVueApp } from './create-app';
import { shuffleArray } from '@superdoc/common/collaboration/awareness';
import { createDownload, cleanName } from './helpers/export';
import { initSuperdocYdoc, initCollaborationComments, makeDocumentsCollaborative } from './collaboration/helpers';
import { normalizeDocumentEntry } from './helpers/file';
import { isAllowed } from './collaboration/permissions';
import type {
  User,
  Config,
  Document,
  Editor,
  DocumentMode,
  ExportParams,
  ExportType,
  CommentsType,
  Modules,
  PermissionResolverParams,
} from './types';
import type { SuperDocEvents } from './SuperDoc.types';

const DEFAULT_USER: Readonly<User> = Object.freeze({
  name: 'Default SuperDoc user',
  email: null,
});

/**
 * SuperDoc class
 *
 * The main SuperDoc class that manages document editing, collaboration,
 * and all related functionality. It extends EventEmitter to provide
 * a robust event system for document lifecycle management.
 *
 * @class
 * @extends EventEmitter
 *
 * @example
 * const superdoc = new SuperDoc({
 *   selector: '#editor',
 *   documentMode: 'editing',
 *   role: 'editor',
 *   document: { url: '/path/to/document.docx', type: 'docx' },
 *   user: { name: 'John Doe', email: 'john@example.com' }
 * });
 */
export class SuperDoc extends EventEmitter<SuperDocEvents> {
  /** Allowed document types */
  static allowedTypes: string[] = [DOCX, PDF, HTML];

  /** Version of SuperDoc */
  version: string;

  /** All users who have access to this superdoc */
  users: User[];

  /** Yjs document for collaboration */
  ydoc?: YDoc;

  /** HocusPocus provider for collaboration */
  provider?: HocuspocusProvider;

  /** Configuration object */
  config: Config;

  /** Vue application instance */
  app!: VueApp;

  /** Pinia store instance */
  pinia!: Pinia;

  /** SuperDoc store */
  superdocStore!: ReturnType<typeof import('../stores/superdoc-store').useSuperdocStore>;

  /** Comments store */
  commentsStore!: ReturnType<typeof import('../stores/comments-store').useCommentsStore>;

  /** High contrast mode store */
  highContrastModeStore!: ReturnType<typeof import('../composables/use-high-contrast-mode').useHighContrastMode>;

  /** Unique ID for this SuperDoc instance */
  superdocId: string;

  /** Available colors for user awareness */
  colors: string[];

  /** Map of users to their assigned colors */
  userColorMap: Map<string, string>;

  /** Current index for color assignment */
  colorIndex: number;

  /** Current user */
  user: User;

  /** Socket connection (deprecated) */
  socket: null;

  /** Whether running in development mode */
  isDev: boolean;

  /** Currently active editor instance */
  activeEditor: Editor | null;

  /** All comments in the document */
  comments: unknown[];

  /** Number of editors that have been initialized */
  readyEditors: number;

  /** Whether the document is locked */
  isLocked: boolean;

  /** User who locked the document */
  lockedBy: User | null;

  /** Toolbar instance */
  toolbar: InstanceType<typeof SuperToolbar> | null;

  /** Toolbar DOM element */
  toolbarElement?: string | HTMLElement;

  /** Comments list instance */
  commentsList?: SuperComments;

  /** Whether this SuperDoc uses collaboration */
  isCollaborative?: boolean;

  /** Pending collaboration saves counter */
  pendingCollaborationSaves: number;

  /**
   * Create a new SuperDoc instance
   *
   * @param config - Configuration options for SuperDoc
   */
  constructor(config: Config) {
    super();
    this.version = '';
    this.users = [];
    this.config = {
      selector: '#superdoc',
      documentMode: 'editing',
      role: 'editor',
      document: {},
      documents: [],
      editorExtensions: [],
      colors: [],
      user: { name: '', email: null },
      users: [],
      modules: {},
      title: 'SuperDoc',
      conversations: [],
      isInternal: false,
      toolbarGroups: ['left', 'center', 'right'],
      toolbarIcons: {},
      toolbarTexts: {},
      isDev: false,
      onEditorBeforeCreate: () => {
        /* Lifecycle hook - override in config */
      },
      onEditorCreate: () => {
        /* Lifecycle hook - override in config */
      },
      onEditorDestroy: () => {
        /* Lifecycle hook - override in config */
      },
      onContentError: () => {
        /* Lifecycle hook - override in config */
      },
      onReady: () => {
        /* Lifecycle hook - override in config */
      },
      onCommentsUpdate: () => {
        /* Lifecycle hook - override in config */
      },
      onAwarenessUpdate: () => {
        /* Lifecycle hook - override in config */
      },
      onLocked: () => {
        /* Lifecycle hook - override in config */
      },
      onPdfDocumentReady: () => {
        /* Lifecycle hook - override in config */
      },
      onSidebarToggle: () => {
        /* Lifecycle hook - override in config */
      },
      onCollaborationReady: () => {
        /* Lifecycle hook - override in config */
      },
      onEditorUpdate: () => {
        /* Lifecycle hook - override in config */
      },
      onCommentsListChange: () => {
        /* Lifecycle hook - override in config */
      },
      onException: () => {
        /* Lifecycle hook - override in config */
      },
      onListDefinitionsChange: () => {
        /* Lifecycle hook - override in config */
      },
      onTransaction: () => {
        /* Lifecycle hook - override in config */
      },
      disableContextMenu: false,
      useLayoutEngine: true,
    };
    this.superdocId = '';
    this.colors = [];
    this.userColorMap = new Map();
    this.colorIndex = 0;
    this.user = { ...DEFAULT_USER };
    this.socket = null;
    this.isDev = false;
    this.activeEditor = null;
    this.comments = [];
    this.readyEditors = 0;
    this.isLocked = false;
    this.lockedBy = null;
    this.toolbar = null;
    this.pendingCollaborationSaves = 0;

    // Initialize asynchronously with proper error handling
    // Errors are caught and emitted as exception events rather than
    // being swallowed silently by the void operator
    this.#init(config).catch((error) => {
      console.error('[superdoc] Initialization failed:', error);
      this.emit('exception', { error: error as Error });
    });
  }

  /**
   * Initialize the SuperDoc instance
   *
   * @param config - Configuration options
   */
  async #init(config: Config): Promise<void> {
    this.config = {
      ...this.config,
      ...config,
    };

    const incomingUser = this.config.user;
    if (!incomingUser || typeof incomingUser !== 'object') {
      this.config.user = { ...DEFAULT_USER };
    } else {
      this.config.user = {
        ...DEFAULT_USER,
        ...incomingUser,
      };
      if (!this.config.user.name) {
        this.config.user.name = DEFAULT_USER.name;
      }
    }

    // Initialize tracked changes defaults based on document mode
    if (!this.config.layoutEngineOptions) {
      this.config.layoutEngineOptions = {};
    }
    // Only set defaults if user didn't explicitly configure tracked changes
    if (!this.config.layoutEngineOptions.trackedChanges) {
      // Default: ON for editing/suggesting modes, OFF for viewing mode
      const isViewingMode = this.config.documentMode === 'viewing';
      this.config.layoutEngineOptions.trackedChanges = {
        mode: isViewingMode ? 'final' : 'review',
        enabled: !isViewingMode,
      };
    }

    this.config.modules = this.config.modules || {};
    if (!Object.prototype.hasOwnProperty.call(this.config.modules, 'comments')) {
      this.config.modules.comments = {};
    }

    this.config.colors = shuffleArray((this.config.colors || []) as `#${string}`[]) as string[];
    this.userColorMap = new Map();
    this.colorIndex = 0;

    this.version = __APP_VERSION__;
    this.#log('🦋 [superdoc] Using SuperDoc version:', this.version);

    this.superdocId = config.superdocId || uuidv4();
    this.colors = this.config.colors || [];

    // Preprocess document
    this.#initDocuments();

    // Initialize collaboration if configured
    await this.#initCollaboration(this.config.modules);

    // Apply csp nonce if provided
    if (this.config.cspNonce) this.#patchNaiveUIStyles();

    this.#initVueApp();
    this.#initListeners();

    this.user = this.config.user; // The current user
    this.users = this.config.users || []; // All users who have access to this superdoc
    this.socket = null;

    this.isDev = this.config.isDev || false;

    this.activeEditor = null;
    this.comments = [];

    if (!this.config.selector) {
      throw new Error('SuperDoc: selector is required');
    }

    this.app.mount(this.config.selector);

    // Required editors
    this.readyEditors = 0;

    this.isLocked = this.config.isLocked || false;
    this.lockedBy = this.config.lockedBy || null;

    // If a toolbar element is provided, render a toolbar
    this.#addToolbar();
  }

  /**
   * Get the number of editors that are required for this superdoc
   *
   * @returns The number of required editors
   */
  get requiredNumberOfEditors(): number {
    return this.superdocStore.documents.filter((d) => d.type === DOCX).length;
  }

  /**
   * Get the current state of the SuperDoc
   *
   * @returns The current state containing documents and users
   */
  get state(): { documents: unknown[]; users: User[] } {
    return {
      documents: this.superdocStore.documents,
      users: this.users,
    };
  }

  /**
   * Get the SuperDoc container element
   *
   * @returns The DOM element or null if not found
   */
  get element(): HTMLElement | null {
    if (typeof this.config.selector === 'string') {
      return document.querySelector(this.config.selector);
    }
    return this.config.selector;
  }

  /**
   * Patch Naive UI to add CSP nonce to dynamically created style elements
   */
  #patchNaiveUIStyles(): void {
    const cspNonce = this.config.cspNonce;
    if (!cspNonce) return;

    const originalCreateElement = document.createElement;
    document.createElement = function (tagName: string): HTMLElement {
      const element = originalCreateElement.call(this, tagName);
      if (tagName.toLowerCase() === 'style') {
        element.setAttribute('nonce', cspNonce);
      }
      return element;
    };
  }

  /**
   * Initialize documents from configuration
   *
   * Normalizes and processes document configuration into a consistent format
   */
  #initDocuments(): void {
    const doc = this.config.document;
    const hasDocumentConfig = !!doc && typeof doc === 'object' && Object.keys(this.config.document as object)?.length;
    const hasDocumentUrl = !!doc && typeof doc === 'string' && doc.length > 0;
    const hasDocumentFile = !!doc && typeof File === 'function' && doc instanceof File;
    const hasDocumentBlob = !!doc && doc instanceof Blob && !(doc instanceof File);
    const hasListOfDocuments = this.config.documents && this.config.documents?.length;

    if (hasDocumentConfig && hasListOfDocuments) {
      console.warn('🦋 [superdoc] You can only provide one of document or documents');
    }

    if (hasDocumentConfig) {
      // If an uploader-specific wrapper was passed, normalize it.
      const normalized = normalizeDocumentEntry(this.config.document);
      const normalizedObj = normalized && typeof normalized === 'object' ? normalized : {};
      this.config.documents = [
        {
          id: uuidv4(),
          type: DOCX,
          ...normalizedObj,
        } as Document,
      ];
    } else if (hasDocumentUrl) {
      this.config.documents = [
        {
          id: uuidv4(),
          type: DOCX,
          url: this.config.document as string,
          name: 'document.docx',
          isNewFile: true,
        },
      ];
    } else if (hasDocumentFile) {
      const normalized = normalizeDocumentEntry(this.config.document);
      const normalizedObj = normalized && typeof normalized === 'object' ? normalized : {};
      this.config.documents = [
        {
          id: uuidv4(),
          type: DOCX,
          ...normalizedObj,
        } as Document,
      ];
    } else if (hasDocumentBlob) {
      const normalized = normalizeDocumentEntry(this.config.document);
      const normalizedObj = normalized && typeof normalized === 'object' ? normalized : {};
      this.config.documents = [
        {
          id: uuidv4(),
          type: DOCX,
          ...normalizedObj,
        } as Document,
      ];
    }

    // Also normalize any provided documents array entries (e.g., when consumer passes uploader wrappers directly)
    if (Array.isArray(this.config.documents) && this.config.documents.length > 0) {
      this.config.documents = this.config.documents.map((d) => {
        const normalized = normalizeDocumentEntry(d);

        if (!normalized || typeof normalized !== 'object') {
          return normalized as Document;
        }

        const existingId =
          (typeof normalized === 'object' && 'id' in normalized && normalized.id) ||
          (d && typeof d === 'object' && 'id' in d && d.id);

        return {
          type: DOCX,
          ...normalized,
          id: existingId || uuidv4(),
        } as Document;
      });
    }
  }

  /**
   * Initialize the Vue app and stores
   */
  #initVueApp(): void {
    const { app, pinia, superdocStore, commentsStore, highContrastModeStore } = createSuperdocVueApp();
    this.app = app;
    this.pinia = pinia;
    this.app.config.globalProperties.$config = this.config;
    this.app.config.globalProperties.$documentMode = this.config.documentMode;

    this.app.config.globalProperties.$superdoc = this;
    this.superdocStore = superdocStore;
    this.commentsStore = commentsStore;
    this.highContrastModeStore = highContrastModeStore;

    if (typeof this.superdocStore.setExceptionHandler === 'function') {
      this.superdocStore.setExceptionHandler((payload) => this.emit('exception', payload));
    }

    this.superdocStore.init(this.config);

    const commentsModuleConfig = this.config.modules?.comments;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.commentsStore.init((commentsModuleConfig as any) || {});
  }

  /**
   * Initialize event listeners
   */
  #initListeners(): void {
    if (this.config.onEditorBeforeCreate)
      this.on('editorBeforeCreate', (data) => this.config.onEditorBeforeCreate?.(data.editor));
    if (this.config.onEditorCreate) this.on('editorCreate', (data) => this.config.onEditorCreate?.(data.editor));
    if (this.config.onEditorDestroy) this.on('editorDestroy', () => this.config.onEditorDestroy?.());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.config.onReady) this.on('ready', (data) => this.config.onReady?.(data as any));
    if (this.config.onCommentsUpdate) this.on('comments-update', (data) => this.config.onCommentsUpdate?.(data));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.config.onAwarenessUpdate)
      this.on('awareness-update', (data) => this.config.onAwarenessUpdate?.(data as any));
    if (this.config.onLocked) this.on('locked', this.config.onLocked);
    if (this.config.onPdfDocumentReady) this.on('pdf-document-ready', this.config.onPdfDocumentReady);
    if (this.config.onSidebarToggle) this.on('sidebar-toggle', this.config.onSidebarToggle);
    if (this.config.onCollaborationReady) this.on('collaboration-ready', this.config.onCollaborationReady);
    if (this.config.onEditorUpdate) this.on('editor-update', this.config.onEditorUpdate);
    this.on('content-error', this.onContentError.bind(this));
    if (this.config.onException) this.on('exception', this.config.onException);
    if (this.config.onListDefinitionsChange) this.on('list-definitions-change', this.config.onListDefinitionsChange);

    if (this.config.onFontsResolved) {
      this.on('fonts-resolved', this.config.onFontsResolved);
    }
  }

  /**
   * Initialize collaboration if configured
   *
   * @param modules - Module configuration
   * @returns The processed documents with collaboration enabled
   */
  async #initCollaboration(modules: Modules = {}): Promise<Document[]> {
    const { collaboration: collaborationModuleConfig, comments: commentsConfig = {} } = modules;

    if (!collaborationModuleConfig) return this.config.documents || [];

    // Flag this superdoc as collaborative
    this.isCollaborative = true;

    // Start a socket for all documents and general metaMap for this SuperDoc
    if (collaborationModuleConfig.providerType === 'hocuspocus' && collaborationModuleConfig.url) {
      const socket = new HocuspocusProviderWebsocket({
        url: collaborationModuleConfig.url,
      });
      this.config.socket = {
        cancelWebsocketRetry: () => socket.cancelWebsocketRetry?.(),
        disconnect: () => socket.disconnect(),
        destroy: () => socket.destroy(),
      };
    }

    // Initialize collaboration for documents
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedDocuments = makeDocumentsCollaborative(this as any);

    // Optionally, initialize separate superdoc sync - for comments, view, etc.
    if (commentsConfig.useInternalExternalComments && !commentsConfig.suppressInternalExternalComments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = initSuperdocYdoc(this as any);
      if (result) {
        this.ydoc = result.ydoc;
        this.provider = result.provider as HocuspocusProvider;
      }
    } else {
      this.ydoc = processedDocuments[0]?.ydoc;
      this.provider = processedDocuments[0]?.provider as HocuspocusProvider | undefined;
    }

    // Initialize comments sync, if enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initCollaborationComments(this as any);

    return processedDocuments as unknown as Document[];
  }

  /**
   * Add a user to the shared users list
   *
   * @param user - The user to add
   */
  addSharedUser(user: User): void {
    if (this.users.some((u) => u.email === user.email)) return;
    this.users.push(user);
  }

  /**
   * Remove a user from the shared users list
   *
   * @param email - The email of the user to remove
   */
  removeSharedUser(email: string): void {
    this.users = this.users.filter((u) => u.email !== email);
  }

  /**
   * Triggered when there is an error in the content
   *
   * @param params - Error parameters
   * @param params.error - The error that occurred
   * @param params.editor - The editor that caused the error
   */
  onContentError({ error, editor }: { error: Error; editor: Editor }): void {
    const { documentId } = editor.options;
    const doc = this.superdocStore.documents.find((d) => d.id === documentId);
    if (!doc) return;

    this.config.onContentError?.({
      error: error as object,
      editor,
      documentId: doc.id || '',
      file: (doc.data as File | Blob) || null,
    });
  }

  /**
   * Triggered when the PDF document is ready
   */
  broadcastPdfDocumentReady(): void {
    this.emit('pdf-document-ready');
  }

  /**
   * Triggered when the superdoc is ready
   */
  broadcastReady(): void {
    if (this.readyEditors === this.requiredNumberOfEditors) {
      this.emit('ready', { superdoc: this });
    }
  }

  /**
   * Triggered before an editor is created
   *
   * @param editor - The editor that is about to be created
   */
  broadcastEditorBeforeCreate(editor: Editor): void {
    this.emit('editorBeforeCreate', { editor });
  }

  /**
   * Triggered when an editor is created
   *
   * @param editor - The editor that was created
   */
  broadcastEditorCreate(editor: Editor): void {
    this.readyEditors++;
    this.broadcastReady();
    this.emit('editorCreate', { editor });
  }

  /**
   * Triggered when an editor is destroyed
   */
  broadcastEditorDestroy(): void {
    this.emit('editorDestroy');
  }

  /**
   * Triggered when the comments sidebar is toggled
   *
   * @param isOpened - Whether the sidebar is opened
   */
  broadcastSidebarToggle(isOpened: boolean): void {
    this.emit('sidebar-toggle', isOpened);
  }

  /**
   * Log debug messages
   *
   * @param args - Arguments to log
   */
  #log(...args: unknown[]): void {
    (console.debug ? console.debug : console.log)('🦋 🦸‍♀️ [superdoc]', ...args);
  }

  /**
   * Set the active editor
   *
   * @param editor - The editor to set as active
   */
  setActiveEditor(editor: Editor): void {
    this.activeEditor = editor;
    if (this.toolbar) {
      this.activeEditor.toolbar = this.toolbar;
      this.toolbar.setActiveEditor(editor);
    }
  }

  /**
   * Toggle the ruler visibility for SuperEditors
   */
  toggleRuler(): void {
    this.config.rulers = !this.config.rulers;
    this.superdocStore.documents.forEach((doc) => {
      doc.rulers.value = this.config.rulers;
    });
  }

  /**
   * Determine whether the current configuration allows a given permission.
   *
   * Used by downstream consumers (toolbar, context menu, commands) to keep
   * tracked-change affordances consistent with customer overrides. This method
   * checks permissions against the configured role, internal/external context,
   * and any custom permission resolver provided in the configuration.
   *
   * Common permission keys include:
   * - 'RESOLVE_OWN' - Can resolve own comments
   * - 'RESOLVE_ANY' - Can resolve any comment
   * - 'DELETE_OWN' - Can delete own comments
   * - 'DELETE_ANY' - Can delete any comment
   * - 'ACCEPT_CHANGES' - Can accept tracked changes
   * - 'REJECT_CHANGES' - Can reject tracked changes
   *
   * @param params - Permission parameters
   * @param params.permission - Permission key to evaluate (e.g., 'RESOLVE_OWN', 'DELETE_ANY')
   * @param params.role - Role to evaluate against (defaults to config.role). Values: 'editor', 'suggester', 'viewer'
   * @param params.isInternal - Whether this is an internal context (defaults to config.isInternal)
   * @param params.comment - Comment object if already resolved (optional)
   * @param params.trackedChange - Tracked change metadata with id, attrs, etc. (optional)
   * @returns True if the permission is allowed, false otherwise
   *
   * @example
   * // Check if current user can resolve their own comments
   * const canResolve = superdoc.canPerformPermission({
   *   permission: 'RESOLVE_OWN',
   *   comment: myComment
   * });
   *
   * @example
   * // Check permission for a tracked change
   * const canAccept = superdoc.canPerformPermission({
   *   permission: 'ACCEPT_CHANGES',
   *   trackedChange: { id: 'change-123' }
   * });
   */
  canPerformPermission(
    {
      permission,
      role = this.config.role,
      isInternal = this.config.isInternal,
      comment = null,
      trackedChange = null,
    }: {
      permission: string;
      role?: string;
      isInternal?: boolean;
      comment?: object | null;
      trackedChange?: { commentId?: string; id?: string; comment?: object } | null;
    } = { permission: '' },
  ): boolean {
    if (!permission) return false;

    let resolvedComment = comment ?? trackedChange?.comment ?? null;

    const commentId = trackedChange?.commentId || trackedChange?.id;
    if (!resolvedComment && commentId && this.commentsStore?.getComment) {
      const storeComment = this.commentsStore.getComment(commentId);
      resolvedComment = storeComment?.getValues ? storeComment.getValues() : storeComment;
    }

    const context: PermissionResolverParams = {
      permission,
      role,
      isInternal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      superdoc: this as any,
      currentUser: this.config.user,
      comment: resolvedComment ?? null,
      trackedChange: trackedChange ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return isAllowed(permission as any, (role || 'viewer') as any, isInternal || false, context as any);
  }

  /**
   * Add a toolbar to the SuperDoc
   */
  #addToolbar(): void {
    const moduleConfig = this.config.modules?.toolbar || {};
    this.toolbarElement = this.config.modules?.toolbar?.selector || this.config.toolbar;
    this.toolbar = null;

    const config = {
      selector: this.toolbarElement || null,
      isDev: this.isDev || false,
      toolbarGroups: this.config.modules?.toolbar?.groups || this.config.toolbarGroups,
      role: this.config.role,
      icons: this.config.modules?.toolbar?.icons || this.config.toolbarIcons,
      texts: this.config.modules?.toolbar?.texts || this.config.toolbarTexts,
      fonts: this.config.modules?.toolbar?.fonts || null,
      hideButtons: this.config.modules?.toolbar?.hideButtons ?? true,
      responsiveToContainer: this.config.modules?.toolbar?.responsiveToContainer ?? false,
      documentMode: this.config.documentMode,
      superdoc: this,
      aiApiKey: this.config.modules?.ai?.apiKey,
      aiEndpoint: this.config.modules?.ai?.endpoint,
      ...moduleConfig,
    };

    this.toolbar = new SuperToolbar(config);

    this.toolbar.on('superdoc-command', this.onToolbarCommand.bind(this));
    this.toolbar.on('exception', this.config.onException);
    this.once('editorCreate', () => this.toolbar?.updateToolbarState());
  }

  /**
   * Add a comments list to the superdoc
   * Requires the comments module to be enabled
   *
   * @param element - The DOM element to render the comments list in
   */
  addCommentsList(element?: HTMLElement): void {
    if (!this.config?.modules?.comments || this.config.role === 'viewer') return;
    this.#log('🦋 [superdoc] Adding comments list to:', element);

    if (element && this.config.modules.comments) {
      this.config.modules.comments.element = element;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.commentsList = new SuperComments(this.config.modules?.comments || {}, this as any);

    if (this.config.onCommentsListChange) {
      this.config.onCommentsListChange({ isRendered: true });
    }
  }

  /**
   * Remove the comments list from the superdoc
   */
  removeCommentsList(): void {
    if (this.commentsList) {
      this.commentsList.close();
      this.commentsList = undefined;
      if (this.config.onCommentsListChange) {
        this.config.onCommentsListChange({ isRendered: false });
      }
    }
  }

  /**
   * Toggle the custom context menu globally.
   * Updates both flow editors and PresentationEditor instances so downstream listeners can short-circuit early.
   *
   * @param disabled - Whether to disable the context menu
   */
  setDisableContextMenu(disabled = true): void {
    const nextValue = Boolean(disabled);
    if (this.config.disableContextMenu === nextValue) return;
    this.config.disableContextMenu = nextValue;

    this.superdocStore?.documents?.forEach((doc) => {
      const presentationEditor = doc.getPresentationEditor?.();
      if (presentationEditor && 'setContextMenuDisabled' in presentationEditor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (presentationEditor as any).setContextMenuDisabled(nextValue);
      }
      const editor = doc.getEditor?.();
      if (editor?.setOptions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor.setOptions({ disableContextMenu: nextValue } as any);
      }
    });
  }

  /**
   * Triggered when a toolbar command is executed
   *
   * @param params - Command parameters
   * @param params.item - The toolbar item that was clicked
   * @param params.argument - The argument passed to the command
   */
  onToolbarCommand({ item, argument }: { item: { command: string }; argument: string }): void {
    if (item.command === 'setDocumentMode') {
      this.setDocumentMode(argument as DocumentMode);
    } else if (item.command === 'setZoom') {
      this.superdocStore.activeZoom = parseFloat(argument);
    }
  }

  /**
   * Set the document mode
   *
   * @param type - The document mode to set
   */
  setDocumentMode(type: DocumentMode): void {
    if (!type) return;

    const normalizedType = type.toLowerCase() as DocumentMode;
    this.config.documentMode = normalizedType;

    const types: Record<DocumentMode, () => void> = {
      viewing: () => this.#setModeViewing(),
      editing: () => this.#setModeEditing(),
      suggesting: () => this.#setModeSuggesting(),
    };

    if (types[normalizedType]) types[normalizedType]();
  }

  /**
   * Set the document mode on a document's editor (PresentationEditor or Editor).
   * Tries PresentationEditor first, falls back to Editor for backward compatibility.
   *
   * @param doc - The document object
   * @param mode - The document mode ('editing', 'viewing', 'suggesting')
   */
  #applyDocumentMode(
    doc: ReturnType<typeof import('../stores/superdoc-store').useSuperdocStore>['documents'][0],
    mode: DocumentMode,
  ): void {
    const presentationEditor = typeof doc.getPresentationEditor === 'function' ? doc.getPresentationEditor() : null;
    if (presentationEditor && 'setDocumentMode' in presentationEditor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (presentationEditor as any).setDocumentMode(mode);
      return;
    }
    const editor = typeof doc.getEditor === 'function' ? doc.getEditor() : null;
    if (editor && 'setDocumentMode' in editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).setDocumentMode(mode);
    }
  }

  /**
   * Configure how tracked changes (suggestions) are displayed in the document.
   *
   * This method allows you to control the visibility and rendering mode of
   * tracked changes across all document editors. It affects both the visual
   * display and the underlying data handling.
   *
   * @param preferences - Tracked changes display preferences
   * @param preferences.mode - How to render tracked changes:
   *   - 'review': Show all changes with markup (insertions highlighted, deletions shown)
   *   - 'final': Show document as if all changes were accepted
   *   - 'original': Show document as if all changes were rejected
   *   - 'off': Disable tracked changes display entirely
   * @param preferences.enabled - Whether tracked changes functionality is active
   *
   * @example
   * // Show document with all tracked changes visible (review mode)
   * superdoc.setTrackedChangesPreferences({ mode: 'review', enabled: true });
   *
   * @example
   * // Show final document (all changes accepted)
   * superdoc.setTrackedChangesPreferences({ mode: 'final', enabled: false });
   *
   * @example
   * // Reset to default behavior
   * superdoc.setTrackedChangesPreferences();
   */
  setTrackedChangesPreferences(preferences?: {
    mode?: 'review' | 'original' | 'final' | 'off';
    enabled?: boolean;
  }): void {
    const normalized = preferences && Object.keys(preferences).length ? { ...preferences } : undefined;
    if (!this.config.layoutEngineOptions) {
      this.config.layoutEngineOptions = {};
    }
    this.config.layoutEngineOptions.trackedChanges = normalized;
    this.superdocStore?.documents?.forEach((doc) => {
      const presentationEditor = typeof doc.getPresentationEditor === 'function' ? doc.getPresentationEditor() : null;
      if (presentationEditor && 'setTrackedChangesOverrides' in presentationEditor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (presentationEditor as any).setTrackedChangesOverrides(normalized);
      }
    });
  }

  /**
   * Set document mode to editing
   */
  #setModeEditing(): void {
    if (this.config.role !== 'editor') return this.#setModeSuggesting();
    if (this.superdocStore.documents.length > 0) {
      const firstEditor = this.superdocStore.documents[0]?.getEditor();
      if (firstEditor) this.setActiveEditor(firstEditor);
    }

    // Enable tracked changes for editing mode
    this.setTrackedChangesPreferences({ mode: 'review', enabled: true });

    this.superdocStore.documents.forEach((doc) => {
      doc.restoreComments();
      this.#applyDocumentMode(doc, 'editing');
    });

    if (this.toolbar) {
      this.toolbar.documentMode = 'editing';
      this.toolbar.updateToolbarState();
    }
  }

  /**
   * Set document mode to suggesting
   */
  #setModeSuggesting(): void {
    if (!['editor', 'suggester'].includes(this.config.role || '')) return this.#setModeViewing();
    if (this.superdocStore.documents.length > 0) {
      const firstEditor = this.superdocStore.documents[0]?.getEditor();
      if (firstEditor) this.setActiveEditor(firstEditor);
    }

    // Enable tracked changes for suggesting mode
    this.setTrackedChangesPreferences({ mode: 'review', enabled: true });

    this.superdocStore.documents.forEach((doc) => {
      doc.restoreComments();
      this.#applyDocumentMode(doc, 'suggesting');
    });

    if (this.toolbar) {
      this.toolbar.documentMode = 'suggesting';
      this.toolbar.updateToolbarState();
    }
  }

  /**
   * Set document mode to viewing
   */
  #setModeViewing(): void {
    if (this.toolbar) {
      this.toolbar.activeEditor = null;
    }

    // Disable tracked changes for viewing mode (show final document)
    this.setTrackedChangesPreferences({ mode: 'final', enabled: false });

    this.superdocStore.documents.forEach((doc) => {
      doc.removeComments();
      this.#applyDocumentMode(doc, 'viewing');
    });

    if (this.toolbar) {
      this.toolbar.documentMode = 'viewing';
      this.toolbar.updateToolbarState();
    }
  }

  /**
   * Search for text or regex in the active editor
   *
   * @param text - The text or regex to search for
   * @returns The search results
   */
  search(text: string | RegExp): unknown[] {
    return this.activeEditor?.commands.search(text) || [];
  }

  /**
   * Go to the next search result
   *
   * @param match - The match object
   */
  goToSearchResult(match: unknown): void {
    this.activeEditor?.commands.goToSearchResult(match);
  }

  /**
   * Set the document to locked or unlocked
   *
   * @param lock - Whether to lock the document
   */
  setLocked(lock = true): void {
    this.config.documents?.forEach((doc) => {
      if (!doc.ydoc) return;
      const metaMap = doc.ydoc.getMap('meta');
      doc.ydoc.transact(() => {
        metaMap.set('locked', lock);
        metaMap.set('lockedBy', this.user);
      });
    });
  }

  /**
   * Get the HTML content of all editors
   *
   * @param options - Export options
   * @returns The HTML content of all editors
   */
  getHTML(options: object = {}): string[] {
    const editors: Editor[] = [];
    this.superdocStore.documents.forEach((doc) => {
      const editor = doc.getEditor();
      if (editor) {
        editors.push(editor);
      }
    });

    return editors.map((editor) => editor.getHTML(options));
  }

  /**
   * Lock the current superdoc
   *
   * @param isLocked - Whether the superdoc is locked
   * @param lockedBy - The user who locked the superdoc
   */
  lockSuperdoc(isLocked = false, lockedBy?: User): void {
    this.isLocked = isLocked;
    this.lockedBy = lockedBy || null;
    this.#log('🦋 [superdoc] Locking superdoc:', isLocked, lockedBy, '\n\n\n');
    this.emit('locked', { isLocked, lockedBy: this.lockedBy });
  }

  /**
   * Export the superdoc to a file
   *
   * Exports the document to the specified format(s). Supports DOCX export
   * with optional comment handling. Multiple files are automatically zipped.
   *
   * @param params - Export configuration
   * @param params.exportType - Array of export formats (currently only 'docx' supported)
   * @param params.commentsType - How to handle comments: 'external' (include) or 'clean' (exclude)
   * @param params.exportedName - Custom filename (without extension)
   * @param params.additionalFiles - Additional blobs to include in the export
   * @param params.additionalFileNames - Names for the additional files
   * @param params.isFinalDoc - Whether to export as final document (accepting all changes)
   * @param params.triggerDownload - Whether to trigger browser download (default: true)
   * @param params.fieldsHighlightColor - Color for field highlights in exported document
   * @returns A promise that resolves with the exported Blob, or void if triggerDownload is true
   * @throws {Error} If exportType contains invalid values
   *
   * @example
   * // Export and download as DOCX
   * await superdoc.export({ exportType: ['docx'] });
   *
   * @example
   * // Get blob without downloading
   * const blob = await superdoc.export({ triggerDownload: false });
   */
  async export({
    exportType = ['docx'],
    commentsType = 'external',
    exportedName,
    additionalFiles = [],
    additionalFileNames = [],
    isFinalDoc = false,
    triggerDownload = true,
    fieldsHighlightColor,
  }: ExportParams & {
    additionalFiles?: Blob[];
    additionalFileNames?: string[];
    isFinalDoc?: boolean;
  } = {}): Promise<void | Blob> {
    // Input validation for export types
    const validExportTypes: ExportType[] = ['docx', 'pdf', 'html'];
    const hasValidExportType = exportType.some((t) => validExportTypes.includes(t as ExportType));
    const hasAdditionalAssets = additionalFiles.length > 0 || additionalFileNames.length > 0;
    const invalidTypes = exportType.filter((t) => !validExportTypes.includes(t as ExportType));

    // Only throw when there are no supported export types AND no additional assets to include.
    // This keeps backward compatibility for callers that bundle extra assets (e.g., txt) alongside docx.
    if (!hasValidExportType && !hasAdditionalAssets && invalidTypes.length > 0) {
      throw new Error(
        `Invalid export types: ${invalidTypes.join(', ')}. Valid types are: ${validExportTypes.join(', ')}`,
      );
    }

    // Input validation for comments type
    const validCommentsTypes: CommentsType[] = ['external', 'clean', 'all'];
    if (commentsType && !validCommentsTypes.includes(commentsType)) {
      this.#log('🦋 [superdoc] Unrecognized commentsType, defaulting to external:', commentsType);
      commentsType = 'external';
    }

    // Get the docx files first
    const baseFileName = exportedName ? cleanName(exportedName) : cleanName(this.config.title || 'SuperDoc');
    const docxFiles = await this.exportEditorsToDOCX({ commentsType, isFinalDoc, fieldsHighlightColor });
    const blobsToZip = [...additionalFiles];
    const filenames = [...additionalFileNames];

    // If we are exporting docx files, add them to the zip
    if (exportType.includes('docx')) {
      docxFiles.forEach((blob) => {
        blobsToZip.push(blob);
        filenames.push(`${baseFileName}.docx`);
      });
    }

    // If we only have one blob, just download it. Otherwise, zip them up.
    if (blobsToZip.length === 1) {
      if (triggerDownload) {
        createDownload(blobsToZip[0], baseFileName, exportType[0]);
        return;
      }

      return blobsToZip[0];
    }

    const zip = await createZip(blobsToZip, filenames);

    if (triggerDownload) {
      createDownload(zip, baseFileName, 'zip');
      return;
    }

    return zip;
  }

  /**
   * Export editors to DOCX format
   *
   * @param options - Export options
   * @returns A promise that resolves with an array of DOCX blobs
   */
  async exportEditorsToDOCX({
    commentsType,
    isFinalDoc,
    fieldsHighlightColor,
  }: {
    commentsType?: CommentsType;
    isFinalDoc?: boolean;
    fieldsHighlightColor?: string | null;
  } = {}): Promise<Blob[]> {
    const comments: unknown[] = [];
    if (commentsType !== 'clean') {
      if (this.commentsStore && typeof this.commentsStore.translateCommentsForExport === 'function') {
        comments.push(...this.commentsStore.translateCommentsForExport());
      }
    }

    const docxPromises = this.superdocStore.documents.map(async (doc) => {
      if (!doc || doc.type !== DOCX) return null;

      const editor = typeof doc.getEditor === 'function' ? doc.getEditor() : null;
      const fallbackDocx = (): Blob | null => {
        if (!doc.data) return null;
        if ('type' in doc.data && doc.data.type !== DOCX) return null;
        return doc.data as Blob;
      };

      if (!editor) return fallbackDocx();

      try {
        const exported = await editor.exportDocx({
          isFinalDoc,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          comments: comments as any,
          commentsType,
          fieldsHighlightColor: fieldsHighlightColor || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        if (exported) return exported;
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.emit('exception', { error: error as Error, document: doc as any });
      }

      return fallbackDocx();
    });

    const docxFiles = await Promise.all(docxPromises);
    return docxFiles.filter((blob: Blob | null): blob is Blob => Boolean(blob));
  }

  /**
   * Request an immediate save from all collaboration documents
   *
   * Triggers the collaboration provider to save immediately by setting
   * 'immediate-save' on the Yjs metaMap. Resolves when all documents
   * have finished saving.
   *
   * @returns A promise that resolves when all documents have saved
   * @throws {Error} If save times out after 30 seconds
   */
  async #triggerCollaborationSaves(): Promise<void> {
    this.#log('🦋 [superdoc] Triggering collaboration saves');

    return new Promise((resolve, reject) => {
      // Filter documents that have ydoc for collaboration saves
      const docsWithYdoc = this.superdocStore.documents.filter((d) => d.ydoc.value);

      // If no collaborative documents, resolve immediately
      if (docsWithYdoc.length === 0) {
        this.#log('🦋 [superdoc] No collaborative documents to save');
        resolve();
        return;
      }

      // Reset counter ONCE before the loop, not inside it
      this.pendingCollaborationSaves = docsWithYdoc.length;
      this.#log(`🦋 [superdoc] Waiting for ${this.pendingCollaborationSaves} documents to save`);

      // Track observers for cleanup
      const observers: Array<{
        metaMap: ReturnType<NonNullable<(typeof docsWithYdoc)[0]['ydoc']['value']>['getMap']>;
        handler: (event: unknown) => void;
      }> = [];

      // Set up timeout to prevent hanging forever
      const timeoutId = setTimeout(() => {
        // Clean up observers
        observers.forEach(({ metaMap, handler }) => {
          metaMap.unobserve(handler);
        });
        reject(new Error('Collaboration save timed out after 30 seconds'));
      }, 30000);

      docsWithYdoc.forEach((doc, index) => {
        const metaMap = doc.ydoc.value!.getMap('meta');

        const saveHandler = (event: unknown): void => {
          const e = event as { changes: { keys: Map<string, unknown> } };
          if (e.changes.keys.has('immediate-save-finished')) {
            this.pendingCollaborationSaves--;
            this.#log(`🦋 [superdoc] Doc ${index} saved, ${this.pendingCollaborationSaves} remaining`);

            if (this.pendingCollaborationSaves <= 0) {
              // Clean up timeout and observers
              clearTimeout(timeoutId);
              observers.forEach(({ metaMap: m, handler }) => {
                m.unobserve(handler);
              });
              resolve();
            }
          }
        };

        observers.push({ metaMap, handler: saveHandler });
        metaMap.observe(saveHandler);
        metaMap.set('immediate-save', 'true');
      });
    });
  }

  /**
   * Save the superdoc if in collaboration mode
   *
   * @returns A promise that resolves when all documents have saved
   */
  async save(): Promise<unknown[]> {
    const savePromises = [
      this.#triggerCollaborationSaves(),
      // this.exportEditorsToDOCX(),
    ];

    this.#log('🦋 [superdoc] Saving superdoc');
    const result = await Promise.all(savePromises);
    this.#log('🦋 [superdoc] Save complete:', result);
    return result;
  }

  /**
   * Destroy the superdoc instance
   *
   * Cleans up all resources, disconnects collaboration providers,
   * and unmounts the Vue application. Errors during cleanup are
   * caught and emitted as exception events to prevent partial cleanup.
   *
   * @throws {Error} Never throws - errors are emitted as exception events
   */
  destroy(): void {
    if (!this.app) {
      return;
    }

    this.#log('[superdoc] Unmounting app');

    // Cleanup socket connection with error handling
    try {
      if (this.config.socket) {
        this.config.socket.cancelWebsocketRetry?.();
        this.config.socket.disconnect?.();
        this.config.socket.destroy?.();
      }
    } catch (error) {
      this.#log('[superdoc] Error cleaning up socket:', error);
      this.emit('exception', { error: error as Error });
    }

    // Cleanup main ydoc and provider with error handling
    try {
      if (this.provider) {
        this.provider.disconnect();
        this.provider.destroy();
      }
      if (this.ydoc) {
        this.ydoc.destroy();
      }
    } catch (error) {
      this.#log('[superdoc] Error cleaning up main provider/ydoc:', error);
      this.emit('exception', { error: error as Error });
    }

    // Cleanup document-level providers and ydocs with error handling
    if (this.config.documents) {
      this.config.documents.forEach((doc, index) => {
        try {
          if (doc.provider) {
            doc.provider.disconnect();
            doc.provider.destroy();
          }
          if (doc.ydoc) {
            doc.ydoc.destroy();
          }
        } catch (error) {
          this.#log(`[superdoc] Error cleaning up document ${index}:`, error);
          this.emit('exception', { error: error as Error, document: doc });
        }
      });
    }

    // Reset store with error handling
    try {
      this.superdocStore.reset();
    } catch (error) {
      this.#log('[superdoc] Error resetting store:', error);
      this.emit('exception', { error: error as Error });
    }

    // Unmount Vue app and clean up listeners
    try {
      this.app.unmount();
      this.removeAllListeners();
      delete this.app.config.globalProperties.$config;
      delete this.app.config.globalProperties.$superdoc;
    } catch (error) {
      this.#log('[superdoc] Error unmounting app:', error);
      // Don't emit here since listeners are being removed
    }
  }

  /**
   * Focus the active editor or the first editor in the superdoc
   */
  focus(): void {
    if (this.activeEditor) {
      this.activeEditor.focus();
    } else {
      this.superdocStore.documents.find((doc) => {
        const editor = doc.getEditor();
        if (editor) {
          editor.focus();
          return true;
        }
        return false;
      });
    }
  }

  /**
   * Set the high contrast mode
   *
   * @param isHighContrast - Whether to enable high contrast mode
   */
  setHighContrastMode(isHighContrast: boolean): void {
    if (!this.activeEditor) return;
    this.activeEditor.setHighContrastMode(isHighContrast);
    this.highContrastModeStore.setHighContrastMode(isHighContrast);
  }

  /**
   * Capture layout pipeline events from PresentationEditor
   * Forwards metrics and errors to host callbacks
   *
   * @param payload - Event payload from PresentationEditor.onTelemetry
   * @param payload.type - Event type: 'layout' or 'error'
   * @param payload.data - Event data (metrics for layout, error details for error)
   */
  captureLayoutPipelineEvent(payload: { type: string; data: Record<string, unknown> }): void {
    // Emit as an event so hosts can listen
    this.emit('layout-pipeline', payload);

    // Call the host callback if provided in config
    if (typeof this.config.onLayoutPipelineEvent === 'function') {
      this.config.onLayoutPipelineEvent(payload);
    }
  }
}
