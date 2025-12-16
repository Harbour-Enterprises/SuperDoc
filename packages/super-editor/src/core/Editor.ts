import type { EditorState, Transaction, Plugin } from 'prosemirror-state';
import type { EditorView as PmEditorView } from 'prosemirror-view';
import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { EditorOptions, User, FieldValue, DocxFileEntry } from './types/EditorConfig.js';
import type {
  EditorHelpers,
  ExtensionStorage,
  ProseMirrorJSON,
  PageStyles,
  TelemetryData,
  Toolbar,
} from './types/EditorTypes.js';
import type { ChainableCommandObject, CanObject, EditorCommands } from './types/ChainedCommands.js';
import type { EditorEventMap, FontsResolvedPayload, Comment } from './types/EditorEvents.js';
import type { SchemaSummaryJSON } from './types/EditorSchema.js';

import { EditorState as PmEditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMSerializer as PmDOMSerializer } from 'prosemirror-model';
import { yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { helpers } from '@core/index.js';
import { EventEmitter } from './EventEmitter.js';
import { ExtensionService } from './ExtensionService.js';
import { CommandService } from './CommandService.js';
import { Attribute } from './Attribute.js';
import { SuperConverter } from '@core/super-converter/SuperConverter.js';
import { Commands, Editable, EditorFocus, Keymap } from './extensions/index.js';
import { createDocument } from './helpers/createDocument.js';
import { isActive } from './helpers/isActive.js';
import { trackedTransaction } from '@extensions/track-changes/trackChangesHelpers/trackedTransaction.js';
import { TrackChangesBasePluginKey } from '@extensions/track-changes/plugins/index.js';
import { CommentsPluginKey } from '@extensions/comment/comments-plugin.js';
import { getNecessaryMigrations } from '@core/migrations/index.js';
import { getRichTextExtensions } from '../extensions/index.js';
import { AnnotatorHelpers } from '@helpers/annotator.js';
import { prepareCommentsForExport, prepareCommentsForImport } from '@extensions/comment/comments-helpers.js';
import DocxZipper from '@core/DocxZipper.js';
import { generateCollaborationData } from '@extensions/collaboration/collaboration.js';
import { useHighContrastMode } from '../composables/use-high-contrast-mode.js';
import { updateYdocDocxData } from '@extensions/collaboration/collaboration-helpers.js';
import { setImageNodeSelection } from './helpers/setImageNodeSelection.js';
import { canRenderFont } from './helpers/canRenderFont.js';
import {
  migrateListsToV2IfNecessary,
  migrateParagraphFieldsListsV2,
} from '@core/migrations/0.14-listsv2/listsv2migration.js';
import { createLinkedChildEditor } from '@core/child-editor/index.js';
import { unflattenListsInHtml } from './inputRules/html/html-helpers.js';
import { SuperValidator } from '@core/super-validator/index.js';
import { createDocFromMarkdown, createDocFromHTML } from '@core/helpers/index.js';
import { transformListsInCopiedContent } from '@core/inputRules/html/transform-copied-lists.js';
import { applyStyleIsolationClass } from '../utils/styleIsolation.js';
import { isHeadless } from '../utils/headless-helpers.js';
import { buildSchemaSummary } from './schema-summary.js';

declare const __APP_VERSION__: string;
declare const version: string | undefined;

/**
 * Image storage structure used by the image extension
 */
interface ImageStorage {
  media: Record<string, unknown>;
}

/**
 * Main editor class that manages document state, extensions, and user interactions
 */
export class Editor extends EventEmitter<EditorEventMap> {
  /**
   * Command service for handling editor commands
   */
  #commandService!: CommandService;

  /**
   * Service for managing extensions
   */
  extensionService!: ExtensionService;

  /**
   * Storage for extension data
   */
  extensionStorage: ExtensionStorage = {};

  /**
   * ProseMirror schema for the editor
   */
  schema!: Schema;

  /**
   * ProseMirror view instance
   */
  view!: EditorView;

  /**
   * Active PresentationEditor instance when layout mode is enabled.
   * Set by PresentationEditor constructor to enable renderer-neutral helpers.
   */
  presentationEditor: import('./PresentationEditor.js').PresentationEditor | null = null;

  /**
   * Whether the editor currently has focus
   */
  isFocused: boolean = false;

  /**
   * All the embedded fonts that were imported by the Editor
   */
  fontsImported: string[] = [];

  /**
   * The document converter instance
   */
  converter!: SuperConverter;

  /**
   * Toolbar instance (if attached)
   */
  toolbar?: Toolbar;

  /**
   * Original state for preview mode
   */
  originalState?: EditorState;

  /**
   * High contrast mode setter
   */
  setHighContrastMode?: (enabled: boolean) => void;

  options: EditorOptions = {
    element: null,
    selector: null,
    isHeadless: false,
    mockDocument: null,
    mockWindow: null,
    content: '', // XML content
    user: null,
    users: [],
    media: {},
    mediaFiles: {},
    fonts: {},
    documentMode: 'editing',
    mode: 'docx',
    role: 'editor',
    colors: [],
    converter: null,
    fileSource: null,
    initialState: null,
    documentId: null,
    extensions: [],
    editable: true,
    editorProps: {},
    parseOptions: {},
    coreExtensionOptions: {},
    enableInputRules: true,
    isCommentsEnabled: false,
    isNewFile: false,
    scale: 1,
    annotations: false,
    isInternal: false,
    externalExtensions: [],
    isChildEditor: false,
    numbering: {},
    isHeaderOrFooter: false,
    lastSelection: null,
    suppressDefaultDocxStyles: false,
    jsonOverride: null,
    loadFromSchema: false,
    fragment: null,
    skipViewCreation: false,
    onBeforeCreate: () => null,
    onCreate: () => null,
    onUpdate: () => null,
    onSelectionUpdate: () => null,
    onTransaction: () => null,
    onFocus: () => null,
    onBlur: () => null,
    onDestroy: () => null,
    onContentError: ({ error }: { editor: Editor; error: Error }) => {
      throw error;
    },
    onTrackedChangesUpdate: () => null,
    onCommentsUpdate: () => null,
    onCommentsLoaded: () => null,
    onCommentClicked: () => null,
    onCommentLocationsUpdate: () => null,
    onDocumentLocked: () => null,
    onFirstRender: () => null,
    onCollaborationReady: () => null,
    onException: () => null,
    onListDefinitionsChange: () => null,
    onFontsResolved: null,
    // async (file) => url;
    handleImageUpload: null,

    // telemetry
    telemetry: null,

    // Docx xml updated by User
    customUpdatedFiles: {},

    isHeaderFooterChanged: false,
    isCustomXmlChanged: false,
    ydoc: null,
    collaborationProvider: null,
    collaborationIsReady: false,
    shouldLoadComments: false,
    replacedFile: false,

    focusTarget: null,
    permissionResolver: null,

    // header/footer editors may have parent(main) editor set
    parentEditor: null,
  };

  /**
   * Create a new Editor instance
   * @param options - Editor configuration options
   */
  constructor(options: Partial<EditorOptions>) {
    super();

    this.#initContainerElement(options);
    this.#checkHeadless(options);
    this.setOptions(options);

    const modes: Record<string, () => void> = {
      docx: () => this.#init(),
      text: () => this.#initRichText(),
      html: () => this.#initRichText(),
      default: () => {
        console.log('Not implemented.');
      },
    };

    const initMode = modes[this.options.mode!] ?? modes.default;

    const { setHighContrastMode } = useHighContrastMode();
    this.setHighContrastMode = setHighContrastMode;
    initMode();
  }

  /**
   * Getter which indicates if any changes happen in Editor
   */
  get docChanged(): boolean {
    return (
      this.options.isHeaderFooterChanged ||
      this.options.isCustomXmlChanged ||
      !this.options.initialState!.doc.eq(this.state.doc)
    );
  }

  /**
   * Initialize the container element for the editor
   */
  #initContainerElement(options: Partial<EditorOptions>): void {
    if (!options.element && options.selector) {
      const { selector } = options;
      if (selector.startsWith('#') || selector.startsWith('.')) {
        options.element = document.querySelector(selector) as HTMLElement;
      } else {
        options.element = document.getElementById(selector);
      }

      const textModes = ['text', 'html'];
      if (textModes.includes(options.mode!) && options.element) {
        options.element.classList.add('sd-super-editor-html');
      }
    }

    if (options.isHeadless) {
      options.element = null;
      return;
    }

    options.element = options.element || document.createElement('div');
    applyStyleIsolationClass(options.element);
  }

  /**
   * Initialize the editor with the given options
   */
  #init(): void {
    this.#createExtensionService();
    this.#createCommandService();
    this.#createSchema();
    this.#createConverter();
    this.#initMedia();

    if (!this.options.isHeadless) {
      this.#initFonts();
    }

    this.on('beforeCreate', this.options.onBeforeCreate!);
    this.emit('beforeCreate', { editor: this });
    this.on('contentError', this.options.onContentError!);

    this.mount(this.options.element!);

    this.on('create', this.options.onCreate!);
    this.on('update', this.options.onUpdate!);
    this.on('selectionUpdate', this.options.onSelectionUpdate!);
    this.on('transaction', this.options.onTransaction!);
    this.on('focus', this.#onFocus.bind(this));
    this.on('blur', this.options.onBlur!);
    this.on('destroy', this.options.onDestroy!);
    this.on('trackedChangesUpdate', this.options.onTrackedChangesUpdate!);
    this.on('commentsLoaded', this.options.onCommentsLoaded!);
    this.on('commentClick', this.options.onCommentClicked!);
    this.on('commentsUpdate', this.options.onCommentsUpdate!);
    this.on('locked', this.options.onDocumentLocked!);
    this.on('collaborationReady', this.#onCollaborationReady.bind(this));
    this.on('comment-positions', this.options.onCommentLocationsUpdate!);
    this.on('list-definitions-change', this.options.onListDefinitionsChange!);
    this.on('fonts-resolved', this.options.onFontsResolved!);
    this.on('exception', this.options.onException!);

    if (!this.options.isHeadless) {
      this.initializeCollaborationData();
      this.initDefaultStyles();
      this.#checkFonts();
    }

    const shouldMigrateListsOnInit = Boolean(
      this.options.markdown ||
        this.options.html ||
        this.options.loadFromSchema ||
        this.options.jsonOverride ||
        this.options.mode === 'html' ||
        this.options.mode === 'text',
    );

    if (shouldMigrateListsOnInit) {
      this.migrateListsToV2();
    }

    this.setDocumentMode(this.options.documentMode!, 'init');

    if (!this.options.ydoc) {
      if (!this.options.isChildEditor) {
        this.#initComments();
      }
    }

    this.#initDevTools();
    this.#registerCopyHandler();
  }

  /**
   * Initialize the editor in rich text mode
   */
  #initRichText(): void {
    if (!this.options.extensions || !this.options.extensions.length) {
      this.options.extensions = getRichTextExtensions();
    }

    this.#createExtensionService();
    this.#createCommandService();
    this.#createSchema();

    this.on('beforeCreate', this.options.onBeforeCreate!);
    this.emit('beforeCreate', { editor: this });
    this.on('contentError', this.options.onContentError!);

    this.mount(this.options.element!);

    this.on('create', this.options.onCreate!);
    this.on('update', this.options.onUpdate!);
    this.on('selectionUpdate', this.options.onSelectionUpdate!);
    this.on('transaction', this.options.onTransaction!);
    this.on('focus', this.#onFocus.bind(this));
    this.on('blur', this.options.onBlur!);
    this.on('destroy', this.options.onDestroy!);
    this.on('commentsLoaded', this.options.onCommentsLoaded!);
    this.on('commentClick', this.options.onCommentClicked!);
    this.on('locked', this.options.onDocumentLocked!);
    this.on('list-definitions-change', this.options.onListDefinitionsChange!);
  }

  mount(el: HTMLElement | null): void {
    this.#createView(el);

    window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.emit('create', { editor: this });
    }, 0);
  }

  unmount(): void {
    if (this.view) {
      this.view.destroy();
    }
    this.view = undefined!;
  }

  /**
   * Handle focus event
   */
  #onFocus({ editor, event }: { editor: Editor; event: FocusEvent }): void {
    this.toolbar?.setActiveEditor?.(editor);
    this.options.onFocus?.({ editor, event });
  }

  /**
   * Set the toolbar for this editor
   */
  setToolbar(toolbar: Toolbar): void {
    this.toolbar = toolbar;
  }

  /**
   * Check if the editor should run in headless mode
   */
  #checkHeadless(options: Partial<EditorOptions>): void {
    if (!options.isHeadless) return;

    // Set up minimal navigator for Node.js environments
    if (typeof navigator === 'undefined') {
      // Create a minimal navigator object with required properties
      const minimalNavigator = {
        platform: 'node',
        userAgent: 'Node.js',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).navigator = minimalNavigator;
    }

    if (options.mockDocument) {
      (global as typeof globalThis).document = options.mockDocument;
      (global as typeof globalThis).window = options.mockWindow as Window & typeof globalThis;
    }
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this.view?.focus();
  }

  /**
   * Get the editor state
   */
  get state(): EditorState {
    return this.view?.state;
  }

  /**
   * Get the editor storage.
   */
  get storage(): ExtensionStorage {
    return this.extensionStorage;
  }

  /**
   * Get object of registered commands.
   */
  get commands(): EditorCommands {
    return this.#commandService?.commands;
  }

  /**
   * Get extension helpers.
   */
  get helpers(): EditorHelpers {
    return this.extensionService.helpers;
  }

  /**
   * Check if the editor is editable.
   */
  get isEditable(): boolean {
    return Boolean(this.options.editable && this.view && this.view.editable);
  }

  /**
   * Check if editor is destroyed.
   */
  get isDestroyed(): boolean {
    return this.view?.isDestroyed ?? true;
  }

  /**
   * Get the editor element
   */
  get element(): HTMLElement | null {
    return this.options.element!;
  }

  /**
   * Get possible users of the editor.
   */
  get users(): User[] {
    return this.options.users!;
  }

  /**
   * Create a chain of commands to call multiple commands at once.
   */
  chain(): ChainableCommandObject {
    return this.#commandService.chain();
  }

  /**
   * Check if a command or a chain of commands can be executed. Without executing it.
   */
  can(): CanObject {
    return this.#commandService.can();
  }

  /**
   * Set the document mode
   * @param documentMode - The document mode ('editing', 'viewing', 'suggesting')
   * @param _caller - Calling context (unused)
   */
  setDocumentMode(documentMode: string, _caller?: string): void {
    if (this.options.isHeaderOrFooter || this.options.isChildEditor) return;

    let cleanedMode = documentMode?.toLowerCase() || 'editing';
    if (!this.extensionService || !this.state) return;

    const pm = this.view?.dom || this.options.element?.querySelector?.('.ProseMirror');

    if (this.options.role === 'viewer') cleanedMode = 'viewing';
    if (this.options.role === 'suggester' && cleanedMode === 'editing') cleanedMode = 'suggesting';

    // Viewing mode: Not editable, no tracked changes, no comments
    if (cleanedMode === 'viewing') {
      this.commands.toggleTrackChangesShowOriginal();
      this.setEditable(false, false);
      this.setOptions({ documentMode: 'viewing' });
      if (pm) pm.classList.add('view-mode');
    }

    // Suggesting: Editable, tracked changes plugin enabled, comments
    else if (cleanedMode === 'suggesting') {
      this.commands.disableTrackChangesShowOriginal();
      this.commands.enableTrackChanges();
      this.setOptions({ documentMode: 'suggesting' });
      this.setEditable(true, false);
      if (pm) pm.classList.remove('view-mode');
    }

    // Editing: Editable, tracked changes plguin disabled, comments
    else if (cleanedMode === 'editing') {
      this.commands.disableTrackChangesShowOriginal();
      this.commands.disableTrackChanges();
      this.setEditable(true, false);
      this.setOptions({ documentMode: 'editing' });
      if (pm) pm.classList.remove('view-mode');
    }
  }

  /**
   * Blur the editor.
   */
  blur(): void {
    this.view?.dom?.blur();
  }

  /**
   * Check if editor has focus
   */
  hasFocus(): boolean {
    if (this.view) {
      return this.view.hasFocus();
    }
    return false;
  }

  /**
   * Get viewport coordinates for a document position. Falls back to the PresentationEditor
   * when running without a ProseMirror view (layout mode).
   */
  coordsAtPos(pos: number): ReturnType<PmEditorView['coordsAtPos']> | null {
    if (this.view) {
      return this.view.coordsAtPos(pos);
    }

    const layoutRects = this.presentationEditor?.getRangeRects?.(pos, pos);
    if (Array.isArray(layoutRects) && layoutRects.length > 0) {
      const rect = layoutRects[0];
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      } as ReturnType<PmEditorView['coordsAtPos']>;
    }

    return null;
  }

  /**
   * Get position from client-space coordinates.
   * In layout/presentation mode, uses PresentationEditor hit testing for accurate coordinate mapping.
   * Falls back to ProseMirror view for standard editing mode.
   */
  posAtCoords(coords: Parameters<PmEditorView['posAtCoords']>[0]): ReturnType<PmEditorView['posAtCoords']> {
    // In presentation/layout mode, use the layout engine's hit testing
    // which properly converts visible surface coordinates to document positions
    if (typeof this.presentationEditor?.hitTest === 'function') {
      // Extract coordinates from various possible coordinate formats
      const coordsObj = coords as {
        clientX?: number;
        clientY?: number;
        left?: number;
        top?: number;
        x?: number;
        y?: number;
      };
      const clientX = coordsObj?.clientX ?? coordsObj?.left ?? coordsObj?.x ?? null;
      const clientY = coordsObj?.clientY ?? coordsObj?.top ?? coordsObj?.y ?? null;
      if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
        const hit = this.presentationEditor.hitTest(clientX as number, clientY as number);
        if (hit) {
          return {
            pos: hit.pos,
            inside: hit.pos,
          };
        }
      }
    }

    // Fall back to ProseMirror view for standard editing mode
    if (this.view) {
      return this.view.posAtCoords(coords);
    }

    return null;
  }

  #registerCopyHandler(): void {
    const dom = this.view?.dom;
    if (!dom) {
      return;
    }

    dom.addEventListener('copy', (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      event.preventDefault();

      const { from, to } = this.view.state.selection;
      const slice = this.view.state.doc.slice(from, to);
      const fragment = slice.content;

      const div = document.createElement('div');
      const serializer = PmDOMSerializer.fromSchema(this.view.state.schema);
      div.appendChild(serializer.serializeFragment(fragment));

      const html = transformListsInCopiedContent(div.innerHTML);

      clipboardData.setData('text/html', html);
    });
  }

  /**
   * Export the yjs binary from the current state.
   */
  async generateCollaborationUpdate(): Promise<Uint8Array> {
    return await generateCollaborationData(this);
  }

  /**
   * Initialize data for collaborative editing
   * If we are replacing data and have a valid provider, listen for synced event
   * so that we can initialize the data
   */
  initializeCollaborationData(): void {
    if (!this.options.isNewFile || !this.options.collaborationProvider) return;
    const provider = this.options.collaborationProvider;

    const postSyncInit = () => {
      provider.off?.('synced', postSyncInit);
      this.#insertNewFileData();
    };

    if (provider.synced) this.#insertNewFileData();
    // If we are not sync'd yet, wait for the event then insert the data
    else provider.on?.('synced', postSyncInit);
  }

  /**
   * Replace content of editor that was created with loadFromSchema option
   * Used to replace content of other header/footer when one of it was edited
   *
   * @param content - new editor content json (retrieved from editor.getUpdatedJson)
   */
  replaceContent(content: ProseMirrorJSON): void {
    this.setOptions({
      content: content as unknown as Record<string, unknown>,
    });

    this.#createConverter();
    this.initDefaultStyles();

    this.#createConverter();
    this.#initMedia();

    const doc = this.#generatePmData();
    const tr = this.state.tr.replaceWith(0, this.state.doc.content.size, doc);
    tr.setMeta('replaceContent', true);
    this.#dispatchTransaction(tr);
  }

  /**
   * Replace the current document with new data. Necessary for initializing a new collaboration file,
   * since we need to insert the data only after the provider has synced.
   */
  #insertNewFileData(): void {
    if (!this.options.isNewFile) return;
    this.options.isNewFile = false;
    const doc = this.#generatePmData();
    // hiding this transaction from history so it doesn't appear in undo stack
    const tr = this.state.tr.replaceWith(0, this.state.doc.content.size, doc).setMeta('addToHistory', false);
    this.#dispatchTransaction(tr);

    setTimeout(() => {
      this.#initComments();
    }, 50);
  }

  /**
   * Set editor options and update state.
   */
  setOptions(options: Partial<EditorOptions> = {}): void {
    this.options = {
      ...this.options,
      ...options,
    };

    if ((this.options.isNewFile || !this.options.ydoc) && this.options.isCommentsEnabled) {
      this.options.shouldLoadComments = true;
    }

    if (!this.view || !this.state || this.isDestroyed) {
      return;
    }

    if (this.options.editorProps) {
      this.view.setProps(this.options.editorProps);
    }

    this.view.updateState(this.state);
  }

  /**
   * Set whether the editor is editable.
   *
   * When setting to non-editable, this method:
   * - Forces ProseMirror to re-evaluate the editable prop from the Editable plugin
   * - Blurs the editor to remove the cursor
   *
   * @param editable - Whether the editor should accept user input (default: true)
   * @param emitUpdate - Whether to emit an update event after changing editability (default: true)
   */
  setEditable(editable: boolean = true, emitUpdate: boolean = true): void {
    this.setOptions({ editable });

    // Force ProseMirror to re-evaluate the editable prop from the Editable plugin.
    // ProseMirror only updates the editable state when setProps is called,
    // even if the underlying editor.options.editable value has changed.
    if (this.view) {
      this.view.setProps({});

      // When setting to non-editable, blur the editor to remove cursor
      if (!editable && this.view.dom) {
        this.view.dom.blur();
      }
    }

    if (emitUpdate) {
      this.emit('update', { editor: this, transaction: this.state.tr });
    }
  }

  /**
   * Register PM plugin.
   * @param plugin PM plugin.
   * @param handlePlugins Optional function for handling plugin merge.
   */
  registerPlugin(plugin: Plugin, handlePlugins?: (plugin: Plugin, plugins: Plugin[]) => Plugin[]): void {
    if (!this.state?.plugins) return;
    const plugins =
      typeof handlePlugins === 'function'
        ? handlePlugins(plugin, [...this.state.plugins])
        : [...this.state.plugins, plugin];

    const state = this.state.reconfigure({ plugins });
    this.view.updateState(state);
  }

  /**
   * Safely resolve the plugin key string for a plugin instance.
   */
  #getPluginKeyName(plugin: Plugin): string {
    const pluginKey = (plugin as Plugin & { key?: { key: string } }).key;
    return typeof pluginKey?.key === 'string' ? pluginKey.key : '';
  }

  /**
   * Unregister a PM plugin
   */
  unregisterPlugin(nameOrPluginKey: string | { key?: string }): void {
    if (this.isDestroyed) return;

    const name =
      typeof nameOrPluginKey === 'string'
        ? `${nameOrPluginKey}$`
        : ((nameOrPluginKey?.key as string | undefined) ?? '');

    const state = this.state.reconfigure({
      plugins: this.state.plugins.filter((plugin) => !this.#getPluginKeyName(plugin).startsWith(name)),
    });

    this.view.updateState(state);
  }

  /**
   * Creates extension service.
   */
  #createExtensionService(): void {
    const allowedExtensions = ['extension', 'node', 'mark'];

    const coreExtensions = [Editable, Commands, EditorFocus, Keymap];
    const externalExtensions = this.options.externalExtensions || [];

    const allExtensions = [...coreExtensions, ...this.options.extensions!].filter((extension) => {
      const extensionType = typeof extension?.type === 'string' ? extension.type : undefined;
      return extensionType ? allowedExtensions.includes(extensionType) : false;
    });

    this.extensionService = ExtensionService.create(allExtensions, externalExtensions, this);
  }

  /**
   * Creates a command service.
   */
  #createCommandService(): void {
    this.#commandService = CommandService.create({
      editor: this,
    });
  }

  /**
   * Create the document converter as this.converter.
   */
  #createConverter(): void {
    if (this.options.converter) {
      this.converter = this.options.converter as SuperConverter;
    } else {
      this.converter = new SuperConverter({
        docx: this.options.content,
        media: this.options.mediaFiles,
        fonts: this.options.fonts,
        debug: true,
        telemetry: this.options.telemetry,
        fileSource: this.options.fileSource,
        documentId: this.options.documentId,
        mockWindow: this.options.mockWindow ?? null,
        mockDocument: this.options.mockDocument ?? null,
      });
    }
  }

  /**
   * Initialize media.
   */
  #initMedia(): void {
    if (this.options.isChildEditor) return;
    if (!this.options.ydoc) {
      (this.storage.image as ImageStorage).media = this.options.mediaFiles!;
      return;
    }

    const mediaMap = (this.options.ydoc as { getMap: (name: string) => Map<string, unknown> }).getMap('media');

    // We are creating a new file and need to set the media
    if (this.options.isNewFile) {
      Object.entries(this.options.mediaFiles!).forEach(([key, value]) => {
        mediaMap.set(key, value);
      });

      // Set the storage to the imported media files
      (this.storage.image as ImageStorage).media = this.options.mediaFiles!;
    }

    // If we are opening an existing file, we need to get the media from the ydoc
    else {
      (this.storage.image as ImageStorage).media = Object.fromEntries(mediaMap.entries());
    }
  }

  /**
   * Initialize fonts
   */
  #initFonts(): void {
    const results = this.converter.getFontFaceImportString();

    if (results?.styleString?.length) {
      const style = document.createElement('style');
      style.textContent = results.styleString;
      document.head.appendChild(style);

      this.fontsImported = results.fontsImported;
    }
  }

  /**
   * Determines the fonts used in the document and the unsupported ones and triggers the `onFontsResolved` callback.
   */
  async #checkFonts(): Promise<void> {
    // We only want to run the algorithm to resolve the fonts if the user has asked for it
    if (!this.options.onFontsResolved || typeof this.options.onFontsResolved !== 'function') {
      return;
    }

    if (this.options.isHeadless) {
      return;
    }

    try {
      const fontsUsedInDocument = this.converter.getDocumentFonts();
      const unsupportedFonts = this.#determineUnsupportedFonts(fontsUsedInDocument);

      const payload: FontsResolvedPayload = {
        documentFonts: fontsUsedInDocument,
        unsupportedFonts,
      };

      this.emit('fonts-resolved', payload);
    } catch {
      console.warn('[SuperDoc] Could not determine document fonts and unsupported fonts');
    }
  }

  /**
   * Determines which fonts used in the document are not supported
   * by attempting to render them on a canvas.
   * Fonts are considered unsupported if they cannot be rendered
   * and are not already imported in the document via @font-face.
   *
   * @param fonts - Array of font family names used in the document.
   * @returns Array of unsupported font family names.
   */
  #determineUnsupportedFonts(fonts: string[]): string[] {
    const unsupportedFonts = fonts.filter((font) => {
      const canRender = canRenderFont(font);
      const isFontImported = this.fontsImported.includes(font);

      return !canRender && !isFontImported;
    });

    return unsupportedFonts;
  }

  /**
   * Load the data from DOCX to be used in the schema.
   * Expects a DOCX file.
   * @param fileSource - The DOCX file to load (File/Blob in browser, Buffer in Node.js)
   * @param isNode - Whether the method is being called in a Node.js environment
   * @returns A promise that resolves to an array containing:
   *   - [0] xmlFiles - Array of XML files extracted from the DOCX
   *   - [1] mediaFiles - Object containing media files with URLs (browser only)
   *   - [2] mediaFiles - Object containing media files with base64 data
   *   - [3] fonts - Object containing font files from the DOCX
   */
  static async loadXmlData(
    fileSource: File | Blob | Buffer,
    isNode: boolean = false,
  ): Promise<[DocxFileEntry[], Record<string, unknown>, Record<string, unknown>, Record<string, unknown>] | undefined> {
    if (!fileSource) return;

    const zipper = new DocxZipper();
    const xmlFiles = await zipper.getDocxData(fileSource, isNode);
    const mediaFiles = zipper.media;

    return [xmlFiles, mediaFiles, zipper.mediaFiles, zipper.fonts];
  }

  /**
   * Get the document version
   */
  static getDocumentVersion(doc: DocxFileEntry[]): string {
    return SuperConverter.getStoredSuperdocVersion(doc);
  }

  /**
   * Set the document version
   */
  static setDocumentVersion(doc: DocxFileEntry[], version: string): string {
    return SuperConverter.setStoredSuperdocVersion(doc, version) ?? version;
  }

  /**
   * Get the document GUID
   */
  static getDocumentGuid(doc: DocxFileEntry[]): string | null {
    return SuperConverter.extractDocumentGuid(doc);
  }

  /**
   * @deprecated use setDocumentVersion instead
   */
  static updateDocumentVersion(doc: DocxFileEntry[], version: string): string {
    console.warn('updateDocumentVersion is deprecated, use setDocumentVersion instead');
    return Editor.setDocumentVersion(doc, version);
  }

  /**
   * Generates a schema summary for the current runtime schema.
   */
  async getSchemaSummaryJSON(): Promise<SchemaSummaryJSON> {
    if (!this.schema) {
      throw new Error('Schema is not initialized.');
    }

    const schemaVersion = this.converter?.getSuperdocVersion?.() || 'current';

    const suppressedNames = new Set(
      (this.extensionService?.extensions || [])
        .filter((ext: { config?: { excludeFromSummaryJSON?: boolean } }) => {
          const config = (ext as { config?: { excludeFromSummaryJSON?: boolean } })?.config;
          const suppressFlag = config?.excludeFromSummaryJSON;
          return Boolean(suppressFlag);
        })
        .map((ext: { name: string }) => ext.name),
    );

    const summary = buildSchemaSummary(this.schema, schemaVersion);

    if (!suppressedNames.size) {
      return summary;
    }

    return {
      ...summary,
      nodes: summary.nodes.filter((node) => !suppressedNames.has(node.name)),
      marks: summary.marks.filter((mark) => !suppressedNames.has(mark.name)),
    };
  }

  /**
   * Validates a ProseMirror JSON document against the current schema.
   */
  validateJSON(doc: ProseMirrorJSON | ProseMirrorJSON[]): PmNode | PmNode[] {
    if (!this.schema) {
      throw new Error('Schema is not initialized.');
    }

    try {
      if (Array.isArray(doc)) return doc.map((d) => this.schema!.nodeFromJSON(d));
      return this.schema.nodeFromJSON(doc as ProseMirrorJSON);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const validationError = new Error(`Invalid document for current schema: ${detail}`);
      if (error instanceof Error) {
        (validationError as Error & { cause?: Error }).cause = error;
      }
      throw validationError;
    }
  }

  /**
   * Creates document PM schema.
   */
  #createSchema(): void {
    this.schema = this.extensionService.schema;
  }

  /**
   * Generate ProseMirror data from file
   */
  #generatePmData(): PmNode {
    let doc: PmNode;

    try {
      const { mode, content, fragment, loadFromSchema } = this.options;
      const hasJsonContent = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value);

      if (mode === 'docx') {
        if (loadFromSchema && hasJsonContent(content)) {
          doc = this.schema.nodeFromJSON(content);
          doc = this.#prepareDocumentForImport(doc);
        } else {
          doc = createDocument(this.converter, this.schema, this);
          // Perform any additional document processing prior to finalizing the doc here
          doc = this.#prepareDocumentForImport(doc);

          // Check for markdown BEFORE html (since markdown gets converted to HTML)
          if (this.options.markdown) {
            doc = createDocFromMarkdown(this.options.markdown, this, { isImport: true });
          }
          // If we have a new doc, and have html data, we initialize from html
          else if (this.options.html) doc = createDocFromHTML(this.options.html, this, { isImport: true });
          else if (this.options.jsonOverride) doc = this.schema.nodeFromJSON(this.options.jsonOverride);

          if (fragment) doc = yXmlFragmentToProseMirrorRootNode(fragment, this.schema);
        }
      }

      // If we are in HTML mode, we initialize from either content or html (or blank)
      else if (mode === 'text' || mode === 'html') {
        if (loadFromSchema && hasJsonContent(content)) doc = this.schema.nodeFromJSON(content);
        else if (typeof content === 'string') doc = createDocFromHTML(content, this);
        else doc = this.schema.topNodeType.createAndFill()!;
      }
    } catch (err) {
      console.error(err);
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('contentError', { editor: this, error });
    }

    return doc!;
  }

  /**
   * Create the PM editor view
   */
  #createView(element: HTMLElement | null): void {
    const doc = this.#generatePmData();

    // Only initialize the doc if we are not using Yjs/collaboration.
    const state: { schema: Schema; doc?: PmNode } = { schema: this.schema };
    if (!this.options.ydoc) state.doc = doc;

    this.options.initialState = PmEditorState.create(state);

    this.view = new EditorView(element, {
      ...this.options.editorProps,
      dispatchTransaction: this.#dispatchTransaction.bind(this),
      state: this.options.initialState,
      handleClick: this.#handleNodeSelection.bind(this),
    });

    const newState = this.state.reconfigure({
      plugins: [...this.extensionService.plugins],
    });

    this.view.updateState(newState);

    this.createNodeViews();

    (this.options.telemetry as TelemetryData | null)?.trackUsage?.('editor_initialized', {});
  }

  /**
   * Creates all node views.
   */
  createNodeViews(): void {
    if (this.options.skipViewCreation || typeof this.view?.setProps !== 'function') {
      return;
    }
    this.view.setProps({
      nodeViews: this.extensionService.nodeViews,
    });
  }

  /**
   * Get the maximum content size
   */
  getMaxContentSize(): { width?: number; height?: number } {
    if (!this.converter) return {};
    const { pageSize = {}, pageMargins = {} } = this.converter.pageStyles ?? {};
    const { width, height } = pageSize;
    const { top = 0, bottom = 0, left = 0, right = 0 } = pageMargins;

    // All sizes are in inches so we multiply by 96 to get pixels
    if (!width || !height) return {};

    const maxHeight = height * 96 - top * 96 - bottom * 96 - 50;
    const maxWidth = width * 96 - left * 96 - right * 96 - 20;
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }

  /**
   * Attach styles and attributes to the editor element
   */
  updateEditorStyles(element: HTMLElement, proseMirror: HTMLElement): void {
    const { pageSize, pageMargins } = this.converter.pageStyles ?? {};

    if (!proseMirror || !element) {
      return;
    }

    proseMirror.setAttribute('role', 'document');
    proseMirror.setAttribute('aria-multiline', 'true');
    proseMirror.setAttribute('aria-label', 'Main content area, start typing to enter text.');
    proseMirror.setAttribute('aria-description', '');
    proseMirror.classList.remove('view-mode');

    // Set fixed dimensions and padding that won't change with scaling
    if (pageSize) {
      element.style.width = pageSize.width + 'in';
      element.style.minWidth = pageSize.width + 'in';
      element.style.minHeight = pageSize.height + 'in';
    }

    if (pageMargins) {
      element.style.paddingLeft = pageMargins.left + 'in';
      element.style.paddingRight = pageMargins.right + 'in';
    }

    element.style.boxSizing = 'border-box';
    element.style.isolation = 'isolate'; // to create new stacking context.

    proseMirror.style.outline = 'none';
    proseMirror.style.border = 'none';
    element.style.backgroundColor = '#fff';
    proseMirror.style.backgroundColor = '#fff';

    // Typeface and font size
    const { typeface, fontSizePt, fontFamilyCss } = this.converter.getDocumentDefaultStyles() ?? {};

    const resolvedFontFamily = fontFamilyCss || typeface;
    if (resolvedFontFamily) {
      element.style.fontFamily = resolvedFontFamily;
    }
    if (fontSizePt) {
      element.style.fontSize = `${fontSizePt}pt`;
    }

    // Mobile styles
    element.style.transformOrigin = 'top left';
    element.style.touchAction = 'auto';
    (element.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = 'touch';

    // Calculate line height
    const defaultLineHeight = 1.2;
    proseMirror.style.lineHeight = String(defaultLineHeight);

    // If we are not using pagination, we still need to add some padding for header/footer
    // Always pad the body to the page top margin so the body baseline
    // starts at pageTop + topMargin (Word parity). Pagination decorations
    // will only reserve header overflow beyond this margin.
    if (this.presentationEditor && pageMargins?.top != null) {
      proseMirror.style.paddingTop = `${pageMargins.top}in`;
    } else if (this.presentationEditor) {
      // Fallback for missing margins
      proseMirror.style.paddingTop = '1in';
    } else {
      proseMirror.style.paddingTop = '0';
    }

    // Keep footer padding managed by pagination; set to 0 here.
    proseMirror.style.paddingBottom = '0';
  }

  /**
   * Initialize default styles for the editor container and ProseMirror.
   * Get page size and margins from the converter.
   * Set document default font and font size.
   *
   * @param element - The DOM element to apply styles to
   */
  initDefaultStyles(element: HTMLElement | null = this.element): void {
    if (this.options.isHeadless || this.options.suppressDefaultDocxStyles) return;

    const proseMirror = element?.querySelector('.ProseMirror') as HTMLElement;

    this.updateEditorStyles(element!, proseMirror);

    this.initMobileStyles(element);
  }

  /**
   * Initializes responsive styles for mobile devices.
   * Sets up scaling based on viewport width and handles orientation changes.
   */
  initMobileStyles(element: HTMLElement | null): void {
    if (!element) {
      return;
    }

    const initialWidth = element.offsetWidth;

    const updateScale = () => {
      const minPageSideMargin = 10;
      const elementWidth = initialWidth;
      const availableWidth = document.documentElement.clientWidth - minPageSideMargin;

      this.options.scale = Math.min(1, availableWidth / elementWidth);

      const superEditorElement = element.closest('.super-editor') as HTMLElement;
      const superEditorContainer = element.closest('.super-editor-container') as HTMLElement;

      if (!superEditorElement || !superEditorContainer) {
        return;
      }

      if (this.options.scale! < 1) {
        superEditorElement.style.maxWidth = `${elementWidth * this.options.scale!}px`;
        superEditorContainer.style.minWidth = '0px';

        element.style.transform = `scale(${this.options.scale})`;
      } else {
        superEditorElement.style.maxWidth = '';
        superEditorContainer.style.minWidth = '';

        element.style.transform = 'none';
      }
    };

    // Initial scale
    updateScale();

    const handleResize = () => {
      setTimeout(() => {
        updateScale();
      }, 150);
    };

    if ('orientation' in screen && 'addEventListener' in screen.orientation) {
      screen.orientation.addEventListener('change', handleResize);
    } else {
      // jsdom (and some older browsers) don't implement matchMedia; skip listener in that case
      const mediaQueryList =
        typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
      if (mediaQueryList?.addEventListener) {
        mediaQueryList.addEventListener('change', handleResize);
      }
    }

    window.addEventListener('resize', () => handleResize);
  }

  /**
   * Handler called when collaboration is ready.
   * Initializes comments if not a new file.
   */
  #onCollaborationReady({ editor, ydoc }: { editor: Editor; ydoc: unknown }): void {
    if (this.options.collaborationIsReady) return;
    console.debug('🔗 [super-editor] Collaboration ready');

    this.#validateDocumentInit();

    if (this.options.ydoc) {
      this.migrateListsToV2();
    }

    this.options.onCollaborationReady!({ editor, ydoc });
    this.options.collaborationIsReady = true;
    this.options.initialState = this.state;

    const { tr } = this.state;
    tr.setMeta('collaborationReady', true);
    this.#dispatchTransaction(tr);

    if (!this.options.isNewFile) {
      this.#initComments();
      updateYdocDocxData(this, this.options.ydoc);
    }
  }

  /**
   * Initialize comments plugin
   */
  #initComments(): void {
    if (!this.options.isCommentsEnabled) return;
    if (this.options.isHeadless) return;
    if (!this.options.shouldLoadComments) return;
    const replacedFile = this.options.replacedFile;
    this.emit('commentsLoaded', {
      editor: this,
      replacedFile,
      comments: this.converter.comments || [],
    });

    setTimeout(() => {
      this.options.replacedFile = false;
      const st = this.state;
      if (!st) return;
      const tr = st.tr.setMeta(CommentsPluginKey, { type: 'force' });
      this.#dispatchTransaction(tr);
    }, 50);
  }

  /**
   * Dispatch a transaction to update the editor state
   */
  #dispatchTransaction(transaction: Transaction): void {
    if (this.isDestroyed) return;
    const start = Date.now();

    let state: EditorState;
    try {
      const trackChangesState = TrackChangesBasePluginKey.getState(this.view.state);
      const isTrackChangesActive = trackChangesState?.isTrackChangesActive ?? false;

      const tr = isTrackChangesActive
        ? trackedTransaction({
            tr: transaction,
            state: this.state,
            user: this.options.user!,
          })
        : transaction;

      const { state: newState } = this.view.state.applyTransaction(tr);
      state = newState;
    } catch (error) {
      // just in case
      state = this.state.apply(transaction);
      console.log(error);
    }

    const selectionHasChanged = !this.state.selection.eq(state.selection);
    this.view.updateState(state);

    const end = Date.now();
    this.emit('transaction', {
      editor: this,
      transaction,
      duration: end - start,
    });

    if (selectionHasChanged) {
      this.emit('selectionUpdate', {
        editor: this,
        transaction,
      });
    }

    const focus = transaction.getMeta('focus');
    if (focus) {
      this.emit('focus', {
        editor: this,
        event: focus.event,
        transaction,
      });
    }

    const blur = transaction.getMeta('blur');
    if (blur) {
      this.emit('blur', {
        editor: this,
        event: blur.event,
        transaction,
      });
    }

    if (!transaction.docChanged) {
      return;
    }

    // Track document modifications and promote to GUID if needed
    if (transaction.docChanged && this.converter) {
      if (!this.converter.documentGuid) {
        this.converter.promoteToGuid();
        console.debug('Document modified - assigned GUID:', this.converter.documentGuid);
      }
      this.converter.documentModified = true;
    }

    this.emit('update', {
      editor: this,
      transaction,
    });
  }

  /**
   * Public dispatch method for transaction dispatching.
   * Allows external callers (e.g., SuperDoc stores) to dispatch plugin meta
   * transactions without accessing editor.view directly.
   */
  dispatch(tr: Transaction): void {
    this.#dispatchTransaction(tr);
  }

  /**
   * Get document identifier for telemetry (async - may generate hash)
   */
  async getDocumentIdentifier(): Promise<string | null> {
    return (await this.converter?.getDocumentIdentifier()) || null;
  }

  /**
   * Get permanent document GUID (sync - only for modified documents)
   */
  getDocumentGuid(): string | null {
    return this.converter?.documentGuid || null;
  }

  /**
   * Check if document has been modified
   */
  isDocumentModified(): boolean {
    return this.converter?.documentModified || false;
  }

  /**
   * Get telemetry data (async because of lazy hash generation)
   */
  async getTelemetryData(): Promise<{
    documentId: string | null;
    isModified: boolean;
    isPermanentId: boolean;
    version: string | null;
  }> {
    return {
      documentId: await this.getDocumentIdentifier(),
      isModified: this.isDocumentModified(),
      isPermanentId: !!this.converter?.documentGuid,
      version: this.converter?.getSuperdocVersion(),
    };
  }

  /**
   * @deprecated use getDocumentGuid instead
   */
  getDocumentId(): string | null {
    console.warn('getDocumentId is deprecated, use getDocumentGuid instead');
    return this.getDocumentGuid();
  }

  /**
   * Get attrs of the currently selected node or mark.
   * @example
   * editor.getAttributes('textStyle').color
   */
  getAttributes(nameOrType: string): Record<string, unknown> {
    return Attribute.getAttributes(this.state, nameOrType);
  }

  /**
   * Returns if the currently selected node or mark is active.
   * @param nameOrAttributes - The name of the node/mark or an attributes object
   * @param attributesOrUndefined - Optional attributes to check when first parameter is a name
   * @example
   * editor.isActive('bold')
   * editor.isActive('textStyle', { color: 'purple' })
   * editor.isActive({ textAlign: 'center' })
   */
  isActive(
    nameOrAttributes: string | Record<string, unknown>,
    attributesOrUndefined?: Record<string, unknown>,
  ): boolean {
    const name = typeof nameOrAttributes === 'string' ? nameOrAttributes : null;
    const attributes = typeof nameOrAttributes === 'string' ? attributesOrUndefined : nameOrAttributes;
    return isActive(this.state, name, attributes);
  }

  /**
   * Get the editor content as JSON
   */
  getJSON(): ProseMirrorJSON {
    const json = this.state.doc.toJSON();
    try {
      // Check if the document has bodySectPr in attrs, and add from converter if missing
      const jsonObj = json as ProseMirrorJSON;
      const attrs = jsonObj.attrs as Record<string, unknown> | undefined;
      const hasBody = attrs && 'bodySectPr' in attrs;
      const converter = this.converter as unknown as { bodySectPr?: unknown };
      if (!hasBody && converter && converter.bodySectPr) {
        jsonObj.attrs = attrs || {};
        (jsonObj.attrs as Record<string, unknown>).bodySectPr = converter.bodySectPr;
      }
    } catch {
      // Non-fatal: leave json as-is if anything unexpected occurs
    }
    return json as ProseMirrorJSON;
  }

  /**
   * Get document metadata including GUID, modification status, and version
   */
  getMetadata(): {
    documentGuid: string | null;
    isModified: boolean;
    version: string | null;
  } {
    return {
      documentGuid: this.converter?.documentGuid || null,
      isModified: this.isDocumentModified(),
      version: this.converter?.getSuperdocVersion() || null,
    };
  }

  /**
   * Get the editor content as HTML
   */
  getHTML({ unflattenLists = false }: { unflattenLists?: boolean } = {}): string {
    const tempDocument = document.implementation.createHTMLDocument();
    const container = tempDocument.createElement('div');
    const fragment = PmDOMSerializer.fromSchema(this.schema).serializeFragment(this.state.doc.content);
    container.appendChild(fragment);
    let html = container.innerHTML;
    if (unflattenLists) {
      html = unflattenListsInHtml(html);
    }
    return html;
  }

  /**
   * Get the editor content as Markdown
   */
  async getMarkdown(): Promise<string> {
    // Lazy-load markdown libraries to avoid requiring 'document' at import time
    // These libraries (specifically rehype) execute code that accesses document.createElement()
    // during module initialization, which breaks Node.js compatibility
    const [
      { unified },
      { default: rehypeParse },
      { default: rehypeRemark },
      { default: remarkStringify },
      { default: remarkGfm },
    ] = await Promise.all([
      import('unified'),
      import('rehype-parse'),
      import('rehype-remark'),
      import('remark-stringify'),
      import('remark-gfm'),
    ]);

    const html = this.getHTML();
    const file = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify, {
        bullet: '-',
        fences: true,
      })
      .processSync(html);

    return String(file);
  }

  /**
   * Get the document version from the converter
   */
  getDocumentVersion(): string | null {
    return this.converter?.getSuperdocVersion() || null;
  }

  /**
   * Create a child editor linked to this editor.
   * This is useful for creating header/footer editors that are linked to the main editor.
   * Or paragraph fields that rely on the same underlying document and list defintions
   */
  createChildEditor(options: Partial<EditorOptions>): Editor {
    return createLinkedChildEditor(this, options);
  }

  /**
   * Get page styles
   */
  getPageStyles(): PageStyles {
    return this.converter?.pageStyles || {};
  }

  /**
   * Update page styles
   */
  updatePageStyle({ pageMargins }: { pageMargins?: Record<string, unknown> }): void {
    if (!this.converter) return;

    let hasMadeUpdate = false;
    if (pageMargins) {
      this.converter.pageStyles.pageMargins = pageMargins;
      this.initDefaultStyles();
      hasMadeUpdate = true;
    }

    if (hasMadeUpdate && this.view && !isHeadless()) {
      const newTr = this.view.state.tr;
      newTr.setMeta('forceUpdatePagination', true);
      this.#dispatchTransaction(newTr);

      // Emit dedicated event for page style updates
      // This provides a clearer semantic signal for consumers that need to react
      // to page style changes (margins, size, orientation) without content modifications
      this.emit('pageStyleUpdate', {
        pageMargins,
        pageStyles: this.converter.pageStyles,
      });
    }
  }

  /**
   * Handles image node selection for header/footer editor
   */
  #handleNodeSelection(view: PmEditorView, pos: number): boolean | void {
    this.setOptions({
      lastSelection: null,
    });

    if (this.options.isHeaderOrFooter) {
      return setImageNodeSelection(view, pos);
    }
  }

  /**
   * Perform any post conversion pre prosemirror import processing.
   * Comments are processed here.
   * @param doc The prosemirror document
   * @returns The updated prosemirror document
   */
  #prepareDocumentForImport(doc: PmNode): PmNode {
    const newState = PmEditorState.create({
      schema: this.schema,
      doc,
    });

    const { tr, doc: newDoc } = newState;

    // Perform comments processing (replaces comment nodes with marks)
    prepareCommentsForImport(newDoc, tr, this.schema, this.converter);

    const updatedState = newState.apply(tr);
    return updatedState.doc;
  }

  migrateListsToV2(): Array<{ from: number; to: number; slice: unknown }> {
    if (this.options.isHeaderOrFooter) return [];
    const replacements = migrateListsToV2IfNecessary(this);
    return replacements;
  }

  /**
   * Prepare the document for export. Any necessary pre-export processing to the state
   * can happen here.
   * @returns The updated document in JSON
   */
  #prepareDocumentForExport(comments: Comment[] = []): ProseMirrorJSON {
    const newState = PmEditorState.create({
      schema: this.schema,
      doc: this.state.doc,
      plugins: this.state.plugins,
    });

    const { tr, doc } = newState;

    prepareCommentsForExport(doc, tr, this.schema, comments);
    const updatedState = newState.apply(tr);
    return updatedState.doc.toJSON();
  }

  getUpdatedJson(): ProseMirrorJSON {
    return this.#prepareDocumentForExport();
  }

  /**
   * Export the editor document to DOCX.
   */
  async exportDocx({
    isFinalDoc = false,
    commentsType = 'external',
    exportJsonOnly = false,
    exportXmlOnly = false,
    comments = [],
    getUpdatedDocs = false,
    fieldsHighlightColor = null,
  }: {
    isFinalDoc?: boolean;
    commentsType?: string;
    exportJsonOnly?: boolean;
    exportXmlOnly?: boolean;
    comments?: Comment[];
    getUpdatedDocs?: boolean;
    fieldsHighlightColor?: string | null;
  } = {}): Promise<Blob | ArrayBuffer | Buffer | Record<string, string> | ProseMirrorJSON | string | undefined> {
    try {
      // Pre-process the document state to prepare for export
      const json = this.#prepareDocumentForExport(comments);

      // Export the document to DOCX
      // GUID will be handled automatically in converter.exportToDocx if document was modified
      const documentXml = await this.converter.exportToDocx(
        json,
        this.schema,
        (this.storage.image as ImageStorage).media,
        isFinalDoc,
        commentsType,
        comments,
        this,
        exportJsonOnly,
        fieldsHighlightColor,
      );

      this.#validateDocumentExport();

      if (exportXmlOnly || exportJsonOnly) return documentXml;

      const customXml = this.converter.schemaToXml(this.converter.convertedXml['docProps/custom.xml'].elements[0]);
      const styles = this.converter.schemaToXml(this.converter.convertedXml['word/styles.xml'].elements[0]);
      const hasCustomSettings = !!this.converter.convertedXml['word/settings.xml']?.elements?.length;
      const customSettings = hasCustomSettings
        ? this.converter.schemaToXml(this.converter.convertedXml['word/settings.xml']?.elements?.[0])
        : null;

      const rels = this.converter.schemaToXml(this.converter.convertedXml['word/_rels/document.xml.rels'].elements[0]);

      const media = this.converter.addedMedia;

      const updatedHeadersFooters: Record<string, string> = {};
      Object.entries(this.converter.convertedXml).forEach(([name, json]) => {
        if (name.includes('header') || name.includes('footer')) {
          const jsonObj = json as { elements?: unknown[] };
          const resultXml = this.converter.schemaToXml(jsonObj.elements?.[0]);
          updatedHeadersFooters[name] = String(resultXml.replace(/\[\[sdspace\]\]/g, ''));
        }
      });

      const numberingData = this.converter.convertedXml['word/numbering.xml'];
      const numbering = this.converter.schemaToXml(numberingData.elements[0]);
      const updatedDocs: Record<string, string> = {
        ...this.options.customUpdatedFiles,
        'word/document.xml': String(documentXml),
        'docProps/custom.xml': String(customXml),
        'word/_rels/document.xml.rels': String(rels),
        'word/numbering.xml': String(numbering),

        // Replace & with &amp; in styles.xml as DOCX viewers can't handle it
        'word/styles.xml': String(styles).replace(/&/gi, '&amp;'),
        ...updatedHeadersFooters,
      };

      if (hasCustomSettings) {
        updatedDocs['word/settings.xml'] = String(customSettings);
      }

      if (comments.length) {
        const commentsXml = this.converter.schemaToXml(this.converter.convertedXml['word/comments.xml'].elements[0]);
        const commentsExtendedXml = this.converter.schemaToXml(
          this.converter.convertedXml['word/commentsExtended.xml'].elements[0],
        );
        const commentsExtensibleXml = this.converter.schemaToXml(
          this.converter.convertedXml['word/commentsExtensible.xml'].elements[0],
        );
        const commentsIdsXml = this.converter.schemaToXml(
          this.converter.convertedXml['word/commentsIds.xml'].elements[0],
        );

        updatedDocs['word/comments.xml'] = String(commentsXml);
        updatedDocs['word/commentsExtended.xml'] = String(commentsExtendedXml);
        updatedDocs['word/commentsExtensible.xml'] = String(commentsExtensibleXml);
        updatedDocs['word/commentsIds.xml'] = String(commentsIdsXml);
      }

      const zipper = new DocxZipper();

      if (getUpdatedDocs) {
        updatedDocs['[Content_Types].xml'] = await zipper.updateContentTypes(
          {
            files: this.options.content,
          },
          media,
          true,
          updatedDocs,
        );
        return updatedDocs;
      }

      const result = await zipper.updateZip({
        docx: this.options.content,
        updatedDocs: updatedDocs,
        originalDocxFile: this.options.fileSource,
        media,
        fonts: this.options.fonts,
        isHeadless: this.options.isHeadless,
      });

      (this.options.telemetry as TelemetryData | null)?.trackUsage?.('document_export', {
        documentType: 'docx',
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('exception', { error: err, editor: this });
      console.error(err);
    }
  }

  /**
   * Destroy collaboration provider and ydoc
   */
  #endCollaboration(): void {
    if (!this.options.ydoc) return;
    try {
      console.debug('🔗 [super-editor] Ending collaboration');
      this.options.collaborationProvider?.disconnect?.();
      (this.options.ydoc as { destroy: () => void }).destroy();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('exception', { error: err, editor: this });
      console.error(err);
    }
  }

  /**
   * Destroy the editor and clean up resources
   */
  destroy(): void {
    this.emit('destroy');

    this.unmount();

    this.destroyHeaderFooterEditors();
    this.#endCollaboration();
    this.removeAllListeners();
  }

  destroyHeaderFooterEditors(): void {
    try {
      const headerEditors = this.converter?.headerEditors ?? [];
      const footerEditors = this.converter?.footerEditors ?? [];
      if (!headerEditors.length && !footerEditors.length) return;

      const editors = [...headerEditors, ...footerEditors].filter(Boolean);
      for (const editorData of editors) {
        editorData?.editor?.destroy?.();
      }
      if (headerEditors.length) headerEditors.length = 0;
      if (footerEditors.length) footerEditors.length = 0;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('exception', { error: err, editor: this });
      console.error(err);
    }
  }

  /**
   * Check if migrations are needed for the data
   */
  static checkIfMigrationsNeeded(): boolean {
    const dataVersion = version ?? 'initial';
    const migrations = getNecessaryMigrations(dataVersion) || [];
    console.debug('[checkVersionMigrations] Migrations needed:', dataVersion, migrations.length);
    return migrations.length > 0;
  }

  /**
   * Process collaboration migrations
   */
  processCollaborationMigrations(): unknown | void {
    console.debug('[checkVersionMigrations] Current editor version', __APP_VERSION__);
    if (!this.options.ydoc) return;

    const metaMap = (this.options.ydoc as { getMap: (name: string) => Map<string, unknown> }).getMap('meta');
    let docVersion = metaMap.get('version');
    if (!docVersion) docVersion = 'initial';
    console.debug('[checkVersionMigrations] Document version', docVersion);
    const migrations = getNecessaryMigrations(docVersion) || [];

    const plugins = this.state.plugins;
    const syncPlugin = plugins.find((plugin) => this.#getPluginKeyName(plugin).startsWith('y-sync'));
    if (!syncPlugin) return this.options.ydoc;

    let hasRunMigrations = false;
    for (const migration of migrations) {
      console.debug('🏃‍♂️ Running migration', migration.name);
      const result = migration(this);
      if (!result) throw new Error('Migration failed at ' + migration.name);
      else hasRunMigrations = true;
    }

    // If no migrations were run, return undefined (no updated ydoc).
    if (!hasRunMigrations) return;

    // Return the updated ydoc
    const pluginState = syncPlugin?.getState(this.state);
    return pluginState.doc;
  }

  /**
   * Replace the current file
   */
  async replaceFile(newFile: File | Blob | Buffer): Promise<void> {
    this.setOptions({ annotations: true });
    const [docx, media, mediaFiles, fonts] = (await Editor.loadXmlData(newFile))!;
    this.setOptions({
      fileSource: newFile,
      content: docx,
      media,
      mediaFiles,
      fonts,
      isNewFile: true,
    });
    this.options.shouldLoadComments = true;
    this.options.replacedFile = true;

    this.#createConverter();
    this.#initMedia();
    this.initDefaultStyles();

    if (this.options.ydoc && this.options.collaborationProvider) {
      updateYdocDocxData(this, this.options.ydoc);
      this.initializeCollaborationData();
    } else {
      this.#insertNewFileData();
    }

    if (!this.options.ydoc) {
      this.#initComments();
    }
  }

  /**
   * Get internal docx file content
   * @param name - File name
   * @param type - type of result (json, string)
   */
  getInternalXmlFile(name: string, type: 'json' | 'string' = 'json'): unknown | string | null {
    if (!this.converter.convertedXml[name]) {
      console.warn('Cannot find file in docx');
      return null;
    }

    if (type === 'json') {
      return this.converter.convertedXml[name].elements[0] || null;
    }
    return this.converter.schemaToXml(this.converter.convertedXml[name].elements[0]);
  }

  /**
   * Update internal docx file content
   * @param name - File name
   * @param updatedContent - new file content
   */
  updateInternalXmlFile(name: string, updatedContent: string | unknown): void {
    if (typeof updatedContent === 'string') {
      this.options.customUpdatedFiles![name] = String(updatedContent);
    } else {
      const internalFileXml = this.converter.schemaToXml(updatedContent);
      this.options.customUpdatedFiles![name] = String(internalFileXml);
    }
    this.options.isCustomXmlChanged = true;
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesOfType(type: string): Array<{ node: PmNode; pos: number }> {
    const { findChildren } = helpers;
    return findChildren(this.state.doc, (node: PmNode) => node.type.name === type);
  }

  /**
   * Replace a node with HTML content
   */
  replaceNodeWithHTML(targetNode: { node: PmNode; pos: number }, html: string): void {
    const { tr } = this.state;
    const { dispatch } = this.view;

    if (!targetNode || !html) return;
    const start = targetNode.pos;
    const end = start + targetNode.node.nodeSize;
    const htmlNode = createDocFromHTML(html, this);
    tr.replaceWith(start, end, htmlNode);
    dispatch(tr);
  }

  /**
   * A command to prepare the editor to receive annotations. This will
   * pre-process the document as needed prior to running in the annotator.
   *
   * Currently this is only used for table generation but additional pre-processing can be done here.
   */
  prepareForAnnotations(annotationValues: FieldValue[] = []): void {
    const { tr } = this.state;
    const newTr = AnnotatorHelpers.processTables({ state: this.state, tr, annotationValues });
    this.view.dispatch(newTr);
  }

  /**
   * Migrate paragraph fields to lists V2 structure if necessary.
   * @param annotationValues - List of field values to migrate.
   * @returns Returns a promise that resolves to the migrated values
   */
  async migrateParagraphFields(annotationValues: FieldValue[] = []): Promise<FieldValue[]> {
    if (!Array.isArray(annotationValues) || !annotationValues.length) return annotationValues;
    const result = await migrateParagraphFieldsListsV2(annotationValues, this);
    return result;
  }

  /**
   * Annotate the document with the given annotation values.
   */
  annotate(annotationValues: FieldValue[] = [], hiddenIds: string[] = [], removeEmptyFields: boolean = false): void {
    const { state, view, schema } = this;
    let tr = state.tr;

    tr = AnnotatorHelpers.processTables({ state: this.state, tr, annotationValues });
    tr = AnnotatorHelpers.annotateDocument({
      tr,
      schema,
      annotationValues,
      hiddenFieldIds: hiddenIds,
      removeEmptyFields,
      editor: this,
    });

    // Dispatch everything in a single transaction, which makes this undo-able in a single undo
    if (tr.docChanged) view.dispatch(tr.scrollIntoView());
  }

  /**
   * Preview annotations in the editor. It stores a copy of the original state.
   * This can be reverted via closePreview()
   */
  previewAnnotations(annotationValues: FieldValue[] = [], hiddenIds: string[] = []): void {
    this.originalState = this.view.state;
    this.annotate(annotationValues, hiddenIds);
  }

  /**
   * If there is a preview active, this will revert the editor to the original state.
   */
  closePreview(): void {
    if (!this.originalState) return;
    this.view.updateState(this.originalState);
  }

  /**
   * Run the SuperValidator's active document validation to check and fix potential known issues.
   */
  #validateDocumentInit(): void {
    if (this.options.isHeaderOrFooter || this.options.isChildEditor) return;

    const validator = new SuperValidator({ editor: this, dryRun: false, debug: false });
    validator.validateActiveDocument();
  }

  /**
   * Run the SuperValidator's on document upon export to check and fix potential known issues.
   */
  #validateDocumentExport(): void {
    if (this.options.isHeaderOrFooter || this.options.isChildEditor) return;

    const validator = new SuperValidator({ editor: this, dryRun: false, debug: false });
    validator.validateDocumentExport();
  }

  #initDevTools(): void {
    if (this.options.isHeaderOrFooter) return;

    if (process.env.NODE_ENV === 'development' || this.options.isDebug) {
      (window as Window & { superdocdev?: unknown }).superdocdev = {
        converter: this.converter,
        editor: this,
      };
    }
  }
}
