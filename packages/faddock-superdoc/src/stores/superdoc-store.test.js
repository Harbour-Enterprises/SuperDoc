import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSuperdocStore } from './superdoc-store.js';
import { DOCX, PDF } from '@harbour-enterprises/common';

// Mock getFileObject while keeping the rest of the module's exports intact
vi.mock('@harbour-enterprises/common', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFileObject: vi.fn(),
  };
});

// Mock Blob/File constructors for the Node.js environment
class BlobMock {
  constructor(blobParts = [], options = {}) {
    this.parts = blobParts;
    this.type = options.type || '';
    this.size = 0;

    for (const part of blobParts) {
      if (typeof part === 'string') {
        this.size += new TextEncoder().encode(part).length;
      } else if (part instanceof ArrayBuffer) {
        this.size += part.byteLength;
      } else if (ArrayBuffer.isView(part)) {
        this.size += part.byteLength;
      } else if (part?.size) {
        this.size += part.size;
      }
    }
  }
}

globalThis.Blob = BlobMock;

globalThis.File = class FileMock extends BlobMock {
  constructor(fileBits, fileName, options = {}) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options.lastModified ?? Date.now();
  }
};

const createTestConfig = (documents = [], overrides = {}) => {
  const { modules = {}, user = {}, users = [], ...rest } = overrides;

  return {
    documents,
    modules: { collaboration: false, ...modules },
    user,
    users,
    ...rest,
  };
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

      const config = createTestConfig([{ data: file, name: 'test.docx', type: DOCX }]);

      await store.init(config);

      // Access the private method through the store's internal methods
      // Since _initializeDocumentData is private, we test through the public init method
      expect(store.documents.length).toBe(1);
    });

    it('should handle Blob objects with name', async () => {
      const blob = new Blob(['test content'], { type: DOCX });

      const config = createTestConfig([{ data: blob, name: 'test.docx', type: DOCX }]);

      await store.init(config);

      expect(store.documents.length).toBe(1);
      // The blob should be converted to a File internally
      const document = store.documents[0];
      expect(document.data).toBeInstanceOf(File);
      expect(document.data.name).toBe('test.docx');
    });

    it('should handle Blob objects without name', async () => {
      const blob = new Blob(['test content'], { type: DOCX });

      const config = createTestConfig([{ data: blob, type: DOCX }]);

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

        const config = createTestConfig([{ data: blob, type: testCase.type }]);

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

      const config = createTestConfig([{ data: blob, name: 'test.docx', type: DOCX }]);

      await store.init(config);

      const document = store.documents[0];
      expect(document.data.type).toBe(blobType);
    });

    it('should use document type if blob type is not available', async () => {
      const blob = new Blob(['test content']); // No type specified

      const config = createTestConfig([{ data: blob, name: 'test.docx', type: DOCX }]);

      await store.init(config);

      const document = store.documents[0];
      expect(document.data.type).toBe(DOCX);
    });

    it('should handle mixed File and Blob objects', async () => {
      const file = new File(['file content'], 'file.docx', { type: DOCX });
      const blob = new Blob(['blob content'], { type: DOCX });

      const config = createTestConfig([
        { data: file, name: 'file.docx', type: DOCX },
        { data: blob, name: 'blob.docx', type: DOCX },
      ]);

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
    let consoleWarnSpy;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should handle invalid document configuration gracefully', async () => {
      const config = createTestConfig([
        {
          /* no data, url, or other valid config */
        },
      ]);

      await store.init(config);

      // Should not crash, but document might not be added due to error
      // The exact behavior depends on error handling implementation
      expect(store.documents.length).toBe(0);
    });

    it('should notify exception handler when document initialization fails', async () => {
      const handler = vi.fn();
      store.setExceptionHandler(handler);

      const config = createTestConfig([
        {
          /* invalid entry */
        },
      ]);

      await store.init(config);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({ stage: 'document-init' });
      expect(handler.mock.calls[0][0].error).toBeInstanceOf(Error);
    });
  });
});
