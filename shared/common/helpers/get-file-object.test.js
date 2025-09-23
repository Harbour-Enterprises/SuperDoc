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

  it('fetches the file URL and returns a File with provided name and type', async () => {
    const result = await getFileObject('https://example.com/file.txt', 'file.txt', 'text/plain');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/file.txt');
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('file.txt');
    expect(result.type).toBe('text/plain');
    await expect(result.text()).resolves.toBe('hello world');
  });
});
