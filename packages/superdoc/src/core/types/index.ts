// Editor is a class from super-editor, so we extract its instance type
import { Editor as EditorClass } from '@harbour-enterprises/super-editor';
import type { Doc as YDoc } from 'yjs';

export type Editor = InstanceType<typeof EditorClass>;

/**
 * Minimal provider interface for collaboration providers
 * Compatible with both HocuspocusProvider and WebsocketProvider
 */
export interface CollaborationProvider {
  disconnect: () => void;
  destroy: () => void;
}

/**
 * The current user of this superdoc
 */
export interface User {
  /** The user's name */
  name: string;
  /** The user's email (can be null for default users) */
  email: string | null;
  /** The user's photo */
  image?: string | null;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled?: boolean;
  /** The licence key for telemetry */
  licenseKey?: string;
  /** The endpoint for telemetry */
  endpoint?: string;
  /** The version of the superdoc */
  superdocVersion?: string;
}

export interface Document {
  /** The ID of the document */
  id?: string;
  /** The type of the document */
  type: string;
  /** The initial data of the document (File, Blob, or null) */
  data?: File | Blob | null;
  /** The name of the document */
  name?: string;
  /** The URL of the document */
  url?: string;
  /** Whether the document is a new file */
  isNewFile?: boolean;
  /** The Yjs document for collaboration */
  ydoc?: YDoc;
  /** The provider for collaboration (supports both HocuspocusProvider and WebsocketProvider) */
  provider?: CollaborationProvider;
  /** WebSocket connection for collaboration */
  socket?: unknown;
  /** User role for this document */
  role?: string;
}

/**
 * Document editing mode
 */
export type DocumentMode = 'editing' | 'viewing' | 'suggesting';

/**
 * Export file type
 */
export type ExportType = 'docx' | 'pdf' | 'html';

/**
 * Comments handling type
 * - 'external': Include only external comments (default)
 * - 'clean': Export without any comments
 */
// CommentsType is optional for callers; defaults to 'external'. Historically we
// allowed additional values (e.g., 'all') so we keep a permissive union.
export type CommentsType = 'external' | 'clean' | 'all';

export interface ExportParams {
  /** File formats to export */
  exportType?: ExportType[];
  /** How to handle comments */
  commentsType?: CommentsType;
  /** Custom filename (without extension) */
  exportedName?: string;
  /** Auto-download or return blob */
  triggerDownload?: boolean;
  /** Color for field highlights */
  fieldsHighlightColor?: string;
}

export interface PermissionResolverParams {
  permission: string;
  role?: string;
  isInternal?: boolean;
  comment?: object | null;
  trackedChange?: object | null;
  currentUser?: User | null;
  superdoc?: SuperDoc | null;
}

export type PermissionResolver = (params: PermissionResolverParams) => boolean | undefined;

export interface CommentsModuleConfig {
  /** Custom permission resolver for comment actions */
  permissionResolver?: PermissionResolver;
  /** Whether to use internal/external comments distinction */
  useInternalExternalComments?: boolean;
  /** Whether to suppress internal/external comments */
  suppressInternalExternalComments?: boolean;
  /** DOM element to mount the comments list */
  element?: HTMLElement;
  /** CSS selector for the element to mount to */
  selector?: string;
}

export interface AIModuleConfig {
  /** Harbour API key for AI features */
  apiKey?: string;
  /** Custom endpoint URL for AI services */
  endpoint?: string;
}

export interface CollaborationModuleConfig {
  /** URL for the collaboration provider */
  url?: string;
  /** Type of collaboration provider */
  providerType?: string;
  [key: string]: unknown;
}

export interface ToolbarModuleConfig {
  /** Toolbar selector */
  selector?: string | HTMLElement;
  /** Toolbar groups to show */
  groups?: string[];
  /** Icons to show in the toolbar */
  icons?: Record<string, string>;
  /** Texts to override in the toolbar */
  texts?: Record<string, string>;
  /** Fonts to show in the toolbar */
  fonts?: string[] | null;
  /** Whether to hide buttons */
  hideButtons?: boolean;
  /** Whether toolbar is responsive to its container */
  responsiveToContainer?: boolean;
  [key: string]: unknown;
}

export interface SlashMenuModuleConfig {
  /** Array of custom menu sections with items */
  customItems?: Array<{ title: string; items: unknown[] }>;
  /** Function to customize menu items */
  menuProvider?: (defaultItems: unknown[]) => unknown[];
  /** Whether to include default menu items */
  includeDefaultItems?: boolean;
}

export interface Modules {
  /** Comments module configuration */
  comments?: CommentsModuleConfig;
  /** AI module configuration */
  ai?: AIModuleConfig;
  /** Collaboration module configuration */
  collaboration?: CollaborationModuleConfig;
  /** Toolbar module configuration */
  toolbar?: ToolbarModuleConfig;
  /** Slash menu module configuration */
  slashMenu?: SlashMenuModuleConfig;
}

export interface LayoutEngineOptions {
  /** Optional override for paginated track-changes rendering */
  trackedChanges?: {
    mode?: 'final' | 'review' | 'original' | 'off';
    enabled?: boolean;
  };
  [key: string]: unknown;
}

export interface Config {
  /** The ID of the SuperDoc */
  superdocId?: string;
  /** The selector or element to mount the SuperDoc into */
  selector: string | HTMLElement;
  /** The mode of the document */
  documentMode: DocumentMode;
  /** The role of the user in this SuperDoc */
  role?: 'editor' | 'viewer' | 'suggester';
  /** The document to load. If a string, it will be treated as a URL. If a File or Blob, it will be used directly. */
  document?: object | string | File | Blob;
  /** The documents to load -> Soon to be deprecated */
  documents?: Document[];
  /** The current user of this SuperDoc */
  user?: User;
  /** All users of this SuperDoc (can be used for "@"-mentions) */
  users?: User[];
  /** Colors to use for user awareness */
  colors?: string[];
  /** Modules to load */
  modules?: Modules;
  /** Top-level override for permission checks */
  permissionResolver?: PermissionResolver;
  /** Optional DOM element to render the toolbar in */
  toolbar?: string;
  /** Toolbar groups to show */
  toolbarGroups?: string[];
  /** Icons to show in the toolbar */
  toolbarIcons?: Record<string, string>;
  /** Texts to override in the toolbar */
  toolbarTexts?: Record<string, string>;
  /** Whether the SuperDoc is in development mode */
  isDev?: boolean;
  /** Telemetry configuration */
  telemetry?: TelemetryConfig;
  /** Layout engine overrides passed through to PresentationEditor */
  layoutEngineOptions?: LayoutEngineOptions;
  /** Callback before an editor is created */
  onEditorBeforeCreate?: (editor: Editor) => void;
  /** Callback after an editor is created */
  onEditorCreate?: (editor: Editor) => void;
  /** Callback when a transaction is made */
  onTransaction?: (params: { editor: Editor; transaction: unknown; duration: number }) => void;
  /** Callback after an editor is destroyed */
  onEditorDestroy?: () => void;
  /** Callback when there is an error in the content */
  onContentError?: (params: { error: object; editor: Editor; documentId: string; file: File | Blob | null }) => void;
  /** Callback when the SuperDoc is ready */
  onReady?: (editor: { superdoc: SuperDoc }) => void;
  /** Callback when comments are updated */
  onCommentsUpdate?: (params: { type: string; data: object }) => void;
  /** Callback when awareness is updated */
  onAwarenessUpdate?: (params: { context: SuperDoc; states: unknown[] }) => void;
  /** Callback when the SuperDoc is locked */
  onLocked?: (params: { isLocked: boolean; lockedBy: User | null }) => void;
  /** Callback when the PDF document is ready */
  onPdfDocumentReady?: () => void;
  /** Callback when the sidebar is toggled */
  onSidebarToggle?: (isOpened: boolean) => void;
  /** Callback when collaboration is ready */
  onCollaborationReady?: (params: { editor: Editor }) => void;
  /** Callback when document is updated */
  onEditorUpdate?: (params: { editor: Editor }) => void;
  /** Callback when an exception is thrown */
  onException?: (params: { error: Error }) => void;
  /** Callback when the comments list is rendered */
  onCommentsListChange?: (params: { isRendered: boolean }) => void;
  /** Callback when the list definitions change */
  onListDefinitionsChange?: (params: object) => void;
  /** The format of the document (docx, pdf, html) */
  format?: string;
  /** The extensions to load for the editor */
  editorExtensions?: Array<Record<string, unknown>>;
  /** Whether the SuperDoc is internal */
  isInternal?: boolean;
  /** The title of the SuperDoc */
  title?: string;
  /** The conversations to load */
  conversations?: Array<Record<string, unknown>>;
  /** Whether the SuperDoc is locked */
  isLocked?: boolean;
  /** The function to handle image uploads */
  handleImageUpload?: (file: File) => Promise<string>;
  /** The user who locked the SuperDoc */
  lockedBy?: User | null;
  /** Whether to show the ruler in the editor */
  rulers?: boolean;
  /** Whether to suppress default styles in docx mode */
  suppressDefaultDocxStyles?: boolean;
  /** Provided JSON to override content with */
  jsonOverride?: Record<string, unknown>;
  /** Whether to disable slash / right-click custom context menu */
  disableContextMenu?: boolean;
  /** HTML content to initialize the editor with */
  html?: string;
  /** Markdown content to initialize the editor with */
  markdown?: string;
  /** Whether to enable debug mode */
  isDebug?: boolean;
  /** CSP nonce for inline styles */
  cspNonce?: string;
  /** Socket connection for collaboration */
  socket?: { cancelWebsocketRetry: () => void; disconnect: () => void; destroy: () => void };
  /** Whether to use the layout engine */
  useLayoutEngine?: boolean;
  /** Callback when fonts are resolved */
  onFontsResolved?: ((data: unknown) => void) | null;
  /** Callback for layout pipeline events */
  onLayoutPipelineEvent?: (payload: { type: string; data: object }) => void;
}

/**
 * SuperDoc type for callback references
 * This is a minimal type to avoid circular dependencies.
 * The full implementation is in SuperDoc.ts
 *
 * This interface represents the public API surface that external code commonly
 * uses. It declares the most frequently accessed properties and methods, allowing
 * the actual SuperDoc class (which extends EventEmitter and has many additional
 * properties) to be assignable to this type without conflicts.
 *
 * Note: The `emit` method is typed as a generic function to maintain compatibility
 * with EventEmitter's strongly-typed signature. The actual SuperDoc class has a
 * more specific emit method from EventEmitter<SuperDocEvents>.
 *
 * We avoid an index signature `[key: string]: unknown` because it would conflict
 * with EventEmitter's method signatures and prevent proper type checking.
 */
export interface SuperDoc {
  // Core configuration and state
  /** Configuration object */
  config: Config;
  /** Current user */
  user: User;
  /** All users who have access to this superdoc */
  users: User[];
  /** Unique ID for this SuperDoc instance */
  superdocId: string;
  /** Version of SuperDoc */
  version: string;
  /** Whether running in development mode */
  isDev: boolean;

  // Editor and document state
  /** Currently active editor instance */
  activeEditor: Editor | null;
  /** All comments in the document */
  comments: unknown[];
  /** Number of editors that have been initialized */
  readyEditors: number;
  /** The number of editors required for this superdoc */
  readonly requiredNumberOfEditors: number;
  /** Current state containing documents and users */
  readonly state: { documents: unknown[]; users: User[] };
  /** The SuperDoc container element */
  readonly element: HTMLElement | null;

  // Collaboration properties
  /** Yjs document for collaboration */
  ydoc?: YDoc;
  /** Whether this SuperDoc uses collaboration */
  isCollaborative?: boolean;
  /** Pending collaboration saves counter */
  pendingCollaborationSaves: number;

  // Lock state
  /** Whether the document is locked */
  isLocked: boolean;
  /** User who locked the document */
  lockedBy: User | null;

  // Stores (typed as unknown to avoid deep circular dependencies with store types)
  /** Comments store */
  commentsStore: unknown;
  /** SuperDoc store */
  superdocStore: unknown;

  // User management methods
  /** Add a user to the shared users list */
  addSharedUser(user: User): void;
  /** Remove a user from the shared users list */
  removeSharedUser(email: string): void;

  // Editor management methods
  /** Set the active editor */
  setActiveEditor(editor: Editor): void;
  /** Focus the active editor or the first editor in the superdoc */
  focus(): void;

  // Document mode and state management
  /** Set the document mode */
  setDocumentMode(type: DocumentMode): void;
  /** Configure how tracked changes are displayed */
  setTrackedChangesPreferences(preferences?: {
    mode?: 'review' | 'original' | 'final' | 'off';
    enabled?: boolean;
  }): void;

  // Lock management
  /** Set the document to locked or unlocked */
  setLocked(lock?: boolean): void;
  /** Lock the current superdoc */
  lockSuperdoc(isLocked?: boolean, lockedBy?: User): void;

  // Permission checking
  /** Determine whether the current configuration allows a given permission */
  canPerformPermission(params: {
    permission: string;
    role?: string;
    isInternal?: boolean;
    comment?: object | null;
    trackedChange?: { commentId?: string; id?: string; comment?: object } | null;
  }): boolean;

  // Search functionality
  /** Search for text or regex in the active editor */
  search(text: string | RegExp): unknown[];
  /** Go to the next search result */
  goToSearchResult(match: unknown): void;

  // Export and content methods
  /** Get the HTML content of all editors */
  getHTML(options?: object): string[];
  /** Export the superdoc to a file */
  export(
    params?: ExportParams & {
      additionalFiles?: Blob[];
      additionalFileNames?: string[];
      isFinalDoc?: boolean;
    },
  ): Promise<void | Blob>;
  /** Export editors to DOCX format */
  exportEditorsToDOCX(options?: {
    commentsType?: CommentsType;
    isFinalDoc?: boolean;
    fieldsHighlightColor?: string | null;
  }): Promise<Blob[]>;

  // Lifecycle methods
  /** Save the superdoc if in collaboration mode */
  save(): Promise<unknown[]>;
  /** Destroy the superdoc instance */
  destroy(): void;

  /**
   * Event emitter method
   * The actual implementation has strongly typed events, but we use a generic
   * signature here to avoid circular dependencies and maintain compatibility.
   * The unknown[] allows any arguments while maintaining type safety.
   */
  emit?(event: string, ...args: unknown[]): boolean;
}
