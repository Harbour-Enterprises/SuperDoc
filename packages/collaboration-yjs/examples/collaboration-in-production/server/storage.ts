import { loadFromPostgres, saveToPostgres } from './postgres.js';
import { loadFromTiptapCloud, saveToTiptapCloud } from './tiptap.js';
import { loadFromDisk, saveToDisk } from './disk.js';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';
import type { StorageHandler } from './storage-types.js';

// Dynamic storage selection based on STORAGE_TYPE env var
const storageType = process.env.STORAGE_TYPE || 'postgres';



const storageHandlers: Record<string, StorageHandler> = {
  tiptap: {
    save: saveToTiptapCloud,
    load: loadFromTiptapCloud
  },
  postgres: {
    save: saveToPostgres,
    load: loadFromPostgres
  },
  disk: {
    save: saveToDisk,
    load: loadFromDisk
  }
};

const handler = storageHandlers[storageType];
if (!handler) {
  throw new Error(`Unknown storage type: ${storageType}`);
}

const loadDocument = handler.load;
const saveDocument = handler.save;

export { loadDocument, saveDocument };