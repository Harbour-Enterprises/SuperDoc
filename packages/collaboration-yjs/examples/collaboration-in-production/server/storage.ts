import { loadFromPostgres, saveToPostgres } from './postgres.js';
import { loadFromTiptapCloud, saveToTiptapCloud } from './tiptap.js';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';

// Dynamic storage selection based on STORAGE_TYPE env var
const storageType = process.env.STORAGE_TYPE || 'postgres';

let loadDocument: (documentId: string) => Promise<Uint8Array | null>;
let saveDocument: (params: CollaborationParams) => Promise<Boolean>;

if (storageType === 'tiptap') {
  loadDocument = loadFromTiptapCloud;
  saveDocument = saveToTiptapCloud;
} else { // default to postgres
  loadDocument = loadFromPostgres;
  saveDocument = saveToPostgres;
}

export { loadDocument, saveDocument };