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
 * SuperDoc interface for type references
 * This is a minimal interface to avoid circular dependencies.
 * The full implementation is in SuperDoc.ts
 *
 * Note: This uses Partial to make all properties optional and allow
 * the concrete class to define them without strict checking issues
 */
export type SuperDoc = {
  /** Configuration object */
  config: Config;
  /** Event emitter method */
  emit?: (event: string, ...args: unknown[]) => boolean;
} & Record<string, unknown>;
