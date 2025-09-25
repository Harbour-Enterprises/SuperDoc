import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { base64ToFile } from './handleBase64.js';

describe('handleBase64', () => {
  beforeAll(() => {
    vi.stubGlobal('atob', (encoded) => Buffer.from(encoded, 'base64').toString('binary'));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('converts base64 data into a File with hashed filename', () => {
    const payload = 'fake-image-payload';
    const base64 = `data:image/png;base64,${Buffer.from(payload).toString('base64')}`;

    const file = base64ToFile(base64);

    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toMatch(/^image-\d+\.png$/);
    expect(file.size).toBe(Buffer.byteLength(payload));
  });
});
