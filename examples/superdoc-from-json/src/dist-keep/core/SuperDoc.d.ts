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
 * @property {File | null} [data] The initial data of the document
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
 */
/** @typedef {import('@harbour-enterprises/super-editor').Editor} Editor */
/**
 * @typedef {string} DocumentMode
 * @property {'editing'} editing The document is in editing mode
 * @property {'viewing'} viewing The document is in viewing mode
 * @property {'suggesting'} suggesting The document is in suggesting mode
 */
/**
 * @typedef {Object} Config
 * @property {string} [superdocId] The ID of the SuperDoc
 * @property {string} selector The selector to mount the SuperDoc into
 * @property {DocumentMode} documentMode The mode of the document
 * @property {'editor' | 'viewer' | 'suggester'} [role] The role of the user in this SuperDoc
 * @property {Object | string} [document] The document to load. If a string, it will be treated as a URL
 * @property {Array<Document>} documents The documents to load
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
 * @property {Object} [pdfViewer] The PDF viewer configuration
 * @property {function(File): Promise<string>} [handleImageUpload] The function to handle image uploads
 * @property {User} [lockedBy] The user who locked the SuperDoc
 * @property {boolean} [rulers] Whether to show the ruler in the editor
 * @property {boolean} [suppressDefaultDocxStyles] Whether to suppress default styles in docx mode
 * @property {boolean} [jsonOverride] Whether to override content with provided JSON
 * @property {boolean} [disableContextMenu] Whether to disable slash / right-click custom context menu
 * @property {string} [html] HTML content to initialize the editor with
 * @property {string} [markdown] Markdown content to initialize the editor with
 */
/**
 * SuperDoc class
 * Expects a config object
 *
 * @class
 * @extends EventEmitter
 */
export class SuperDoc extends EventEmitter<string | symbol, any> {
    /** @type {Array<string>} */
    static allowedTypes: Array<string>;
    /**
     * @param {Config} config
     */
    constructor(config: Config);
    /** @type {string} */
    version: string;
    /** @type {User[]} */
    users: User[];
    /** @type {import('yjs').Doc | undefined} */
    ydoc: import("yjs").Doc | undefined;
    /** @type {import('@hocuspocus/provider').HocuspocusProvider | undefined} */
    provider: import("@hocuspocus/provider").HocuspocusProvider | undefined;
    /** @type {Config} */
    config: Config;
    userColorMap: Map<any, any>;
    colorIndex: number;
    superdocId: any;
    colors: string[];
    user: User;
    socket: any;
    isDev: boolean;
    activeEditor: {
        setHighContrastMode: (value: any) => void;
        get docChanged(): boolean;
        mount(el: any): void;
        unmount(): void;
        view: any;
        setToolbar(toolbar: any): void;
        toolbar: any;
        focus(): void;
        get state(): any;
        get storage(): any;
        readonly commands: any;
        readonly helpers: EditorHelpers;
        get isEditable(): boolean;
        get isDestroyed(): boolean;
        get element(): HTMLElement;
        get users(): Array<User>;
        chain(): any;
        can(): any;
        setDocumentMode(documentMode: string): void;
        generateCollaborationUpdate(): Promise<Uint8Array>;
        initializeCollaborationData(): void;
        replaceContent(content: object): void;
        setOptions(options?: EditorOptions): void;
        options: any;
        setEditable(editable?: boolean, emitUpdate?: boolean): void;
        registerPlugin(plugin: any, handlePlugins: any): void;
        unregisterPlugin(nameOrPluginKey: string | any): void;
        createNodeViews(): void;
        getMaxContentSize(): any;
        updateEditorStyles(element: any, proseMirror: any, hasPaginationEnabled?: boolean): void;
        initDefaultStyles(element?: HTMLElement, isPaginationEnabled?: boolean): void;
        initMobileStyles(element: HTMLElement | void): void;
        getAttributes(nameOrType: string): any;
        isActive(nameOrAttributes: string | any, attributesOrUndefined?: any): boolean;
        getJSON(): any;
        getHTML({ unflattenLists }?: {
            unflattenLists?: boolean;
        }): string;
        createChildEditor(options: EditorOptions): {
            new (options: EditorOptions): /*elided*/ any;
            loadXmlData(fileSource: File | Blob | Buffer, isNode2?: boolean): Promise<any[]>;
            getDocumentVersion(doc2: any): string;
            updateDocumentVersion(doc2: any, version2: any): any;
            checkIfMigrationsNeeded(): boolean;
        };
        getPageStyles(): any;
        updatePageStyle({ pageMargins }: {
            pageMargins: any;
        }): void;
        migrateListsToV2(): any[];
        getUpdatedJson(): any;
        exportDocx({ isFinalDoc, commentsType, exportJsonOnly, exportXmlOnly, comments, getUpdatedDocs, fieldsHighlightColor }?: {
            isFinalDoc?: boolean;
            commentsType?: string;
            comments?: any[];
            getUpdatedDocs?: boolean;
        }): Promise<Blob | ArrayBuffer | any>;
        destroy(): void;
        destroyHeaderFooterEditors(): void;
        processCollaborationMigrations(): any | void;
        replaceFile(newFile: any): Promise<void>;
        getInternalXmlFile(name: string, type?: string): any | string;
        updateInternalXmlFile(name: string, updatedContent: string): void;
        getNodesOfType(type: string): any[];
        replaceNodeWithHTML(targetNode: any, html: string): void;
        prepareForAnnotations(annotationValues?: FieldValue[]): void;
        migrateParagraphFields(annotationValues?: FieldValue[]): Promise<FieldValue[]>;
        annotate(annotationValues?: FieldValue[], hiddenIds?: string[], removeEmptyFields?: boolean): void;
        previewAnnotations(annotationValues?: any[], hiddenIds?: string[]): void;
        originalState: any;
        closePreview(): void;
        on(name: string, fn2: any): void;
        emit(name: string, ...args: any[]): void;
        off(name: string, fn2: any): void;
        once(name: string, fn2: any): void;
        removeAllListeners(): void;
    };
    comments: any[];
    readyEditors: number;
    isLocked: boolean;
    lockedBy: User;
    /**
     * Get the number of editors that are required for this superdoc
     * @returns {number} The number of required editors
     */
    get requiredNumberOfEditors(): number;
    get state(): {
        documents: any;
        users: User[];
    };
    app: any;
    pinia: any;
    superdocStore: any;
    commentsStore: any;
    highContrastModeStore: any;
    isCollaborative: boolean;
    /**
     * Add a user to the shared users list
     * @param {Object} user The user to add
     * @returns {void}
     */
    addSharedUser(user: any): void;
    /**
     * Remove a user from the shared users list
     * @param {String} email The email of the user to remove
     * @returns {void}
     */
    removeSharedUser(email: string): void;
    telemetry: Telemetry;
    /**
     * Triggered when there is an error in the content
     * @param {Object} param0
     * @param {Error} param0.error The error that occurred
     * @param {Editor} param0.editor The editor that caused the error
     */
    onContentError({ error, editor }: {
        error: Error;
        editor: Editor;
    }): void;
    /**
     * Triggered when the PDF document is ready
     * @returns {void}
     */
    broadcastPdfDocumentReady(): void;
    /**
     * Triggered when the superdoc is ready
     * @returns {void}
     */
    broadcastReady(): void;
    /**
     * Triggered before an editor is created
     * @param {Editor} editor The editor that is about to be created
     * @returns {void}
     */
    broadcastEditorBeforeCreate(editor: Editor): void;
    /**
     * Triggered when an editor is created
     * @param {Editor} editor The editor that was created
     * @returns {void}
     */
    broadcastEditorCreate(editor: Editor): void;
    /**
     * Triggered when an editor is destroyed
     * @returns {void}
     */
    broadcastEditorDestroy(): void;
    /**
     * Triggered when the comments sidebar is toggled
     * @param {boolean} isOpened
     */
    broadcastSidebarToggle(isOpened: boolean): void;
    /**
     * Set the active editor
     * @param {Editor} editor The editor to set as active
     * @returns {void}
     */
    setActiveEditor(editor: Editor): void;
    /**
     * Toggle the ruler visibility for SuperEditors
     *
     * @returns {void}
     */
    toggleRuler(): void;
    /**
     * Toggle pagination for SuperEditors
     * @returns {void}
     */
    togglePagination(): void;
    toolbarElement: any;
    toolbar: SuperToolbar;
    /**
     * Add a comments list to the superdoc
     * Requires the comments module to be enabled
     * @param {Element} element The DOM element to render the comments list in
     * @returns {void}
     */
    addCommentsList(element: Element): void;
    commentsList: SuperComments;
    /**
     * Remove the comments list from the superdoc
     * @returns {void}
     */
    removeCommentsList(): void;
    /**
     * Triggered when a toolbar command is executed
     * @param {Object} param0
     * @param {Object} param0.item The toolbar item that was clicked
     * @param {string} param0.argument The argument passed to the command
     */
    onToolbarCommand({ item, argument }: {
        item: any;
        argument: string;
    }): void;
    /**
     * Set the document mode.
     * @param {DocumentMode} type
     * @returns {void}
     */
    setDocumentMode(type: DocumentMode): void;
    /**
     * Search for text or regex in the active editor
     * @param {string | RegExp} text The text or regex to search for
     * @returns {Object[]} The search results
     */
    search(text: string | RegExp): any[];
    /**
     * Go to the next search result
     * @param {Object} match The match object
     * @returns {void}
     */
    goToSearchResult(match: any): void;
    /**
     * Set the document to locked or unlocked
     * @param {boolean} lock
     */
    setLocked(lock?: boolean): void;
    /**
     * Get the HTML content of all editors
     * @returns {Array<string>} The HTML content of all editors
     */
    getHTML(options?: {}): Array<string>;
    /**
     * Lock the current superdoc
     * @param {Boolean} isLocked
     * @param {User} lockedBy The user who locked the superdoc
     */
    lockSuperdoc(isLocked: boolean, lockedBy: User): void;
    /**
     * Export the superdoc to a file
     * @param {Object} params
     * @param {string[]} [params.exportType]
     * @param {string} [params.commentsType]
     * @param {string} [params.exportedName]
     * @param {Array} [params.additionalFiles]
     * @param {Array} [params.additionalFileNames]
     * @param {boolean} [params.isFinalDoc]
     * @param {boolean} [params.triggerDownload] Whether to trigger the download of the exported file
     * @returns {Promise<void | Blob>} Returns void if triggerDownload is false, otherwise returns the exported file
     */
    export({ exportType, commentsType, exportedName, additionalFiles, additionalFileNames, isFinalDoc, triggerDownload, fieldsHighlightColor, }?: {
        exportType?: string[];
        commentsType?: string;
        exportedName?: string;
        additionalFiles?: any[];
        additionalFileNames?: any[];
        isFinalDoc?: boolean;
        triggerDownload?: boolean;
    }): Promise<void | Blob>;
    /**
     * Export editors to DOCX format.
     * @param {{ commentsType?: string, isFinalDoc?: boolean }} [options]
     * @returns {Promise<Array<Blob>>}
     */
    exportEditorsToDOCX({ commentsType, isFinalDoc, fieldsHighlightColor }?: {
        commentsType?: string;
        isFinalDoc?: boolean;
    }): Promise<Array<Blob>>;
    pendingCollaborationSaves: number;
    /**
     * Save the superdoc if in collaboration mode
     * @returns {Promise<void[]>} Resolves when all documents have saved
     */
    save(): Promise<void[]>;
    /**
     * Destroy the superdoc instance
     * @returns {void}
     */
    destroy(): void;
    /**
     * Focus the active editor or the first editor in the superdoc
     * @returns {void}
     */
    focus(): void;
    /**
     * Set the high contrast mode
     * @param {boolean} isHighContrast
     * @returns {void}
     */
    setHighContrastMode(isHighContrast: boolean): void;
    #private;
}
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
    image?: string | null;
};
/**
 * Telemetry configuration
 */
export type TelemetryConfig = {
    /**
     * Whether telemetry is enabled
     */
    enabled?: boolean;
    /**
     * The licence key for telemetry
     */
    licenseKey?: string;
    /**
     * The endpoint for telemetry
     */
    endpoint?: string;
    /**
     * The version of the superdoc
     */
    superdocVersion?: string;
};
export type Document = {
    /**
     * The ID of the document
     */
    id?: string;
    /**
     * The type of the document
     */
    type: string;
    /**
     * The initial data of the document
     */
    data?: File | null;
    /**
     * The name of the document
     */
    name?: string;
    /**
     * The URL of the document
     */
    url?: string;
    /**
     * Whether the document is a new file
     */
    isNewFile?: boolean;
    /**
     * The Yjs document for collaboration
     */
    ydoc?: import("yjs").Doc;
    /**
     * The provider for collaboration
     */
    provider?: import("@hocuspocus/provider").HocuspocusProvider;
};
export type Modules = {
    /**
     * Comments module configuration
     */
    comments?: any;
    /**
     * AI module configuration
     */
    ai?: {
        apiKey?: string;
        endpoint?: string;
    };
    /**
     * Collaboration module configuration
     */
    collaboration?: any;
    /**
     * Toolbar module configuration
     */
    toolbar?: any;
};
export type Editor = {
    setHighContrastMode: (value: any) => void;
    get docChanged(): boolean;
    mount(el: any): void;
    unmount(): void;
    view: any;
    setToolbar(toolbar: any): void;
    toolbar: any;
    focus(): void;
    get state(): any;
    get storage(): any;
    readonly commands: any;
    readonly helpers: EditorHelpers;
    get isEditable(): boolean;
    get isDestroyed(): boolean;
    get element(): HTMLElement;
    get users(): Array<User>;
    chain(): any;
    can(): any;
    setDocumentMode(documentMode: string): void;
    generateCollaborationUpdate(): Promise<Uint8Array>;
    initializeCollaborationData(): void;
    replaceContent(content: object): void;
    setOptions(options?: EditorOptions): void;
    options: any;
    setEditable(editable?: boolean, emitUpdate?: boolean): void;
    registerPlugin(plugin: any, handlePlugins: any): void;
    unregisterPlugin(nameOrPluginKey: string | any): void;
    createNodeViews(): void;
    getMaxContentSize(): any;
    updateEditorStyles(element: any, proseMirror: any, hasPaginationEnabled?: boolean): void;
    initDefaultStyles(element?: HTMLElement, isPaginationEnabled?: boolean): void;
    initMobileStyles(element: HTMLElement | void): void;
    getAttributes(nameOrType: string): any;
    isActive(nameOrAttributes: string | any, attributesOrUndefined?: any): boolean;
    getJSON(): any;
    getHTML({ unflattenLists }?: {
        unflattenLists?: boolean;
    }): string;
    createChildEditor(options: EditorOptions): {
        new (options: EditorOptions): /*elided*/ any;
        loadXmlData(fileSource: File | Blob | Buffer, isNode2?: boolean): Promise<any[]>;
        getDocumentVersion(doc2: any): string;
        updateDocumentVersion(doc2: any, version2: any): any;
        checkIfMigrationsNeeded(): boolean;
    };
    getPageStyles(): any;
    updatePageStyle({ pageMargins }: {
        pageMargins: any;
    }): void;
    migrateListsToV2(): any[];
    getUpdatedJson(): any;
    exportDocx({ isFinalDoc, commentsType, exportJsonOnly, exportXmlOnly, comments, getUpdatedDocs, fieldsHighlightColor }?: {
        isFinalDoc?: boolean;
        commentsType?: string;
        comments?: any[];
        getUpdatedDocs?: boolean;
    }): Promise<Blob | ArrayBuffer | any>;
    destroy(): void;
    destroyHeaderFooterEditors(): void;
    processCollaborationMigrations(): any | void;
    replaceFile(newFile: any): Promise<void>;
    getInternalXmlFile(name: string, type?: string): any | string;
    updateInternalXmlFile(name: string, updatedContent: string): void;
    getNodesOfType(type: string): any[];
    replaceNodeWithHTML(targetNode: any, html: string): void;
    prepareForAnnotations(annotationValues?: FieldValue[]): void;
    migrateParagraphFields(annotationValues?: FieldValue[]): Promise<FieldValue[]>;
    annotate(annotationValues?: FieldValue[], hiddenIds?: string[], removeEmptyFields?: boolean): void;
    previewAnnotations(annotationValues?: any[], hiddenIds?: string[]): void;
    originalState: any;
    closePreview(): void;
    on(name: string, fn2: any): void;
    emit(name: string, ...args: any[]): void;
    off(name: string, fn2: any): void;
    once(name: string, fn2: any): void;
    removeAllListeners(): void;
};
export type DocumentMode = string;
export type Config = {
    /**
     * The ID of the SuperDoc
     */
    superdocId?: string;
    /**
     * The selector to mount the SuperDoc into
     */
    selector: string;
    /**
     * The mode of the document
     */
    documentMode: DocumentMode;
    /**
     * The role of the user in this SuperDoc
     */
    role?: "editor" | "viewer" | "suggester";
    /**
     * The document to load. If a string, it will be treated as a URL
     */
    document?: any | string;
    /**
     * The documents to load
     */
    documents: Array<Document>;
    /**
     * The current user of this SuperDoc
     */
    user?: User;
    /**
     * All users of this SuperDoc (can be used for "@"-mentions)
     */
    users?: Array<User>;
    /**
     * Colors to use for user awareness
     */
    colors?: Array<string>;
    /**
     * Modules to load
     */
    modules?: Modules;
    /**
     * Whether to show pagination in SuperEditors
     */
    pagination?: boolean;
    /**
     * Optional DOM element to render the toolbar in
     */
    toolbar?: string;
    /**
     * Toolbar groups to show
     */
    toolbarGroups?: Array<string>;
    /**
     * Icons to show in the toolbar
     */
    toolbarIcons?: any;
    /**
     * Texts to override in the toolbar
     */
    toolbarTexts?: any;
    /**
     * Whether the SuperDoc is in development mode
     */
    isDev?: boolean;
    /**
     * Telemetry configuration
     */
    telemetry?: TelemetryConfig;
    /**
     * Callback before an editor is created
     */
    onEditorBeforeCreate?: (editor: Editor) => void;
    /**
     * Callback after an editor is created
     */
    onEditorCreate?: (editor: Editor) => void;
    /**
     * Callback when a transaction is made
     */
    onTransaction?: (params: {
        editor: Editor;
        transaction: any;
        duration: number;
    }) => void;
    /**
     * Callback after an editor is destroyed
     */
    onEditorDestroy?: () => void;
    /**
     * Callback when there is an error in the content
     */
    onContentError?: (params: {
        error: object;
        editor: Editor;
        documentId: string;
        file: File;
    }) => void;
    /**
     * Callback when the SuperDoc is ready
     */
    onReady?: (editor: {
        superdoc: SuperDoc;
    }) => void;
    /**
     * Callback when comments are updated
     */
    onCommentsUpdate?: (params: {
        type: string;
        data: object;
    }) => void;
    /**
     * Callback when awareness is updated
     */
    onAwarenessUpdate?: (params: {
        context: SuperDoc;
        states: any[];
    }) => void;
    /**
     * Callback when the SuperDoc is locked
     */
    onLocked?: (params: {
        isLocked: boolean;
        lockedBy: User;
    }) => void;
    /**
     * Callback when the PDF document is ready
     */
    onPdfDocumentReady?: () => void;
    /**
     * Callback when the sidebar is toggled
     */
    onSidebarToggle?: (isOpened: boolean) => void;
    /**
     * Callback when collaboration is ready
     */
    onCollaborationReady?: (params: {
        editor: Editor;
    }) => void;
    /**
     * Callback when document is updated
     */
    onEditorUpdate?: (params: {
        editor: Editor;
    }) => void;
    /**
     * Callback when an exception is thrown
     */
    onException?: (params: {
        error: Error;
    }) => void;
    /**
     * Callback when the comments list is rendered
     */
    onCommentsListChange?: (params: {
        isRendered: boolean;
    }) => void;
    /**
     * Callback when the list definitions change
     */
    onListDefinitionsChange?: (params: {}) => any;
    /**
     * The format of the document (docx, pdf, html)
     */
    format?: string;
    /**
     * The extensions to load for the editor
     */
    editorExtensions?: any[];
    /**
     * Whether the SuperDoc is internal
     */
    isInternal?: boolean;
    /**
     * The title of the SuperDoc
     */
    title?: string;
    /**
     * The conversations to load
     */
    conversations?: any[];
    /**
     * Whether the SuperDoc is locked
     */
    isLocked?: boolean;
    /**
     * The PDF viewer configuration
     */
    pdfViewer?: any;
    /**
     * The function to handle image uploads
     */
    handleImageUpload?: (arg0: File) => Promise<string>;
    /**
     * The user who locked the SuperDoc
     */
    lockedBy?: User;
    /**
     * Whether to show the ruler in the editor
     */
    rulers?: boolean;
    /**
     * Whether to suppress default styles in docx mode
     */
    suppressDefaultDocxStyles?: boolean;
    /**
     * Whether to override content with provided JSON
     */
    jsonOverride?: boolean;
    /**
     * Whether to disable slash / right-click custom context menu
     */
    disableContextMenu?: boolean;
    /**
     * HTML content to initialize the editor with
     */
    html?: string;
    /**
     * Markdown content to initialize the editor with
     */
    markdown?: string;
};
import { EventEmitter } from 'eventemitter3';
import { Telemetry } from '@harbour-enterprises/common/Telemetry.js';
import { SuperToolbar } from '@harbour-enterprises/super-editor';
import { SuperComments } from '../components/CommentsLayer/commentsList/super-comments-list.js';
//# sourceMappingURL=SuperDoc.d.ts.map