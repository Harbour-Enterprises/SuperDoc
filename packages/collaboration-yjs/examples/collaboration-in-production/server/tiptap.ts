import type { StorageFunction } from './storage-types.js';

const baseUrl = `https://${process.env.TIPTAP_APP_ID}.collab.tiptap.cloud/api/documents`;
const existingDocuments = new Set<string>();

export const loadFromTiptapCloud: StorageFunction = async (id: string) => {
  const response = await fetch(`${baseUrl}/${id}`, {
    headers: { 'Authorization': process.env.TIPTAP_API_SECRET! }
  });

  if (!response.ok) return null;

  // Mark document as existing since we successfully loaded it
  existingDocuments.add(id);
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

export const saveToTiptapCloud: StorageFunction = async (id: string, file?: Uint8Array) => {
  if (!file) return false;
  
  console.log('>>> Saving to tiptap')
  console.log('>>> Auth header:', process.env.TIPTAP_API_SECRET ? 'Set' : 'Missing');
  console.log('>>> URL:', `${baseUrl}/${id}`);
  
  // Use PATCH if we know the document exists, otherwise try POST first
  const method = existingDocuments.has(id) ? 'PATCH' : 'POST';
  console.log(`>>> Using ${method} method`);
  
  const response = await fetch(`${baseUrl}/${id}`, {
    method,
    headers: { 
      'Authorization': process.env.TIPTAP_API_SECRET!
    },
    body: file as BodyInit
  });
  
  // If POST succeeded, mark document as existing
  if (method === 'POST' && response.ok) {
    existingDocuments.add(id);
  }
  
  console.log(">>> save response status:", response.status);
  if (!response.ok) {
    console.log(">>> save response text:", await response.text());
  }
  
  return response.ok;
};