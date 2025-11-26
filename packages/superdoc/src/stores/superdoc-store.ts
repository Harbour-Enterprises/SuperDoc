import { defineStore } from 'pinia';
import { ref, shallowRef, reactive, computed, type Ref, type ShallowRef, type ComputedRef } from 'vue';
import { getFileObject } from '@superdoc/common';
import { DOCX, PDF } from '@superdoc/common';
import { normalizeDocumentEntry } from '../core/helpers/file';
import useDocument, { type UseDocumentReturn } from '../composables/use-document';
import BlankDOCX from '@superdoc/common/data/blank.docx?url';
import type { Config, Document as DocumentConfig, User, Document } from '../core/types';

/**
 * Extended document configuration with additional properties
 */
interface ExtendedDocumentConfig extends DocumentConfig {
  /** HTML content for initialization */
  html?: string;
  /** Markdown content for initialization */
  markdown?: string;
}

/**
 * Document bounds information
 */
interface DocumentBounds {
  [key: string]: unknown;
}

/**
 * Page information keyed by document ID
 */
interface Pages {
  [documentId: string]: PageInfo[];
}

/**
 * Page container information
 */
interface PageInfo {
  /** Page number */
  page: number;
  /** Container DOM element */
  container?: HTMLElement;
  /** Container bounds information */
  containerBounds: DOMRect | { originalHeight: number };
}

/**
 * Selection position information
 */
interface SelectionPosition {
  /** Left position */
  left: number;
  /** Top position */
  top: number;
  /** Width of the selection */
  width: number;
  /** Height of the selection */
  height: number;
  /** Source of the selection */
  source: string | null;
}

/**
 * Active selection object
 */
interface ActiveSelection {
  /** Document ID */
  documentId: string;
  /** Selection bounds */
  selectionBounds: SelectionBounds;
  [key: string]: unknown;
}

/**
 * Selection bounds
 */
interface SelectionBounds {
  /** Top position */
  top: number;
  /** Left position */
  left: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  [key: string]: unknown;
}

/**
 * Document scroll position
 */
interface DocumentScroll {
  /** Vertical scroll position */
  scrollTop: number;
  /** Horizontal scroll position */
  scrollLeft: number;
}

/**
 * Exception payload for error handling
 */
interface ExceptionPayload {
  /** The error object */
  error: Error;
  /** Stage where the error occurred */
  stage?: string;
  /** Document related to the error */
  document?: Document;
  [key: string]: unknown;
}

/**
 * Page bounds return type
 */
interface PageBounds {
  /** Top position of the page */
  top: number;
}

/**
 * Modules configuration
 */
interface Modules {
  /** Comments module config */
  comments?: Record<string, unknown>;
  /** Collaboration module flag */
  collaboration?: boolean;
  [key: string]: unknown;
}

/**
 * SuperDoc store return type
 */
interface SuperdocStoreReturn {
  // State refs
  documents: ShallowRef<UseDocumentReturn[]>;
  documentBounds: Ref<DocumentBounds[]>;
  pages: Pages;
  documentUsers: Ref<User[]>;
  users: Ref<User[]>;
  activeZoom: Ref<number>;
  documentScroll: DocumentScroll;
  isInternal: Ref<boolean>;
  selectionPosition: Ref<SelectionPosition | null>;
  activeSelection: Ref<ActiveSelection | null>;
  isReady: Ref<boolean>;
  user: User;
  modules: Modules;

  // Computed getters
  areDocumentsReady: ComputedRef<boolean>;

  // Actions
  init: (config: Config) => Promise<void>;
  setExceptionHandler: (handler: ((payload: ExceptionPayload) => void) | null) => void;
  reset: () => void;
  handlePageReady: (documentId: string, index: number, containerBounds: DOMRect) => void;
  getDocument: (documentId: string) => UseDocumentReturn | undefined;
  getPageBounds: (documentId: string, page: number) => PageBounds | undefined;
}

/**
 * Pinia store for managing SuperDoc state
 *
 * This is the main store for SuperDoc that handles:
 * - Document management and initialization
 * - User state and permissions
 * - Module configuration (comments, collaboration, etc.)
 * - Selection and scroll state
 * - Page bounds and zoom levels
 * - Exception handling
 *
 * It coordinates with other stores (like comments-store) and manages
 * the lifecycle of document composables.
 */
export const useSuperdocStore = defineStore('superdoc', (): SuperdocStoreReturn => {
  const currentConfig = ref<Config | null>(null);
  let exceptionHandler: ((payload: ExceptionPayload) => void) | null = null;
  // Lazy load commentsStore to avoid circular dependency
  const documents = shallowRef<UseDocumentReturn[]>([]);
  const documentBounds = ref<DocumentBounds[]>([]);
  const pages = reactive<Pages>({});
  const documentUsers = ref<User[]>([]);
  const activeZoom = ref<number>(100);
  const isReady = ref<boolean>(false);
  const isInternal = ref<boolean>(false);

  const users = ref<User[]>([]);

  const user = reactive<User>({ name: '', email: '' });
  const modules = reactive<Modules>({});

  const activeSelection = ref<ActiveSelection | null>(null);
  const selectionPosition: Ref<SelectionPosition | null> = ref<SelectionPosition | null>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    source: null,
  });

  /**
   * Reset the store to initial state
   *
   * Clears all documents, pages, users, and resets configuration.
   * Called when initializing a new SuperDoc instance.
   */
  const reset = (): void => {
    documents.value = [];
    documentBounds.value = [];
    Object.assign(pages, {});
    documentUsers.value = [];
    isReady.value = false;
    user.name = '';
    user.email = '';
    Object.assign(modules, {});
    activeSelection.value = null;
  };

  const documentScroll = reactive<DocumentScroll>({
    scrollTop: 0,
    scrollLeft: 0,
  });

  /**
   * Set a custom exception handler
   *
   * @param handler - Function to handle exceptions
   */
  const setExceptionHandler = (handler: ((payload: ExceptionPayload) => void) | null): void => {
    exceptionHandler = typeof handler === 'function' ? handler : null;
  };

  /**
   * Emit an exception to the configured handler
   *
   * @param payload - Exception information including error and context
   */
  const emitException = (payload: ExceptionPayload): void => {
    const handler = exceptionHandler || currentConfig.value?.onException;
    if (typeof handler === 'function') handler(payload);
  };

  /**
   * Initialize SuperDoc with configuration
   *
   * @param config - SuperDoc configuration object
   */
  const init = async (config: Config): Promise<void> => {
    reset();
    currentConfig.value = config;
    const { documents: configDocs, modules: configModules, user: configUser, users: configUsers } = config;

    documentUsers.value = configUsers || [];

    // Init current user
    Object.assign(user, configUser);

    // Set up module config
    Object.assign(modules, configModules);
    if (!Object.prototype.hasOwnProperty.call(modules, 'comments')) {
      modules.comments = {};
    }

    // For shorthand 'format' key, we can initialize a blank docx
    if (!configDocs?.length && !config.modules?.collaboration) {
      const newDoc = await getFileObject(BlankDOCX, 'blank.docx', DOCX);
      const newDocConfig: ExtendedDocumentConfig = {
        type: DOCX,
        data: newDoc,
        name: 'blank.docx',
        isNewFile: true,
      };

      if (config.html) newDocConfig.html = config.html;
      if (config.markdown) newDocConfig.markdown = config.markdown;
      configDocs!.push(newDocConfig);
    }

    // Initialize documents
    await initializeDocuments(configDocs);
    isReady.value = true;
  };

  /**
   * Initialize the documents for this SuperDoc. Changes the store's documents array ref directly.
   *
   * @param docsToProcess - The documents to process from the config
   */
  const initializeDocuments = async (docsToProcess: ExtendedDocumentConfig[] = []): Promise<void> => {
    if (!docsToProcess) return;

    for (const doc of docsToProcess) {
      if (!doc) {
        emitException({
          error: new Error('Received empty document entry during initialization.'),
          stage: 'document-init',
          document: doc,
        });
        console.warn('[superdoc] Skipping empty document entry.');
        continue;
      }

      try {
        // Ensure the document object has data (ie: if loading from URL)
        const docWithData = await _initializeDocumentData(doc);

        if (!docWithData) {
          emitException({
            error: new Error('Document could not be initialized with the provided configuration.'),
            stage: 'document-init',
            document: doc,
          });
          console.warn('[superdoc] Skipping document due to invalid configuration:', doc);
          continue;
        }

        // Create composable and append to our documents
        const smartDoc = useDocument(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          docWithData as any,
          currentConfig.value! as Config,
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documents.value.push(smartDoc as any);
      } catch (e) {
        emitException({ error: e as Error, stage: 'document-init', document: doc });
        console.warn('[superdoc] Error initializing document:', doc, 'with error:', e, 'Skipping document.');
      }
    }
  };

  /**
   * Convert a Blob to a File object when a filename is required
   *
   * @param blob - The blob to convert
   * @param name - The filename to assign
   * @param type - The mime type
   * @returns The file object
   */
  const _blobToFile = (blob: Blob, name: string, type: string): File => {
    return new File([blob], name, { type });
  };

  /**
   * Initialize the document data by fetching the file if necessary
   *
   * @param doc - The document config
   * @returns The document object with data
   */
  const _initializeDocumentData = async (doc: ExtendedDocumentConfig): Promise<ExtendedDocumentConfig | null> => {
    // Normalize any uploader-specific wrapper to a native File/Blob upfront
    doc = normalizeDocumentEntry(doc) as ExtendedDocumentConfig;
    if (currentConfig.value?.html) doc.html = currentConfig.value.html;

    // Use docx as default if no type provided
    if (!doc.data && doc.url && !doc.type) doc.type = DOCX;

    // If in collaboration mode, return the document as is
    if (currentConfig.value?.modules?.collaboration && !doc.isNewFile) {
      return { ...doc, data: null, url: undefined };
    }

    // If we already have data (File/Blob), ensure it has the expected metadata
    if (doc.data instanceof File) {
      let fileName = doc.name;
      const extension = doc.type === DOCX ? '.docx' : doc.type === PDF ? '.pdf' : '.bin';
      if (!fileName) {
        fileName = `document${extension}`;
      } else if (!fileName.includes('.')) {
        fileName = `${fileName}${extension}`;
      }

      if (doc.data.name !== fileName) {
        const fileObject = _blobToFile(doc.data, fileName, doc.data.type || doc.type);
        return { ...doc, name: fileName, data: fileObject };
      }

      if (!doc.name) return { ...doc, name: fileName };

      return doc;
    }
    // If we have a Blob object, convert it to a File with appropriate name
    else if (doc.data instanceof Blob) {
      // Use provided name or generate a default name based on type
      let fileName = doc.name;
      if (!fileName) {
        const extension = doc.type === DOCX ? '.docx' : doc.type === PDF ? '.pdf' : '.bin';
        fileName = `document${extension}`;
      }
      const fileObject = _blobToFile(doc.data, fileName, doc.data.type || doc.type);
      return { ...doc, data: fileObject };
    }
    // If we have any other data object, return it as is (for backward compatibility)
    else if (doc.data) return doc;
    // If we have a URL, fetch the file and return it
    else if (doc.url && doc.type) {
      if (doc.type.toLowerCase() === 'docx') doc.type = DOCX;
      else if (doc.type.toLowerCase() === 'pdf') doc.type = PDF;
      const fileObject = await getFileObject(
        doc.url,
        doc.name || 'document',
        doc.type as 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/pdf',
      );
      return { ...doc, data: fileObject };
    }
    // Invalid configuration
    return null;
  };

  /**
   * Computed getter for checking if all documents are ready
   *
   * @returns True if all PDF documents have finished loading
   */
  const areDocumentsReady = computed<boolean>(() => {
    const pdfDocs = documents.value.filter((doc) => doc.type === 'pdf');
    for (const obj of pdfDocs) {
      const isReadyValue = obj.isReady as Ref<boolean> | boolean;
      if (!isReadyValue || (typeof isReadyValue === 'object' && 'value' in isReadyValue && !isReadyValue.value))
        return false;
    }
    return true;
  });

  /**
   * Get a document by ID
   *
   * @param documentId - The document ID to find
   * @returns The document or undefined if not found
   */
  const getDocument = (documentId: string): UseDocumentReturn | undefined =>
    documents.value.find((doc) => doc.id === documentId) as UseDocumentReturn | undefined;

  /**
   * Get the bounds of a specific page
   *
   * @param documentId - The document ID
   * @param page - The page number
   * @returns Page bounds or undefined if not found
   */
  const getPageBounds = (documentId: string, page: number): PageBounds | undefined => {
    const matchedPage = pages[documentId];
    if (!matchedPage) return;
    const pageInfo = matchedPage.find((p) => p.page == page);
    if (!pageInfo || !pageInfo.container) return;

    const containerBounds = pageInfo.container.getBoundingClientRect();
    const { height } = containerBounds;
    const totalHeight = height * (page - 1);
    return {
      top: totalHeight,
    };
  };

  /**
   * Handle when a page is ready and register its bounds
   *
   * @param documentId - The document ID
   * @param index - The page index/number
   * @param containerBounds - The container's bounding rect
   */
  const handlePageReady = (documentId: string, index: number, containerBounds: DOMRect): void => {
    if (!pages[documentId]) pages[documentId] = [];
    pages[documentId].push({ page: index, containerBounds });

    const doc = getDocument(documentId);
    if (!doc) return;

    doc.pageContainers.value.push({
      page: index,
      containerBounds,
    } as unknown as HTMLElement);
  };

  return {
    documents,
    documentBounds,
    pages,
    documentUsers,
    users,
    activeZoom,
    documentScroll,
    isInternal,

    selectionPosition,
    activeSelection,

    isReady,

    user,
    modules,

    // Getters
    areDocumentsReady,

    // Actions
    init,
    setExceptionHandler,
    reset,
    handlePageReady,
    getDocument,
    getPageBounds,
  };
});
