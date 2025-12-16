import type { StorageFunction } from './storage-types.js';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';

const blankDocxYdoc = new YDoc();
const metaMap = blankDocxYdoc.getMap('meta');

// Add minimal DOCX structure that the client expects
metaMap.set('docx', []);

export const loadDocument: StorageFunction = async (id: string) => {
  // Return an empty Y.js document with minimal DOCX structure
  return encodeStateAsUpdate(blankDocxYdoc);
};

export const saveDocument: StorageFunction = async (id: string, file?: Uint8Array) => {
  // No-op - just return success
  return true;
};