/**
 * Node SDK type definitions
 */

/**
 * A ProseMirror node structure
 */
export interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

/**
 * Document structure as JSON (ProseMirror format)
 */
export interface DocumentJSON {
  type: 'doc';
  content: ProseMirrorNode[];
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  created?: string;
  modified?: string;
  [key: string]: unknown;
}

/**
 * Content that can be inserted into a document
 */
export type InsertableContent = string | ProseMirrorNode | ProseMirrorNode[];

export interface SDKConfig {
  /**
   * Number of browser contexts to keep in the pool
   * Default: 2
   */
  poolSize?: number;

  /**
   * Path to Chromium executable (optional)
   * If not provided, uses downloaded Chromium
   */
  chromiumPath?: string;

  /**
   * Maximum time to wait for operations (ms)
   * Default: 30000
   */
  timeout?: number;
}

/**
 * Editor lifecycle states
 */
export type EditorLifecycle = 'idle' | 'opening' | 'ready' | 'closing' | 'destroyed';

/**
 * Editor handle returned by getEditor()
 */
export interface Editor {
  /**
   * Get document as JSON (ProseMirror format)
   */
  getJSON(): Promise<DocumentJSON>;

  /**
   * Get document as HTML string
   */
  getHTML(): Promise<string>;

  /**
   * Get document as Markdown string
   */
  getMarkdown(): Promise<string>;

  /**
   * Export document as DOCX buffer
   */
  exportDocx(): Promise<Buffer>;

  /**
   * Get document metadata
   */
  getMetadata(): Promise<DocumentMetadata>;

  /**
   * Insert content into the document
   */
  insertContent(content: InsertableContent): Promise<void>;

  /**
   * Close the current document without destroying the editor.
   * Editor returns to 'idle' state and can open a new document.
   */
  close(): Promise<void>;

  /**
   * Open a new document in this editor instance.
   * If a document is already open, it will be closed first.
   */
  open(docxBuffer: Buffer): Promise<void>;

  /**
   * Get the current lifecycle state of the editor
   */
  getLifecycle(): Promise<EditorLifecycle>;

  /**
   * Destroy the editor and release resources
   */
  destroy(): Promise<void>;
}

/**
 * SDK client interface
 */
export interface ISuperdocSDK {
  /**
   * Initialize the SDK and start the runtime
   */
  init(): Promise<void>;

  /**
   * Get an editor handle for a DOCX buffer
   */
  getEditor(docxBuffer: Buffer): Promise<Editor>;

  /**
   * Get SDK statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
  };

  /**
   * Close the SDK and cleanup resources
   */
  close(): Promise<void>;
}
