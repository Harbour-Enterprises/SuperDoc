import { applyUpdate } from 'yjs';
import { createLogger } from '../internal-logger/logger.js';
import { SharedSuperDoc } from '../shared-doc/index.js';

/**
 * DocumentManager is responsible for managing Yjs documents.
 * It handles document retrieval and debouncing updates.
 */
export class DocumentManager {
  /** @type {Map<string, SharedSuperDoc>} */ 
  #documents = new Map();

  /** @type {import('../types.js').Hooks} */
  #hooks;

  /** @type {Map<string, NodeJS.Timeout>} */
  #timers = new Map();

  /** @type {ReturnType<import('../internal-logger/logger.js').createLogger>} */
  #log = createLogger('DocumentManager');

  /** @type {number} */
  debounceMs;

  /**
   * @param {import('../types.js').config} config
   */
  constructor(config) {
    this.#hooks = config.hooks;
    this.debounceMs = config.debounce ?? 0;
  }

  /**
   * Retrieves a Yjs document by its ID.
   * @param {string} documentId The ID of the document to retrieve.
   * @returns {Promise<SharedSuperDoc>} A promise that resolves to the Yjs document.
   */
  async getDocument(documentId, userParams) {
    if (!this.#documents.has(documentId)) {
      const doc = new SharedSuperDoc(documentId);
      this.#log(`Creating new document: ${documentId}`);
      this.#documents.set(documentId, doc);

      if (this.#hooks.load) {
        const buffer = await this.#hooks.load(userParams);
        if (buffer) applyUpdate(doc, buffer);
      }

      this.#setupAutoSave(doc, userParams);
    }

    return this.#documents.get(documentId);
  }

  /**
   * @param {SharedSuperDoc} doc - The SharedSuperDoc instance.
   */
  #setupAutoSave(doc, userParams) {
    if (this.debounceMs > 0 && this.#hooks.autoSave) {
      doc.on('update', () => this.#scheduleSave(doc, userParams));
    } else if (this.debounceMs === 0 && this.#hooks.autoSave) {
      this.#scheduleSave(doc, userParams);
    }
  }

  /**
   * @param {SharedSuperDoc} doc - The SharedSuperDoc instance.
   */
  #scheduleSave(doc, userParams) {
    const documentId = doc.name;
    if (this.debounceMs > 0) {
      clearTimeout(this.#timers.get(documentId));

      this.#timers.set(
        documentId,
        setTimeout(() => {
          this.#hooks.autoSave(userParams);
        }, this.debounceMs),
      );
    } else {
      this.#hooks.autoSave(userParams);
    }
  }

}
