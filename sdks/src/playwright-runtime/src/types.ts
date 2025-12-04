/**
 * Runtime type definitions
 */

import type { Browser, BrowserContext, Page } from 'playwright-core';

/**
 * Configuration for the runtime
 */
export interface RuntimeConfig {
  /**
   * Number of browser contexts to keep in the pool
   * Default: 2
   */
  poolSize?: number;

  /**
   * Path to Chromium executable (optional)
   */
  chromiumPath?: string;

  /**
   * Whether to run in headless mode
   * Default: true
   */
  headless?: boolean;

  /**
   * Maximum time to wait for operations (ms)
   * Default: 30000
   */
  timeout?: number;

  /**
   * Port for HTTP server (if running in server mode)
   */
  port?: number;

  /**
   * Path to super-editor dist directory
   */
  editorDistPath?: string;
}

/**
 * A pooled context with its page
 */
export interface PooledContext {
  context: BrowserContext;
  page: Page;
  inUse: boolean;
  createdAt: number;
}

/**
 * Browser manager interface
 */
export interface IBrowserManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  getBrowser(): Browser | null;
}

/**
 * Context pool manager interface
 */
export interface IContextPool {
  acquire(): Promise<PooledContext>;
  release(pooled: PooledContext): Promise<void>;
  clear(): Promise<void>;
  getPoolSize(): number;
}

/**
 * Document operations interface
 */
export interface IDocumentOperations {
  loadDocx(docxBuffer: Buffer): Promise<EditorHandle>;
}

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

/**
 * Editor lifecycle states
 */
export type EditorLifecycle = 'idle' | 'opening' | 'ready' | 'closing' | 'destroyed';

/**
 * Editor handle returned to SDK users
 */
export interface EditorHandle {
  /** Get document as ProseMirror JSON */
  getJSON(): Promise<DocumentJSON>;

  /** Get document as HTML */
  getHTML(): Promise<string>;

  /** Get document as Markdown */
  getMarkdown(): Promise<string>;

  /** Export document as DOCX buffer */
  exportDocx(): Promise<Buffer>;

  /** Get document metadata */
  getMetadata(): Promise<DocumentMetadata>;

  /** Insert content (HTML string or JSON) */
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

  /** Destroy the editor and release all resources */
  destroy(): Promise<void>;
}

/**
 * Internal editor session
 */
export interface EditorSession {
  pooled: PooledContext;
  editorId: string;
  createdAt: number;
}

/**
 * Operation result wrapper
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  stack?: string;
}

/**
 * Runtime error codes
 */
export enum RuntimeErrorCode {
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  CONTEXT_POOL_EXHAUSTED = 'CONTEXT_POOL_EXHAUSTED',
  EDITOR_LOAD_FAILED = 'EDITOR_LOAD_FAILED',
  EDITOR_OPERATION_FAILED = 'EDITOR_OPERATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_DOCX = 'INVALID_DOCX',
}

/**
 * Runtime error class
 */
export class RuntimeError extends Error {
  constructor(
    public code: RuntimeErrorCode,
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'RuntimeError';
  }
}
