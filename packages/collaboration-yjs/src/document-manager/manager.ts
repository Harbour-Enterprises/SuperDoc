import { applyUpdate } from 'yjs';
import { createLogger } from '../internal-logger/logger.js';
import { SharedSuperDoc } from '../shared-doc/index.js';
import type { CollaborationParams, CollaborationWebSocket, Hooks, ServiceConfig } from '../types/service-types.js';

/**
 * DocumentManager is responsible for managing Yjs documents.
 * It handles document retrieval and debouncing updates.
 */
export class DocumentManager {
  #documents = new Map<string, SharedSuperDoc>();
  #hooks: Hooks | undefined;
  #timers = new Map<string, NodeJS.Timeout>();
  #log = createLogger('DocumentManager');
  #cleanupTimers = new Map<string, NodeJS.Timeout>();
  #cacheDocumentsMs = 1000 * 60;
  debounceMs = 5000;

  constructor(config: ServiceConfig) {
    this.#hooks = config.hooks;
    this.debounceMs = config.debounce ?? this.debounceMs;
    this.#cacheDocumentsMs = config.documentExpiryMs ?? this.#cacheDocumentsMs;
  }

  get(documentId: string): SharedSuperDoc | null {
    if (this.#documents.has(documentId)) {
      return this.#documents.get(documentId) ?? null;
    }
    return null;
  }

  async getDocument(documentId: string, userParams: CollaborationParams): Promise<SharedSuperDoc> {
    if (!this.#documents.has(documentId)) {
      const doc = new SharedSuperDoc(documentId);
      this.#log(`Tracking new document: ${documentId}`);
      this.#documents.set(documentId, doc);

      if (this.#hooks?.load) {
        const buffer = await this.#hooks.load(userParams);
        if (buffer) applyUpdate(doc, buffer);
      }

      this.#setupAutoSave(doc, userParams);
    }

    clearTimeout(this.#cleanupTimers.get(documentId)); // Clear any pending deletions
    const doc = this.#documents.get(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found after initialization`);
    }
    return doc;
  }

  #setupAutoSave(doc: SharedSuperDoc, userParams: CollaborationParams) {
    if (this.debounceMs > 0 && this.#hooks?.autoSave) {
      doc.on('update', () => this.#scheduleSave(doc, userParams));
    } else if (this.debounceMs === 0 && this.#hooks?.autoSave) {
      this.#scheduleSave(doc, userParams);
    }
  }

  #scheduleSave(doc: SharedSuperDoc, userParams: CollaborationParams) {
    const documentId = doc.name;
    if (this.debounceMs > 0) {
      clearTimeout(this.#timers.get(documentId));

      this.#timers.set(
        documentId,
        setTimeout(() => {
          this.#hooks?.autoSave?.(userParams);
        }, this.debounceMs)
      );
    } else {
      this.#hooks?.autoSave?.(userParams);
    }
  }

  releaseConnection(documentId: string, socket: CollaborationWebSocket) {
    const doc = this.#documents.get(documentId);
    if (!doc) return;

    doc.conns.delete(socket);

    // If nobody else is connected, schedule a cleanup
    if (doc.conns.size === 0) {
      this.#scheduleDocCleanup(documentId);
    }
  }

  #scheduleDocCleanup(documentId: string) {
    // clear any existing timer
    clearTimeout(this.#cleanupTimers?.get(documentId));

    // after X ms (or immediately) remove the doc
    const timeout = setTimeout(() => {
      const doc = this.#documents.get(documentId);
      if (doc && doc.conns.size === 0) {
        this.#log(`🗑️  Cleaning up document "${documentId}" from memory.`);
        this.#documents.delete(documentId);
        this.#cleanupTimers.delete(documentId);
      }
    }, this.#cacheDocumentsMs);

    this.#cleanupTimers.set(documentId, timeout);
  }

  has(documentId: string): boolean {
    return this.#documents.has(documentId);
  }
}
