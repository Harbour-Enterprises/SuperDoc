/**
 * @typedef {Object} User The current user of this superdoc
 * @property {string} name The user's name
 * @property {string} email The user's email
 * @property {string | null} [image] The user's photo
 */

/**
 * @typedef {Object} TelemetryConfig Telemetry configuration
 * @property {boolean} [enabled=true] Whether telemetry is enabled
 * @property {string} [licenseKey] The licence key for telemetry
 * @property {string} [endpoint] The endpoint for telemetry
 * @property {string} [superdocVersion] The version of the superdoc
 */

/**
 * @typedef {Object} Document
 * @property {string} [id] The ID of the document
 * @property {string} type The type of the document
 * @property {File | Blob | null} [data] The initial data of the document (File, Blob, or null)
 * @property {string} [name] The name of the document
 * @property {string} [url] The URL of the document
 * @property {boolean} [isNewFile] Whether the document is a new file
 * @property {import('yjs').Doc} [ydoc] The Yjs document for collaboration
 * @property {import('@hocuspocus/provider').HocuspocusProvider} [provider] The provider for collaboration
 */

/**
 * @typedef {Object} Modules
 * @property {Object} [comments] Comments module configuration
 * @property {Object} [ai] AI module configuration
 * @property {string} [ai.apiKey] Harbour API key for AI features
 * @property {string} [ai.endpoint] Custom endpoint URL for AI services
 * @property {Object} [collaboration] Collaboration module configuration
 * @property {Object} [toolbar] Toolbar module configuration
 * @property {Object} [slashMenu] Slash menu module configuration
 * @property {Array} [slashMenu.customItems] Array of custom menu sections with items
 * @property {Function} [slashMenu.menuProvider] Function to customize menu items
 * @property {boolean} [slashMenu.includeDefaultItems] Whether to include default menu items
 */

/** @typedef {import('@harbour-enterprises/super-editor').Editor} Editor */
/** @typedef {import('../SuperDoc.js').SuperDoc} SuperDoc */

/**
 * @typedef {string} DocumentMode
 * @property {'editing'} editing The document is in editing mode
 * @property {'viewing'} viewing The document is in viewing mode
 * @property {'suggesting'} suggesting The document is in suggesting mode
 */

/**
 * @typedef {Object} Config
 * @property {string} [superdocId] The ID of the SuperDoc
 * @property {string | HTMLElement} selector The selector or element to mount the SuperDoc into
 * @property {DocumentMode} documentMode The mode of the document
 * @property {'editor' | 'viewer' | 'suggester'} [role] The role of the user in this SuperDoc
 * @property {Object | string | File | Blob} [document] The document to load. If a string, it will be treated as a URL. If a File or Blob, it will be used directly.
 * @property {Array<Document>} [documents] The documents to load -> Soon to be deprecated
 * @property {User} [user] The current user of this SuperDoc
 * @property {Array<User>} [users] All users of this SuperDoc (can be used for "@"-mentions)
 * @property {Array<string>} [colors] Colors to use for user awareness
 * @property {Modules} [modules] Modules to load
 * @property {boolean} [pagination] Whether to show pagination in SuperEditors
 * @property {string} [toolbar] Optional DOM element to render the toolbar in
 * @property {Array<string>} [toolbarGroups] Toolbar groups to show
 * @property {Object} [toolbarIcons] Icons to show in the toolbar
 * @property {Object} [toolbarTexts] Texts to override in the toolbar
 * @property {boolean} [isDev] Whether the SuperDoc is in development mode
 * @property {TelemetryConfig} [telemetry] Telemetry configuration
 * @property {(editor: Editor) => void} [onEditorBeforeCreate] Callback before an editor is created
 * @property {(editor: Editor) => void} [onEditorCreate] Callback after an editor is created
 * @property {(params: { editor: Editor, transaction: any, duration: number }) => void} [onTransaction] Callback when a transaction is made
 * @property {() => void} [onEditorDestroy] Callback after an editor is destroyed
 * @property {(params: { error: object, editor: Editor, documentId: string, file: File }) => void} [onContentError] Callback when there is an error in the content
 * @property {(editor: { superdoc: SuperDoc }) => void} [onReady] Callback when the SuperDoc is ready
 * @property {(params: { type: string, data: object}) => void} [onCommentsUpdate] Callback when comments are updated
 * @property {(params: { context: SuperDoc, states: Array }) => void} [onAwarenessUpdate] Callback when awareness is updated
 * @property {(params: { isLocked: boolean, lockedBy: User }) => void} [onLocked] Callback when the SuperDoc is locked
 * @property {() => void} [onPdfDocumentReady] Callback when the PDF document is ready
 * @property {(isOpened: boolean) => void} [onSidebarToggle] Callback when the sidebar is toggled
 * @property {(params: { editor: Editor }) => void} [onCollaborationReady] Callback when collaboration is ready
 * @property {(params: { editor: Editor }) => void} [onEditorUpdate] Callback when document is updated
 * @property {(params: { error: Error }) => void} [onException] Callback when an exception is thrown
 * @property {(params: { isRendered: boolean }) => void} [onCommentsListChange] Callback when the comments list is rendered
 * @property {(params: {})} [onListDefinitionsChange] Callback when the list definitions change
 * @property {string} [format] The format of the document (docx, pdf, html)
 * @property {Object[]} [editorExtensions] The extensions to load for the editor
 * @property {boolean} [isInternal] Whether the SuperDoc is internal
 * @property {string} [title] The title of the SuperDoc
 * @property {Object[]} [conversations] The conversations to load
 * @property {boolean} [isLocked] Whether the SuperDoc is locked
 * @property {function(File): Promise<string>} [handleImageUpload] The function to handle image uploads
 * @property {User} [lockedBy] The user who locked the SuperDoc
 * @property {boolean} [rulers] Whether to show the ruler in the editor
 * @property {boolean} [suppressDefaultDocxStyles] Whether to suppress default styles in docx mode
 * @property {Object} [jsonOverride] Provided JSON to override content with
 * @property {boolean} [disableContextMenu] Whether to disable slash / right-click custom context menu
 * @property {string} [html] HTML content to initialize the editor with
 * @property {string} [markdown] Markdown content to initialize the editor with
 * @property {boolean} [isDebug=false] Whether to enable debug mode
 */

export {};
