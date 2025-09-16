import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSuperdocStore } from './superdoc-store.js';
import { DOCX, PDF } from '@harbour-enterprises/common';

// Mock getFileObject
vi.mock('@harbour-enterprises/common', () => ({
  getFileObject: vi.fn(),
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  PDF: 'application/pdf',
}));

// Mock File constructor for Node.js environment
global.File = class File extends Blob {
  constructor(fileBits, fileName, options = {}) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = Date.now();
  }
};

global.Blob = class Blob {
  constructor(blobParts = [], options = {}) {
    this.size = 0;
    this.type = options.type || '';
    this.parts = blobParts;

    // Calculate size
    for (const part of blobParts) {
      if (typeof part === 'string') {
        this.size += new TextEncoder().encode(part).length;
      } else if (part instanceof ArrayBuffer) {
        this.size += part.byteLength;
      } else if (part && part.buffer) {
        this.size += part.buffer.byteLength;
      }
    }
  }
};

describe('SuperDoc Store - Blob Support', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSuperdocStore();
  });

  describe('_initializeDocumentData', () => {
    it('should handle File objects', async () => {
      const file = new File(['test content'], 'test.docx', {
        type: DOCX,
      });

      const config = {
        documents: [{ data: file, name: 'test.docx', type: DOCX }],
      };

      await store.init(config);


      // Access the private method through the store's internal methods
      // Since _initializeDocumentData is private, we test through the public init method
      expect(store.documents.length).toBe(1);
    });

    it('should handle Blob objects with name', async () => {
      const blob = new Blob(['test content'], { type: DOCX });

      const config = {
        documents: [{ data: blob, name: 'test.docx', type: DOCX }],
      };

      await store.init(config);

      expect(store.documents.length).toBe(1);
      // The blob should be converted to a File internally
      const document = store.documents[0];
      expect(document.data).toBeInstanceOf(File);
      expect(document.data.name).toBe('test.docx');
    });

    it('should handle Blob objects without name', async () => {
      const blob = new Blob(['test content'], { type: DOCX });

      const config = {
        documents: [{ data: blob, type: DOCX }],
      };

      await store.init(config);

      expect(store.documents.length).toBe(1);
      // The blob should be converted to a File with generated name
      const document = store.documents[0];
      expect(document.data).toBeInstanceOf(File);
      expect(document.data.name).toBe('document.docx');
    });

    it('should generate appropriate file extensions based on type', async () => {
      const testCases = [
        { type: DOCX, expectedName: 'document.docx' },
        { type: PDF, expectedName: 'document.pdf' },
        { type: 'other', expectedName: 'document.bin' },
      ];

      for (const testCase of testCases) {
        const blob = new Blob(['test content'], { type: testCase.type });

        const config = {
          documents: [{ data: blob, type: testCase.type }],
        };

        await store.init(config);

        const document = store.documents[0];
        expect(document.data.name).toBe(testCase.expectedName);

        // Reset for next test
        store.reset();
      }
    });

    it('should preserve blob type during conversion', async () => {
      const blobType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob(['test content'], { type: blobType });

      const config = {
        documents: [{ data: blob, name: 'test.docx', type: DOCX }],
      };

      await store.init(config);

      const document = store.documents[0];
      expect(document.data.type).toBe(blobType);
    });

    it('should use document type if blob type is not available', async () => {
      const blob = new Blob(['test content']); // No type specified

      const config = {
        documents: [{ data: blob, name: 'test.docx', type: DOCX }],
      };

      await store.init(config);

      const document = store.documents[0];
      expect(document.data.type).toBe(DOCX);
    });

    it('should handle mixed File and Blob objects', async () => {
      const file = new File(['file content'], 'file.docx', { type: DOCX });
      const blob = new Blob(['blob content'], { type: DOCX });

      const config = {
        documents: [
          { data: file, name: 'file.docx', type: DOCX },
          { data: blob, name: 'blob.docx', type: DOCX },
        ],
      };

      await store.init(config);

      expect(store.documents.length).toBe(2);

      // First document should remain as File
      expect(store.documents[0].data).toBeInstanceOf(File);
      expect(store.documents[0].data.name).toBe('file.docx');

      // Second document should be converted from Blob to File
      expect(store.documents[1].data).toBeInstanceOf(File);
      expect(store.documents[1].data.name).toBe('blob.docx');
    });

    it('should handle blob instanceof checks correctly', () => {
      const file = new File(['file content'], 'test.docx');
      const blob = new Blob(['blob content']);

      // Test our instanceof logic
      expect(file instanceof File).toBe(true);
      expect(file instanceof Blob).toBe(true);
      expect(blob instanceof File).toBe(false);
      expect(blob instanceof Blob).toBe(true);

      // Test the specific check used in the code: blob instanceof Blob && !(blob instanceof File)
      expect(blob instanceof Blob && !(blob instanceof File)).toBe(true);
      expect(file instanceof Blob && !(file instanceof File)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid document configuration gracefully', async () => {
      const config = {
        documents: [
          {
            /* no data, url, or other valid config */
          },
        ],
      };

      await store.init(config);

      // Should not crash, but document might not be added due to error
      // The exact behavior depends on error handling implementation
      expect(store.documents.length).toBe(0);
    });
  });
});
