import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { getFileObject } from './get-file-object.js';

const originalFetch = globalThis.fetch;
const originalFile = globalThis.File;

beforeAll(() => {
  if (typeof File === 'undefined') {
    class PolyfilledFile extends Blob {
      constructor(parts, name, options = {}) {
        super(parts, options);
        this.name = name;
        this.lastModified = options.lastModified ?? Date.now();
        this.type = options.type ?? '';
      }
    }

    globalThis.File = PolyfilledFile;
  }
});

afterAll(() => {
  if (originalFile) {
    globalThis.File = originalFile;
  } else {
    delete globalThis.File;
  }
});

describe('getFileObject', () => {
  let mockBlob;

  it('requires Node.js >= 20 for atob, fetch, and File APIs', () => {
    const version = parseInt(process.version.slice(1).split('.')[0], 10);
    expect(version).toBeGreaterThanOrEqual(20);
    expect(typeof globalThis.atob).toBe('function');
    expect(typeof globalThis.fetch).toBe('function');
  });

  beforeEach(() => {
    mockBlob = new Blob(['hello world'], { type: 'text/plain' });

    globalThis.fetch = vi.fn().mockResolvedValue({
      blob: vi.fn().mockResolvedValue(mockBlob),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('fetches regular URLs and returns a File', async () => {
    const result = await getFileObject('https://example.com/file.txt', 'file.txt', 'text/plain');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/file.txt');
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('file.txt');
    expect(result.type).toBe('text/plain');
    await expect(result.text()).resolves.toBe('hello world');
  });

  it('handles data URIs without fetch (CSP-safe)', async () => {
    const payload = 'Hello, World!';
    const base64 = btoa(payload);
    const dataUri = `data:text/plain;base64,${base64}`;

    const result = await getFileObject(dataUri, 'test.txt', 'text/plain');

    // Verify fetch was NOT called (CSP-safe)
    expect(globalThis.fetch).not.toHaveBeenCalled();

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('test.txt');
    expect(result.type).toBe('text/plain');
    await expect(result.text()).resolves.toBe(payload);
  });

  it('handles blank DOCX file import (the SD-720 use case)', async () => {
    // This is the actual scenario that was failing with CSP
    const blankDocxBase64 = 'UEsDBBQABgAIAAAAIQAykW9XZgEAAKUFAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC';
    const dataUri = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${blankDocxBase64}`;

    const result = await getFileObject(
      dataUri,
      'blank.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Critical: fetch should NOT be called (CSP violation prevention)
    expect(globalThis.fetch).not.toHaveBeenCalled();

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('blank.docx');
    expect(result.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(result.size).toBeGreaterThan(0);
  });

  it('handles non-base64 data URIs with fetch (no regression)', async () => {
    // Non-base64 data URIs should still work via fetch
    const dataUri = 'data:text/plain,Hello%20World';

    const result = await getFileObject(dataUri, 'test.txt', 'text/plain');

    // Non-base64 data URIs use fetch (no CSP issue)
    expect(globalThis.fetch).toHaveBeenCalledWith(dataUri);

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('test.txt');
    expect(result.type).toBe('text/plain');
  });
});
