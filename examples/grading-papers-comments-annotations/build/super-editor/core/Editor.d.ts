/**
 * @typedef {Object} FieldValue
 * @property {string} input_id The id of the input field
 * @property {string} input_value The value to insert into the field
 */
/**
 * A map of plugin names to their helper API objects.
 * Each plugin defines its own helper methods.
 *
 * Example:
 * editor.helpers.linkedStyles.getStyles()
 *
 * @typedef {Object<string, Object<string, Function>>} EditorHelpers
 */
/**
 * Editor main class.
 *
 * Expects a config object.
 * @class
 */
/**
 * @typedef {Object} User The current user of this superdoc
 * @property {string} name The user's name
 * @property {string} email The user's email
 * @property {string | null} image The user's photo
 */
/**
 * @typedef {Object} DocxNode A JSON representation of a docx node
 */
/**
 * @typedef {Object} EditorOptions
 * @property {HTMLElement} [element] - The container element for the editor
 * @property {string} [selector] - CSS selector for the editor container
 * @property {boolean} [isHeadless=false] - Whether the editor is running in headless mode
 * @property {Document} [mockDocument] - Mock document for testing
 * @property {Window} [mockWindow] - Mock window for testing
 * @property {string} [content=''] - XML content
 * @property {User} [user] - Current user information
 * @property {Array.<User>} [users=[]] - List of users for collaboration
 * @property {Object} [media={}] - Media configuration
 * @property {Object} [mediaFiles={}] - Media files
 * @property {Object} [fonts={}] - Font configuration
 * @property {string} [documentMode='editing'] - Document mode ('editing', 'viewing', 'suggesting')
 * @property {string} [mode='docx'] - Editor mode ('docx', 'text', 'html')
 * @property {string} [role='editor'] - User role ('editor', 'viewer', 'suggester')
 * @property {Array} [colors=[]] - Available colors
 * @property {Object} [converter] - Document converter
 * @property {Object} [fileSource] - Source of the file
 * @property {Object} [initialState] - Initial editor state
 * @property {string} [documentId] - Unique document identifier
 * @property {Array} [extensions=[]] - Editor extensions
 * @property {boolean} [editable=true] - Whether the editor is editable
 * @property {Object} [editorProps={}] - Editor properties
 * @property {Object} [parseOptions={}] - Parsing options
 * @property {Object} [coreExtensionOptions={}] - Core extension options
 * @property {boolean} [enableInputRules=true] - Whether to enable input rules
 * @property {boolean} [isCommentsEnabled=false] - Whether comments are enabled
 * @property {boolean} [isNewFile=false] - Whether this is a new file
 * @property {number} [scale=1] - Editor scale/zoom
 * @property {boolean} [annotations=false] - Whether annotations are enabled
 * @property {boolean} [isInternal=false] - Whether this is an internal editor
 * @property {Array} [externalExtensions=[]] - External extensions
 * @property {Object} [numbering={}] - Numbering configuration
 * @property {boolean} [isHeaderOrFooter=false] - Whether this is a header or footer editor
 * @property {Function} [onBeforeCreate] - Called before editor creation
 * @property {Function} [onCreate] - Called after editor creation
 * @property {Function} [onUpdate] - Called when editor content updates
 * @property {Function} [onSelectionUpdate] - Called when selection updates
 * @property {Function} [onTransaction] - Called when a transaction is processed
 * @property {Function} [onFocus] - Called when editor gets focus
 * @property {Function} [onBlur] - Called when editor loses focus
 * @property {Function} [onDestroy] - Called when editor is destroyed
 * @property {Function} [onContentError] - Called when there's a content error
 * @property {Function} [onTrackedChangesUpdate] - Called when tracked changes update
 * @property {Function} [onCommentsUpdate] - Called when comments update
 * @property {Function} [onCommentsLoaded] - Called when comments are loaded
 * @property {Function} [onCommentClicked] - Called when a comment is clicked
 * @property {Function} [onCommentLocationsUpdate] - Called when comment locations update
 * @property {Function} [onDocumentLocked] - Called when document is locked
 * @property {Function} [onFirstRender] - Called on first render
 * @property {Function} [onCollaborationReady] - Called when collaboration is ready
 * @property {Function} [onPaginationUpdate] - Called when pagination updates
 * @property {Function} [onException] - Called when an exception occurs
 * @property {Function} [onListDefinitionsChange] - Called when list definitions change
 * @property {Function} [handleImageUpload] - Handler for image uploads
 * @property {Object} [telemetry] - Telemetry configuration
 * @property {boolean} [suppressDefaultDocxStyles] - Prevent default styles from being applied in docx mode
 * @property {boolean} [jsonOverride] - Whether to override content with provided json
 * @property {string} [html] - HTML content to initialize the editor with
 */
/**
 * Main editor class that manages document state, extensions, and user interactions
 * @class
 * @extends EventEmitter
 */
export class Editor extends EventEmitter {
    /**
     * Load the data from DOCX to be used in the schema.
     * Expects a DOCX file.
     * @static
     * @async
     * @param {File|Blob|Buffer} fileSource - The DOCX file to load (File/Blob in browser, Buffer in Node.js)
     * @param {boolean} [isNode=false] - Whether the method is being called in a Node.js environment
     * @returns {Promise<Array>} - A promise that resolves to an array containing:
     *   - [0] xmlFiles - Array of XML files extracted from the DOCX
     *   - [1] mediaFiles - Object containing media files with URLs (browser only)
     *   - [2] mediaFiles - Object containing media files with base64 data
     *   - [3] fonts - Object containing font files from the DOCX
     */
    static loadXmlData(fileSource: File | Blob | Buffer, isNode?: boolean): Promise<any[]>;
    /**
     * Get the document version
     * @static
     * @param {Object} doc - Document object
     * @returns {string} Document version
     */
    static getDocumentVersion(doc: any): string;
    /**
     * Update the document version
     * @static
     * @param {Object} doc - Document object
     * @param {string} version - New version
     * @returns {Object}
     */
    static updateDocumentVersion(doc: any, version: string): any;
    /**
     * Check if migrations are needed for the data
     * @static
     * @param {Object} data - Document data
     * @returns {boolean} Whether migrations are needed
     */
    static checkIfMigrationsNeeded(data: any): boolean;
    /**
     * Create a new Editor instance
     * @param {EditorOptions} options - Editor configuration options
     * @returns {void}
     */
    constructor(options: EditorOptions);
    /**
     * Service for managing extensions
     * @type {Object}
     */
    extensionService: any;
    /**
     * Storage for extension data
     * @type {Object}
     */
    extensionStorage: any;
    /**
     * ProseMirror schema for the editor
     * @type {Object}
     */
    schema: any;
    /**
     * ProseMirror view instance
     * @type {Object}
     */
    view: any;
    /**
     * Whether the editor currently has focus
     * @type {boolean}
     */
    isFocused: boolean;
    options: {
        element: any;
        selector: any;
        isHeadless: boolean;
        mockDocument: any;
        mockWindow: any;
        content: string;
        user: any;
        users: any[];
        media: {};
        mediaFiles: {};
        fonts: {};
        documentMode: string;
        mode: string;
        role: string;
        colors: any[];
        converter: any;
        fileSource: any;
        initialState: any;
        documentId: any;
        extensions: any[];
        editable: boolean;
        editorProps: {};
        parseOptions: {};
        coreExtensionOptions: {};
        enableInputRules: boolean;
        isCommentsEnabled: boolean;
        isNewFile: boolean;
        scale: number;
        annotations: boolean;
        isInternal: boolean;
        externalExtensions: any[];
        numbering: {};
        isHeaderOrFooter: boolean;
        lastSelection: any;
        suppressDefaultDocxStyles: boolean;
        jsonOverride: boolean;
        onBeforeCreate: () => any;
        onCreate: () => any;
        onUpdate: () => any;
        onSelectionUpdate: () => any;
        onTransaction: () => any;
        onFocus: () => any;
        onBlur: () => any;
        onDestroy: () => any;
        onContentError: ({ error }: {
            error: any;
        }) => never;
        onTrackedChangesUpdate: () => any;
        onCommentsUpdate: () => any;
        onCommentsLoaded: () => any;
        onCommentClicked: () => any;
        onCommentLocationsUpdate: () => any;
        onDocumentLocked: () => any;
        onFirstRender: () => any;
        onCollaborationReady: () => any;
        onPaginationUpdate: () => any;
        onException: () => any;
        onListDefinitionsChange: () => any;
        handleImageUpload: any;
        telemetry: any;
        customUpdatedFiles: {};
        isHeaderFooterChanged: boolean;
        isCustomXmlChanged: boolean;
        focusTarget: any;
    };
    setHighContrastMode: (value: any) => void;
    /**
     * Getter which indicates if any changes happen in Editor
     * @returns {boolean}
     */
    get docChanged(): boolean;
    mount(el: any): void;
    unmount(): void;
    /**
     * Set the toolbar for this editor
     * @param {Object} toolbar - The toolbar instance
     * @returns {void}
     */
    setToolbar(toolbar: any): void;
    toolbar: any;
    /**
     * Focus the editor.
     * @returns {void}
     */
    focus(): void;
    /**
     * Get the editor state
     * @returns {Object} ProseMirror state
     */
    get state(): any;
    /**
     * Get the editor storage.
     * @returns {Object} Editor storage object
     */
    get storage(): any;
    /**
     * Get object of registered commands.
     * @returns {Object} Commands object
     */
    get commands(): any;
    /**
     * Get extension helpers.
     * @returns {EditorHelpers} Object with helper methods for extensions
     */
    get helpers(): EditorHelpers;
    /**
     * Check if the editor is editable.
     * @returns {boolean}
     */
    get isEditable(): boolean;
    /**
     * Check if editor is destroyed.
     * @returns {boolean}
     */
    get isDestroyed(): boolean;
    /**
     * Get the editor element
     * @returns {HTMLElement} The editor element
     */
    get element(): HTMLElement;
    /**
     * Get possible users of the editor.
     * @returns {Array.<User>} List of users
     */
    get users(): Array<User>;
    /**
     * Create a chain of commands to call multiple commands at once.
     * @returns {Object} Command chain
     */
    chain(): any;
    /**
     * Check if a command or a chain of commands can be executed. Without executing it.
     * @returns {Object} Object with methods to check command availability
     */
    can(): any;
    /**
     * Set the document mode
     * @param {string} documentMode - The document mode ('editing', 'viewing', 'suggesting')
     */
    setDocumentMode(documentMode: string): void;
    /**
     * Export the yjs binary from the current state.
     * @returns {Promise<Uint8Array>} The exported yjs binary
     */
    generateCollaborationUpdate(): Promise<Uint8Array>;
    /**
     * Initialize data for collaborative editing
     * If we are replacing data and have a valid provider, listen for synced event
     * so that we can initialize the data
     * @returns {void}
     */
    initializeCollaborationData(): void;
    /**
     * Replace content of editor that was created with loadFromSchema option
     * Used to replace content of other header/footer when one of it was edited
     *
     * @param {object} content - new editor content json (retrieved from editor.getUpdatedJson)
     * @returns {void}
     */
    replaceContent(content: object): void;
    /**
     * Set editor options and update state.
     * @param {EditorOptions} options - Editor options
     * @returns {void}
     */
    setOptions(options?: EditorOptions): void;
    /**
     * Set whether the editor is editable
     * @param {boolean} [editable=true] - Whether the editor is editable
     * @param {boolean} [emitUpdate=true] - Whether to emit an update event
     * @returns {void}
     */
    setEditable(editable?: boolean, emitUpdate?: boolean): void;
    /**
     * Register PM plugin.
     * @param plugin PM plugin.
     * @param handlePlugins Optional function for handling plugin merge.
     * @returns {void}
     */
    registerPlugin(plugin: any, handlePlugins: any): void;
    /**
     * Unregister a PM plugin
     * @param {string|Object} nameOrPluginKey - Plugin name or plugin instance
     * @returns {void}
     */
    unregisterPlugin(nameOrPluginKey: string | any): void;
    converter: any;
    /**
     * Creates all node views.
     * @returns {void}
     */
    createNodeViews(): void;
    /**
     * Get the maximum content size
     * @returns {Object} Size object with width and height
     */
    getMaxContentSize(): any;
    /**
     * Attach styles and attributes to the editor element
     */
    updateEditorStyles(element: any, proseMirror: any, hasPaginationEnabled?: boolean): void;
    /**
     * Initialize default styles for the editor container and ProseMirror.
     * Get page size and margins from the converter.
     * Set document default font and font size.
     *
     * @param {HTMLElement} [element=this.element] - The DOM element to apply styles to
     * @returns {void}
     */
    initDefaultStyles(element?: HTMLElement, isPaginationEnabled?: boolean): void;
    /**
     * Initializes responsive styles for mobile devices.
     * Sets up scaling based on viewport width and handles orientation changes.
     *
     * @param {HTMLElement|void} element - The DOM element to apply mobile styles to
     * @returns {void}
     */
    initMobileStyles(element: HTMLElement | void): void;
    /**
     * Initialize pagination, if the pagination extension is enabled.
     * @private
     * @async
     * @returns {Promise<void>}
     */
    private initPagination;
    /**
     * Get attrs of the currently selected node or mark.
     * @param {String} nameOrType
     * @example
     * editor.getAttributes('textStyle').color
     */
    getAttributes(nameOrType: string): any;
    /**
     * Returns if the currently selected node or mark is active.
     * @param {String|Object} nameOrAttributes - The name of the node/mark or an attributes object
     * @param {Object} [attributesOrUndefined] - Optional attributes to check when first parameter is a name
     * @returns {Boolean} Whether the node or mark is active with the specified attributes
     * @example
     * editor.isActive('bold')
     * editor.isActive('textStyle', { color: 'purple' })
     * editor.isActive({ textAlign: 'center' })
     */
    isActive(nameOrAttributes: string | any, attributesOrUndefined?: any): boolean;
    /**
     * Get the editor content as JSON
     * @returns {Object} Editor content as JSON
     */
    getJSON(): any;
    /**
     * Get the editor content as HTML
     * @returns {string} Editor content as HTML
     */
    getHTML({ unflattenLists }?: {
        unflattenLists?: boolean;
    }): string;
    /**
     * Create a child editor linked to this editor.
     * This is useful for creating header/footer editors that are linked to the main editor.
     * Or paragraph fields that rely on the same underlying document and list defintions
     * @param {EditorOptions} options - Options for the child editor
     * @returns {Editor} A new child editor instance linked to this editor
     */
    createChildEditor(options: EditorOptions): Editor;
    /**
     * Get page styles
     * @returns {Object} Page styles
     */
    getPageStyles(): any;
    /**
     * Update page styles
     *
     * @param {Object} param0
     * @param {Object} param0.pageMargins The new page margins
     * @returns {void}
     */
    updatePageStyle({ pageMargins }: {
        pageMargins: any;
    }): void;
    migrateListsToV2(): any;
    getUpdatedJson(): any;
    /**
     * Export the editor document to DOCX.
     * @async
     * @param {Object} options - The export options
     * @param {boolean} [options.isFinalDoc=false] - Whether this is the final document version
     * @param {string} [options.commentsType] - The type of comments to include
     * @param {Array} [options.comments=[]] - Array of comments to include in the document
     * @param {boolean} [options.getUpdatedDocs=false] - When set to true return only updated docx files
     * @returns {Promise<Blob|ArrayBuffer|Object>} The exported DOCX file or updated docx files
     */
    exportDocx({ isFinalDoc, commentsType, exportJsonOnly, exportXmlOnly, comments, getUpdatedDocs, }?: {
        isFinalDoc?: boolean;
        commentsType?: string;
        comments?: any[];
        getUpdatedDocs?: boolean;
    }): Promise<Blob | ArrayBuffer | any>;
    /**
     * Destroy the editor and clean up resources
     * @returns {void}
     */
    destroy(): void;
    destroyHeaderFooterEditors(): void;
    /**
     * Process collaboration migrations
     * @returns {Object | void} Migration results
     */
    processCollaborationMigrations(): any | void;
    /**
     * Replace the current file
     * @async
     * @param {Object} newFile - New file data
     * @returns {Promise<void>}
     */
    replaceFile(newFile: any): Promise<void>;
    /**
     * Get internal docx file content
     * @param {string} name - File name
     * @param {string} type - type of result (json, string)
     * @returns {Object|String} - file content
     */
    getInternalXmlFile(name: string, type?: string): any | string;
    /**
     * Update internal docx file content
     * @param {string} name - File name
     * @param {string} updatedContent - new file content
     */
    updateInternalXmlFile(name: string, updatedContent: string): void;
    /**
     * Get all nodes of a specific type
     * @param {string} type - Node type
     * @returns {Array} Array of nodes
     */
    getNodesOfType(type: string): any[];
    /**
     * Replace a node with HTML content
     * @param {Object} targetNode - The node to replace
     * @param {string} html - HTML content to replace with
     * @returns {void}
     */
    replaceNodeWithHTML(targetNode: any, html: string): void;
    /**
     * A command to prepare the editor to receive annotations. This will
     * pre-process the document as needed prior to running in the annotator.
     *
     * Currently this is only used for table generation but additional pre-processing can be done here.
     *
     * @param {FieldValue[]} annotationValues
     * @returns {void}
     */
    prepareForAnnotations(annotationValues?: FieldValue[]): void;
    /**
     * Migrate paragraph fields to lists V2 structure if necessary.
     * @param {FieldValue[]} annotationValues - List of field values to migrate.
     * @returns {Promise<FieldValue[]>} - Returns a promise that resolves to the migrated
     */
    migrateParagraphFields(annotationValues?: FieldValue[]): Promise<FieldValue[]>;
    /**
     * Annotate the document with the given annotation values.
     *
     * @param {FieldValue[]} annotationValues List of field values to apply.
     * @param {String[]} hiddenIds List of field ids to remove from the document.
     * @returns {void}
     */
    annotate(annotationValues?: FieldValue[], hiddenIds?: string[], removeEmptyFields?: boolean): void;
    /**
     * Preview annotations in the editor. It stores a copy of the original state.
     * This can be reverted via closePreview()
     *
     * @param {Object[]} annotationValues
     * @param {string[]} hiddenIds
     * @returns {void}
     */
    previewAnnotations(annotationValues?: any[], hiddenIds?: string[]): void;
    originalState: any;
    /**
     * If there is a preview active, this will revert the editor to the original state.
     *
     * @returns {void}
     */
    closePreview(): void;
    #private;
}
export type FieldValue = {
    /**
     * The id of the input field
     */
    input_id: string;
    /**
     * The value to insert into the field
     */
    input_value: string;
};
/**
 * A map of plugin names to their helper API objects.
 * Each plugin defines its own helper methods.
 *
 * Example:
 * editor.helpers.linkedStyles.getStyles()
 */
export type EditorHelpers = {
    [x: string]: {
        [x: string]: Function;
    };
};
/**
 * The current user of this superdoc
 */
export type User = {
    /**
     * The user's name
     */
    name: string;
    /**
     * The user's email
     */
    email: string;
    /**
     * The user's photo
     */
    image: string | null;
};
/**
 * A JSON representation of a docx node
 */
export type DocxNode = any;
export type EditorOptions = {
    /**
     * - The container element for the editor
     */
    element?: HTMLElement;
    /**
     * - CSS selector for the editor container
     */
    selector?: string;
    /**
     * - Whether the editor is running in headless mode
     */
    isHeadless?: boolean;
    /**
     * - Mock document for testing
     */
    mockDocument?: Document;
    /**
     * - Mock window for testing
     */
    mockWindow?: Window;
    /**
     * - XML content
     */
    content?: string;
    /**
     * - Current user information
     */
    user?: User;
    /**
     * - List of users for collaboration
     */
    users?: Array<User>;
    /**
     * - Media configuration
     */
    media?: any;
    /**
     * - Media files
     */
    mediaFiles?: any;
    /**
     * - Font configuration
     */
    fonts?: any;
    /**
     * - Document mode ('editing', 'viewing', 'suggesting')
     */
    documentMode?: string;
    /**
     * - Editor mode ('docx', 'text', 'html')
     */
    mode?: string;
    /**
     * - User role ('editor', 'viewer', 'suggester')
     */
    role?: string;
    /**
     * - Available colors
     */
    colors?: any[];
    /**
     * - Document converter
     */
    converter?: any;
    /**
     * - Source of the file
     */
    fileSource?: any;
    /**
     * - Initial editor state
     */
    initialState?: any;
    /**
     * - Unique document identifier
     */
    documentId?: string;
    /**
     * - Editor extensions
     */
    extensions?: any[];
    /**
     * - Whether the editor is editable
     */
    editable?: boolean;
    /**
     * - Editor properties
     */
    editorProps?: any;
    /**
     * - Parsing options
     */
    parseOptions?: any;
    /**
     * - Core extension options
     */
    coreExtensionOptions?: any;
    /**
     * - Whether to enable input rules
     */
    enableInputRules?: boolean;
    /**
     * - Whether comments are enabled
     */
    isCommentsEnabled?: boolean;
    /**
     * - Whether this is a new file
     */
    isNewFile?: boolean;
    /**
     * - Editor scale/zoom
     */
    scale?: number;
    /**
     * - Whether annotations are enabled
     */
    annotations?: boolean;
    /**
     * - Whether this is an internal editor
     */
    isInternal?: boolean;
    /**
     * - External extensions
     */
    externalExtensions?: any[];
    /**
     * - Numbering configuration
     */
    numbering?: any;
    /**
     * - Whether this is a header or footer editor
     */
    isHeaderOrFooter?: boolean;
    /**
     * - Called before editor creation
     */
    onBeforeCreate?: Function;
    /**
     * - Called after editor creation
     */
    onCreate?: Function;
    /**
     * - Called when editor content updates
     */
    onUpdate?: Function;
    /**
     * - Called when selection updates
     */
    onSelectionUpdate?: Function;
    /**
     * - Called when a transaction is processed
     */
    onTransaction?: Function;
    /**
     * - Called when editor gets focus
     */
    onFocus?: Function;
    /**
     * - Called when editor loses focus
     */
    onBlur?: Function;
    /**
     * - Called when editor is destroyed
     */
    onDestroy?: Function;
    /**
     * - Called when there's a content error
     */
    onContentError?: Function;
    /**
     * - Called when tracked changes update
     */
    onTrackedChangesUpdate?: Function;
    /**
     * - Called when comments update
     */
    onCommentsUpdate?: Function;
    /**
     * - Called when comments are loaded
     */
    onCommentsLoaded?: Function;
    /**
     * - Called when a comment is clicked
     */
    onCommentClicked?: Function;
    /**
     * - Called when comment locations update
     */
    onCommentLocationsUpdate?: Function;
    /**
     * - Called when document is locked
     */
    onDocumentLocked?: Function;
    /**
     * - Called on first render
     */
    onFirstRender?: Function;
    /**
     * - Called when collaboration is ready
     */
    onCollaborationReady?: Function;
    /**
     * - Called when pagination updates
     */
    onPaginationUpdate?: Function;
    /**
     * - Called when an exception occurs
     */
    onException?: Function;
    /**
     * - Called when list definitions change
     */
    onListDefinitionsChange?: Function;
    /**
     * - Handler for image uploads
     */
    handleImageUpload?: Function;
    /**
     * - Telemetry configuration
     */
    telemetry?: any;
    /**
     * - Prevent default styles from being applied in docx mode
     */
    suppressDefaultDocxStyles?: boolean;
    /**
     * - Whether to override content with provided json
     */
    jsonOverride?: boolean;
    /**
     * - HTML content to initialize the editor with
     */
    html?: string;
};
import { EventEmitter } from './EventEmitter.js';
//# sourceMappingURL=Editor.d.ts.map