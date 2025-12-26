import type { StorageFunction } from './storage-types.js';

// In-memory storage for demonstration
// In production, replace with your database (PostgreSQL, Redis, etc.)
const documents = new Map<string, Uint8Array>();

export const loadDocument: StorageFunction = async (id: string) => {
  const state = documents.get(id);

  // Return null if document doesn't exist yet
  // This signals to the client that it should initialize with isNewFile: true
  if (!state) {
    console.log(`[storage] Document "${id}" not found - returning null for first-time initialization`);
    return null;
  }

  console.log(`[storage] Document "${id}" loaded (${state.byteLength} bytes)`);
  return state;
};

export const saveDocument: StorageFunction = async (id: string, state?: Uint8Array) => {
  if (!state) return false;

  documents.set(id, state);
  console.log(`[storage] Document "${id}" saved (${state.byteLength} bytes)`);
  return true;
};