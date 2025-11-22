import { encodeStateAsUpdate } from 'yjs';
import type { CollaborationParams } from '@superdoc-dev/superdoc-yjs-collaboration';

const baseUrl = `https://${process.env.TIPTAP_APP_ID}.collab.tiptap.cloud/api/documents`;
const existingDocuments = new Set<string>();

export const loadFromTiptapCloud = async (documentId: string): Promise<Uint8Array | null> => {
  const response = await fetch(`${baseUrl}/${documentId}`, {
    headers: { 'Authorization': process.env.TIPTAP_API_SECRET! }
  });

  if (!response.ok) return null;

  // Mark document as existing since we successfully loaded it
  existingDocuments.add(documentId);
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

export const saveToTiptapCloud = async (params: CollaborationParams): Promise<Boolean> => {
  console.log('>>> Saving to tiptap')
  const { documentId, document } = params;
  if (!document) return false;
  
  const state = encodeStateAsUpdate(document);
  
  console.log('>>> Auth header:', process.env.TIPTAP_API_SECRET ? 'Set' : 'Missing');
  console.log('>>> URL:', `${baseUrl}/${documentId}`);
  
  // Use PATCH if we know the document exists, otherwise try POST first
  const method = existingDocuments.has(documentId) ? 'PATCH' : 'POST';
  console.log(`>>> Using ${method} method`);
  
  const response = await fetch(`${baseUrl}/${documentId}`, {
    method,
    headers: { 
      'Authorization': process.env.TIPTAP_API_SECRET!
    },
    body: state as BodyInit
  });
  
  // If POST succeeded, mark document as existing
  if (method === 'POST' && response.ok) {
    existingDocuments.add(documentId);
  }
  
  console.log(">>> save response status:", response.status);
  if (!response.ok) {
    console.log(">>> save response text:", await response.text());
  }
  
  return response.ok;
};