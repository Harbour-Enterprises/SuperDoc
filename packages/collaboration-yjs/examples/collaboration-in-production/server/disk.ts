import { promises as fs } from 'fs';
import path from 'path';
import type { StorageFunction } from './storage-types.js';
import { encodeStateAsUpdate, applyUpdate, Doc as YDoc } from 'yjs';
import JSZip from 'jszip';

const DOCX_STORAGE_DIR = path.join(process.cwd(), 'docx-storage');

// Conversion functions for DOCX to/from byte array
export const yjsToDocxBlob = async (yjsByteArray: Uint8Array): Promise<Uint8Array | null> => {
  try {
    // Reconstruct Y.js document from byte array
    const ydoc = new YDoc();
    applyUpdate(ydoc, yjsByteArray);
    
    // Extract DOCX data from Y.js meta map
    const metaMap = ydoc.getMap('meta');
    const docxFiles = metaMap.get('docx');
    const mediaMap = ydoc.getMap('media');
    
    if (!docxFiles || !Array.isArray(docxFiles)) {
      return null;
    }
    
    // Create DOCX blob using JSZip
    const zip = new JSZip();
    
    // Add DOCX files to zip
    docxFiles.forEach((file: { name: string; content: string }) => {
      zip.file(file.name, file.content);
    });
    
    // Add media files if present
    if (mediaMap) {
      mediaMap.forEach((content: any, path: string) => {
        zip.file(path, content);
      });
    }
    
    // Generate DOCX as array buffer
    const arrayBuffer = await zip.generateAsync({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error converting Y.js to DOCX:', error);
    return null;
  }
};

export const docxToYjsBytes = async (docxBytes: Uint8Array): Promise<Uint8Array | null> => {
  try {
    // Load DOCX using JSZip
    const zip = await JSZip.loadAsync(docxBytes);
    
    // Create new Y.js document
    const ydoc = new YDoc();
    const metaMap = ydoc.getMap('meta');
    const mediaMap = ydoc.getMap('media');
    
    // Extract files from DOCX
    const docxFiles: Array<{ name: string; content: string }> = [];
    
    for (const [relativePath, zipFile] of Object.entries(zip.files)) {
      const file = zipFile as any;
      if (!file.dir) {
        const content = await file.async('text');
        
        // Separate media files from document structure files
        if (relativePath.startsWith('word/media/')) {
          const mediaContent = await file.async('uint8array');
          mediaMap.set(relativePath, mediaContent);
        } else {
          docxFiles.push({
            name: relativePath,
            content: content
          });
        }
      }
    }
    
    // Store DOCX structure in meta map
    metaMap.set('docx', docxFiles);
    
    // Encode Y.js document as byte array
    return encodeStateAsUpdate(ydoc);
  } catch (error) {
    console.error('Error converting DOCX to Y.js:', error);
    return null;
  }
};

export const saveToDisk: StorageFunction = async (id: string, file?: Uint8Array) => {
  if (!file) return false;
  
  console.log("Writing docx to disk...");
  try {
    // Ensure storage directory exists
    await fs.mkdir(DOCX_STORAGE_DIR, { recursive: true });
    
    // Save DOCX file to disk
    const filePath = path.join(DOCX_STORAGE_DIR, `${id}.docx`);
    await fs.writeFile(filePath, file);
    
    console.log(`DOCX saved to disk: ${filePath}`);
    return true; // Return success
  } catch (error) {
    console.error('Error saving DOCX to disk:', error);
    return false;
  }
};

export const loadFromDisk: StorageFunction = async (id: string) => {
  try {
    const filePath = path.join(DOCX_STORAGE_DIR, `${id}.docx`);
    const docxBytes = await fs.readFile(filePath);
    return docxBytes;
  } catch (error) {
    console.error('Error loading DOCX from disk:', error);
    return null;
  }
};

