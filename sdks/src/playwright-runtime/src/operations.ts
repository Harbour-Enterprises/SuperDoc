/**
 * Document operations implementation
 * Uses the new Editor.open() / Editor.close() lifecycle API
 */

import type { IDocumentOperations, EditorHandle, EditorSession, IContextPool } from './types.js';
import { RuntimeError, RuntimeErrorCode } from './types.js';

/** Browser window with SuperDoc editor globals */
interface SuperDocWindow {
  getStarterExtensions: () => unknown[];
  Editor: new (config: Record<string, unknown>) => SuperDocEditor;
  [key: string]: unknown;
}

/** SuperDoc editor instance in browser */
interface SuperDocEditor {
  lifecycle: string;
  open: (bytes: Uint8Array) => Promise<void>;
  close: () => void;
  destroy: () => void;
  getJSON: () => Record<string, unknown>;
  getHTML: () => string;
  getMarkdown: () => Promise<string>;
  getMetadata: () => Record<string, unknown>;
  exportDocx: () => Promise<ArrayBuffer>;
  commands: { insertContent: (content: unknown) => void };
}

export class DocumentOperations implements IDocumentOperations {
  private pool: IContextPool;
  private sessions: Map<string, EditorSession> = new Map();
  private nextEditorId = 1;

  constructor(pool: IContextPool) {
    this.pool = pool;
  }

  /**
   * Load a DOCX file and create an editor instance
   * Uses the new editor.open() API for async document loading
   */
  async loadDocx(docxBuffer: Buffer): Promise<EditorHandle> {
    const pooled = await this.pool.acquire();
    const editorId = `editor-${this.nextEditorId++}`;

    try {
      // Convert buffer to base64 for transport
      const docxBase64 = docxBuffer.toString('base64');

      // Create editor in idle state, then open document
      // Note: Browser-evaluated code uses window globals that aren't available at compile time
      const result = await pooled.page.evaluate(
        async ({ base64, editorId }) => {
          try {
            // Convert base64 to Uint8Array
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const win = window as unknown as SuperDocWindow;

            // Get starter extensions
            const extensions = win.getStarterExtensions();

            // Create editor in idle state (no content)
            const editor = new win.Editor({
              element: document.getElementById('editor-container'),
              isHeadless: true,
              mode: 'docx',
              documentId: editorId,
              extensions: extensions,
              // No content - starts in idle state
            });

            // Store editor in window
            win[editorId] = editor;

            // Use the new async open() API to load the document
            await editor.open(bytes);

            return {
              success: true,
              data: { editorId, lifecycle: editor.lifecycle },
            };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return {
              success: false,
              error: error.message,
              stack: error.stack,
            };
          }
        },
        { base64: docxBase64, editorId },
      );

      if (!result.success) {
        throw new RuntimeError(
          RuntimeErrorCode.EDITOR_LOAD_FAILED,
          `Failed to load DOCX: ${result.error}\n${result.stack}`,
        );
      }

      // Store session
      const session: EditorSession = {
        pooled,
        editorId,
        createdAt: Date.now(),
      };
      this.sessions.set(editorId, session);

      // Return editor handle
      return this.createEditorHandle(editorId);
    } catch (error) {
      // Release context on error
      await this.pool.release(pooled);
      throw error;
    }
  }

  /**
   * Create an editor handle for the SDK
   */
  private createEditorHandle(editorId: string): EditorHandle {
    const getSession = () => {
      const session = this.sessions.get(editorId);
      if (!session) {
        throw new RuntimeError(
          RuntimeErrorCode.EDITOR_OPERATION_FAILED,
          'Editor session not found or already destroyed',
        );
      }
      return session;
    };

    return {
      getJSON: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate((id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);
            return { success: true, data: editor.getJSON() };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `getJSON failed: ${result.error}`);
        }

        return result.data;
      },

      getHTML: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate((id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);
            return { success: true, data: editor.getHTML() };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `getHTML failed: ${result.error}`);
        }

        return result.data;
      },

      getMarkdown: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate(async (id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);
            const md = await editor.getMarkdown();
            return { success: true, data: md };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `getMarkdown failed: ${result.error}`);
        }

        return result.data;
      },

      exportDocx: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate(async (id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);

            const docxBuffer = await editor.exportDocx();

            // Convert to base64 for transport
            const uint8Array = new Uint8Array(docxBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);

            return { success: true, data: base64 };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `exportDocx failed: ${result.error}`);
        }

        return Buffer.from(result.data!, 'base64');
      },

      getMetadata: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate((id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);
            return { success: true, data: editor.getMetadata() };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `getMetadata failed: ${result.error}`);
        }

        return result.data;
      },

      insertContent: async (content) => {
        const session = getSession();
        const result = await session.pooled.page.evaluate(
          ({ id, content }) => {
            try {
              const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
              if (!editor) throw new Error('Editor not found');
              if (editor.lifecycle !== 'ready') throw new Error(`Editor not ready (state: ${editor.lifecycle})`);
              editor.commands.insertContent(content);
              return { success: true };
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              return { success: false, error: error.message, stack: error.stack };
            }
          },
          { id: editorId, content },
        );

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `insertContent failed: ${result.error}`);
        }
      },

      /**
       * Close the current document without destroying the editor.
       * Allows opening a new document with open().
       */
      close: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate((id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            editor.close();
            return { success: true, lifecycle: editor.lifecycle };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `close failed: ${result.error}`);
        }
      },

      /**
       * Open a new document in this editor instance.
       * If a document is already open, it will be closed first.
       */
      open: async (docxBuffer: Buffer) => {
        const session = getSession();
        const docxBase64 = docxBuffer.toString('base64');

        const result = await session.pooled.page.evaluate(
          async ({ id, base64 }) => {
            try {
              const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
              if (!editor) throw new Error('Editor not found');

              // Convert base64 to Uint8Array
              const binaryString = atob(base64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Use the async open() API
              await editor.open(bytes);

              return { success: true, lifecycle: editor.lifecycle };
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err));
              return { success: false, error: error.message, stack: error.stack };
            }
          },
          { id: editorId, base64: docxBase64 },
        );

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `open failed: ${result.error}`);
        }
      },

      /**
       * Get the current lifecycle state of the editor
       */
      getLifecycle: async () => {
        const session = getSession();
        const result = await session.pooled.page.evaluate((id) => {
          try {
            const editor = (window as unknown as SuperDocWindow)[id] as SuperDocEditor;
            if (!editor) throw new Error('Editor not found');
            return { success: true, data: editor.lifecycle };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            return { success: false, error: error.message, stack: error.stack };
          }
        }, editorId);

        if (!result.success) {
          throw new RuntimeError(RuntimeErrorCode.EDITOR_OPERATION_FAILED, `getLifecycle failed: ${result.error}`);
        }

        return result.data;
      },

      /**
       * Destroy the editor and release resources
       */
      destroy: async () => {
        const session = this.sessions.get(editorId);
        if (!session) return;

        try {
          // Destroy editor in browser
          await session.pooled.page.evaluate((id) => {
            const win = window as unknown as SuperDocWindow;
            const editor = win[id] as SuperDocEditor | undefined;
            if (editor) {
              editor.destroy();
              delete win[id];
            }
          }, editorId);

          // Release context back to pool
          await this.pool.release(session.pooled);

          // Remove session
          this.sessions.delete(editorId);
        } catch (error) {
          console.error('Error destroying editor:', error);
        }
      },
    };
  }

  /**
   * Get the number of currently active editor sessions
   * @returns Count of active sessions
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Cleanup all sessions
   */
  async cleanup(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(
      sessionIds.map(async (id) => {
        const session = this.sessions.get(id);
        if (session) {
          try {
            await this.pool.release(session.pooled);
          } catch (error) {
            console.error(`Error cleaning up session ${id}:`, error);
          }
        }
      }),
    );
    this.sessions.clear();
  }
}
