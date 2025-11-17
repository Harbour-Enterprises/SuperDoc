import { loadFromPostgres, saveToPostgres } from './postgres.js';
import { loadFromTiptapCloud, saveToTiptapCloud } from './tiptap.js';

// Dynamic storage selection based on STORAGE_TYPE env var
const storageType = process.env.STORAGE_TYPE || 'postgres';

let loadDocument, saveDocument;

if (storageType === 'tiptap') {
  loadDocument = loadFromTiptapCloud;
  saveDocument = saveToTiptapCloud;
} else { // default to postgres
  loadDocument = loadFromPostgres;
  saveDocument = saveToPostgres;
}

export { loadDocument, saveDocument };