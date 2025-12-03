import { range } from '../helpers/range.js';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

/**
 * Supported PDF adapter types
 */
export type AdapterType = 'pdfjs';

/**
 * Event bus for coordinating PDF viewer events
 */
export interface EventBus {
  /**
   * Subscribe to an event
   */
  on(eventName: string, listener: (...args: unknown[]) => unknown, options?: object): void;

  /**
   * Unsubscribe from an event
   */
  off(eventName: string, listener: (...args: unknown[]) => unknown, options?: object): void;

  /**
   * Dispatch an event
   */
  dispatch(eventName: string, data: object): void;
}

/**
 * PDF page view for rendering individual pages
 */
export interface PDFPageView {
  /**
   * Set the PDF page to render
   */
  setPdfPage(page: PDFPageProxy): void;

  /**
   * Draw the page
   */
  draw(): Promise<void>;

  /**
   * Destroy the page view and clean up resources
   */
  destroy(): void;
}

/**
 * PDF.js library interface containing the core API
 */
export interface PDFJSLibrary {
  /**
   * Load a PDF document from various sources
   */
  getDocument: (src: string | ArrayBuffer | Uint8Array) => PDFDocumentLoadingTask;

  /**
   * Global worker configuration options
   */
  GlobalWorkerOptions: {
    workerSrc: string | undefined;
  };

  /**
   * PDF.js library version
   */
  version: string;
}

/**
 * PDF document loading task returned by getDocument
 */
export interface PDFDocumentLoadingTask {
  /**
   * Promise that resolves to the PDF document proxy
   */
  promise: Promise<PDFDocumentProxy>;
}

/**
 * PDF.js viewer library interface containing UI components
 */
export interface PDFJSViewer {
  /**
   * Event bus constructor for coordinating viewer events
   */
  EventBus: new () => EventBus;

  /**
   * PDF page view constructor for rendering individual pages
   */
  PDFPageView: new (options: PDFPageViewOptions) => PDFPageView;
}

/**
 * Options for creating a PDFPageView instance
 */
export interface PDFPageViewOptions {
  /**
   * Container element for the page view
   */
  container: HTMLElement;

  /**
   * Page number (1-based index)
   */
  id: number;

  /**
   * Scale factor for rendering the page
   */
  scale: number;

  /**
   * Default viewport for the page
   */
  defaultViewport: PageViewport;

  /**
   * Event bus for coordinating viewer events
   */
  eventBus: EventBus;

  /**
   * Text layer rendering mode (0 = disabled, 1 = enabled)
   */
  textLayerMode?: 0 | 1;
}

/**
 * Page viewport containing dimensions and transformation matrix
 */
export interface PageViewport {
  /**
   * Page width in CSS pixels
   */
  width: number;

  /**
   * Page height in CSS pixels
   */
  height: number;
}

/**
 * General PDF configuration options
 */
export interface PDFConfig {
  /**
   * Adapter type to use for PDF rendering
   */
  adapter: AdapterType;

  /**
   * PDF.js library instance (optional)
   */
  pdfLib?: PDFJSLibrary;

  /**
   * PDF.js viewer library instance (optional)
   */
  pdfViewer?: PDFJSViewer;

  /**
   * Custom worker source URL (optional)
   */
  workerSrc?: string;

  /**
   * Whether to set the worker source automatically (optional)
   */
  setWorker?: boolean;

  /**
   * Text layer rendering mode (0 = disabled, 1 = enabled)
   */
  textLayerMode?: 0 | 1;
}

/**
 * Configuration options specific to PDF.js adapter
 */
export interface PDFJSConfig {
  /**
   * PDF.js library instance
   */
  pdfLib: PDFJSLibrary;

  /**
   * PDF.js viewer library instance
   */
  pdfViewer: PDFJSViewer;

  /**
   * Custom worker source URL (optional)
   */
  workerSrc?: string;

  /**
   * Text layer rendering mode (0 = disabled, 1 = enabled)
   */
  textLayerMode?: 0 | 1;

  /**
   * Whether to set the worker source automatically (optional)
   */
  setWorker?: boolean;
}

/**
 * Options for rendering PDF pages
 */
export interface RenderPagesOptions {
  /**
   * Unique identifier for the document
   */
  documentId: string;

  /**
   * PDF document proxy from PDF.js
   */
  pdfDocument: PDFDocumentProxy;

  /**
   * Container element for rendered pages
   */
  viewerContainer: HTMLElement;

  /**
   * Event emission callback function (optional)
   */
  emit?: (event: string, ...args: unknown[]) => void;
}

/**
 * Page dimensions in CSS pixels
 */
export interface PageSize {
  /**
   * Page width in CSS pixels
   */
  width: number;

  /**
   * Page height in CSS pixels
   */
  height: number;
}

/**
 * Extended DOMRect with original page dimensions
 */
export interface ExtendedDOMRect extends DOMRect {
  /**
   * Original page width before scaling
   */
  originalWidth: number;

  /**
   * Original page height before scaling
   */
  originalHeight: number;
}

/**
 * Abstract base class for PDF adapters
 *
 * Provides a common interface for different PDF rendering libraries.
 * Concrete implementations must extend this class and implement
 * the required functionality.
 *
 * @abstract
 */
abstract class PDFAdapter {
  /**
   * Creates an instance of PDFAdapter
   *
   * @throws {Error} If attempting to instantiate the abstract class directly
   */
  constructor() {
    const proto = Object.getPrototypeOf(this);
    if (proto.constructor === PDFAdapter) {
      throw new Error('Abstract class should not be instanciated');
    }
  }
}

/**
 * PDF.js implementation of the PDF adapter
 *
 * Provides PDF rendering capabilities using Mozilla's PDF.js library.
 * Handles document loading, page rendering, and cleanup operations.
 *
 * @extends PDFAdapter
 */
export class PDFJSAdapter extends PDFAdapter {
  /**
   * PDF.js library instance
   */
  private pdfLib: PDFJSLibrary;

  /**
   * PDF.js viewer library instance
   */
  private pdfViewer: PDFJSViewer;

  /**
   * Worker source URL for PDF.js
   */
  private workerSrc: string | undefined;

  /**
   * Text layer rendering mode (0 = disabled, 1 = enabled)
   */
  private textLayerMode: 0 | 1;

  /**
   * Array of PDF page views for rendered pages
   */
  private pdfPageViews: PDFPageView[];

  /**
   * Creates a new PDF.js adapter instance
   *
   * Initializes the adapter with the provided PDF.js libraries and configuration.
   * If setWorker is true, automatically configures the worker source either from
   * the provided workerSrc or falls back to CDN version.
   *
   * @param config - Configuration options for the adapter
   */
  constructor(config: PDFJSConfig) {
    super();
    this.pdfLib = config.pdfLib;
    this.pdfViewer = config.pdfViewer;
    this.workerSrc = config.workerSrc;
    this.textLayerMode = config.textLayerMode ?? 0;
    if (config.setWorker) {
      if (this.workerSrc) {
        this.pdfLib.GlobalWorkerOptions.workerSrc = config.workerSrc;
      } else {
        // Fallback to CDN version.
        this.pdfLib.GlobalWorkerOptions.workerSrc = getWorkerSrcFromCDN(this.pdfLib.version);
      }
    }
    this.pdfPageViews = [];
  }

  /**
   * Load a PDF document from various sources
   *
   * Accepts a file as a string URL, ArrayBuffer, or Uint8Array and returns
   * a promise that resolves to a PDFDocumentProxy for rendering.
   *
   * @param file - PDF source (URL string, ArrayBuffer, or Uint8Array)
   * @returns Promise resolving to the loaded PDF document
   *
   * @example
   * const doc = await adapter.getDocument('/path/to/file.pdf');
   * const doc = await adapter.getDocument(arrayBuffer);
   */
  async getDocument(file: string | ArrayBuffer | Uint8Array): Promise<PDFDocumentProxy> {
    const loadingTask = this.pdfLib.getDocument(file);
    const document = await loadingTask.promise;
    return document;
  }

  /**
   * Render all pages of a PDF document into a container
   *
   * Creates page view elements for each page in the document, renders them
   * using PDF.js, and appends them to the provided container. Emits events
   * for page loading progress and completion.
   *
   * @param options - Rendering configuration options
   * @returns Promise that resolves when all pages are rendered
   *
   * @throws Will log errors to console if rendering fails
   *
   * @example
   * await adapter.renderPages({
   *   documentId: 'doc-123',
   *   pdfDocument: pdfDoc,
   *   viewerContainer: containerElement,
   *   emit: (event, ...args) => console.log(event, args)
   * });
   */
  async renderPages({
    documentId,
    pdfDocument,
    viewerContainer,
    emit = () => {
      /* noop */
    },
  }: RenderPagesOptions): Promise<void> {
    try {
      this.pdfPageViews = [];

      const numPages = pdfDocument.numPages;
      const firstPage = 1;

      const pdfjsPages = await getPdfjsPages(pdfDocument, firstPage, numPages);
      const pageContainers: HTMLDivElement[] = [];

      for (const [index, page] of pdfjsPages.entries()) {
        const container = document.createElement('div');
        container.classList.add('pdf-page');
        container.dataset.pageNumber = (index + 1).toString();
        container.id = `${documentId}-page-${index + 1}`;

        pageContainers.push(container);

        const { width, height } = this.getOriginalPageSize(page);
        const scale = 1;

        const eventBus = new this.pdfViewer.EventBus();
        const pdfPageView = new this.pdfViewer.PDFPageView({
          container,
          id: index + 1,
          scale,
          defaultViewport: page.getViewport({ scale }),
          eventBus,
          textLayerMode: this.textLayerMode,
        });
        this.pdfPageViews.push(pdfPageView);

        const containerBounds = container.getBoundingClientRect() as ExtendedDOMRect;
        // Adding custom properties to DOMRect for internal use
        containerBounds.originalWidth = width;
        containerBounds.originalHeight = height;

        pdfPageView.setPdfPage(page);
        await pdfPageView.draw();

        emit('page-loaded', documentId, index, containerBounds);
      }

      viewerContainer.append(...pageContainers);

      emit('ready', documentId, viewerContainer);
    } catch (err) {
      console.error('Error loading PDF:', err);
    }
  }

  /**
   * Get the original dimensions of a PDF page
   *
   * Calculates the page size at scale 1.0 (100%) to determine the
   * original, unscaled dimensions of the page.
   *
   * @param page - PDF page proxy from PDF.js
   * @returns Page dimensions in CSS pixels
   *
   * @example
   * const size = adapter.getOriginalPageSize(pdfPage);
   * console.log(`Page is ${size.width}x${size.height} pixels`);
   */
  getOriginalPageSize(page: PDFPageProxy): PageSize {
    const viewport = page.getViewport({ scale: 1 });
    const width = viewport.width;
    const height = viewport.height;
    return { width, height };
  }

  /**
   * Clean up and destroy all rendered page views
   *
   * Releases resources associated with each page view and clears
   * the internal array. Should be called when the viewer is no
   * longer needed to prevent memory leaks.
   *
   * @example
   * adapter.destroy(); // Clean up before removing viewer
   */
  destroy(): void {
    this.pdfPageViews.forEach((view) => view.destroy());
    this.pdfPageViews = [];
  }
}

/**
 * Factory class for creating PDF adapter instances
 *
 * Provides a centralized way to instantiate different PDF adapter
 * implementations based on configuration.
 */
export class PDFAdapterFactory {
  /**
   * Create a PDF adapter instance based on configuration
   *
   * Currently supports only the 'pdfjs' adapter type. Additional
   * adapter types can be added in the future.
   *
   * @param config - Configuration including adapter type and library instances
   * @returns Configured PDF adapter instance
   * @throws {Error} If an unsupported adapter type is specified
   *
   * @example
   * const adapter = PDFAdapterFactory.create({
   *   adapter: 'pdfjs',
   *   pdfLib: pdfjsLib,
   *   pdfViewer: pdfjsViewer,
   *   setWorker: true
   * });
   */
  static create(config: PDFJSConfig & { adapter: AdapterType }): PDFAdapter {
    const adapters: Record<AdapterType | 'default', () => PDFAdapter> = {
      pdfjs: () => {
        return new PDFJSAdapter(config);
      },
      default: () => {
        throw new Error('Unsupported adapter');
      },
    };
    const adapter = adapters[config.adapter] ?? adapters.default;
    return adapter();
  }
}

/**
 * Create a PDF configuration object with defaults
 *
 * Merges provided configuration with default values to ensure
 * all required properties are present.
 *
 * @param config - Partial configuration options (optional)
 * @returns Complete PDF configuration with defaults applied
 *
 * @example
 * const config = createPDFConfig({
 *   pdfLib: pdfjsLib,
 *   pdfViewer: pdfjsViewer
 * });
 */
export const createPDFConfig = (config?: Partial<PDFConfig>): PDFConfig => {
  const defaultConfig: PDFConfig = {
    adapter: 'pdfjs',
  };

  return {
    ...defaultConfig,
    ...config,
  };
};

/**
 * Retrieve multiple pages from a PDF document
 *
 * Fetches a range of pages from a PDF document in parallel using
 * Promise.all for optimal performance.
 *
 * @param pdf - PDF document proxy from PDF.js
 * @param firstPage - First page number to retrieve (1-based index)
 * @param lastPage - Last page number to retrieve (inclusive, 1-based index)
 * @returns Promise resolving to array of PDF page proxies
 *
 * @example
 * const pages = await getPdfjsPages(pdfDoc, 1, 5);
 * // Returns pages 1, 2, 3, 4, 5
 */
export async function getPdfjsPages(
  pdf: PDFDocumentProxy,
  firstPage: number,
  lastPage: number,
): Promise<PDFPageProxy[]> {
  const pagesPromises = range(firstPage, lastPage + 1).map((num) => pdf.getPage(num));
  return await Promise.all(pagesPromises);
}

/**
 * Generate CDN URL for PDF.js worker script
 *
 * Constructs a CDN URL for the PDF.js worker based on the library
 * version. Used as a fallback when no custom worker source is provided.
 *
 * @param version - PDF.js version number (e.g., "2.16.105")
 * @returns CDN URL string for the worker script
 *
 * @example
 * const workerUrl = getWorkerSrcFromCDN('2.16.105');
 * // Returns: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.mjs'
 */
export function getWorkerSrcFromCDN(version: string): string {
  return `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
}
