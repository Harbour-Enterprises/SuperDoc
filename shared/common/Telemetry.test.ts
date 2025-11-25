import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { Telemetry } from './Telemetry';

const baseConfig = {
  superdocVersion: 'test-version',
};

describe('Telemetry randomBytes', () => {
  let originalCryptoDescriptor: PropertyDescriptor | undefined;
  let originalMsCrypto: Crypto | undefined;

  beforeAll(() => {
    originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  });

  beforeEach(() => {
    originalMsCrypto = (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto;
  });

  afterEach(() => {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, 'crypto', originalCryptoDescriptor);
    } else {
      // Ensure we don't leave a stubbed crypto behind
      delete (globalThis as typeof globalThis & { crypto?: Crypto }).crypto;
    }
    (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto = originalMsCrypto;
  });

  it('uses crypto.getRandomValues when available', () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.set([0xaa, 0xbb, 0xcc, 0xdd]);
      return array;
    });

    if (!globalThis.crypto) {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        enumerable: true,
        value: { getRandomValues } as Crypto,
      });
    } else {
      vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(getRandomValues);
    }

    const telemetry = new Telemetry(baseConfig);
    const id = telemetry.generateId();

    expect(getRandomValues).toHaveBeenCalled();
    expect(id.split('-')[1]).toBe('aabbccdd');
  });

  it('falls back to Math.random when crypto is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      value: undefined,
    });
    (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto = undefined;

    const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const telemetry = new Telemetry(baseConfig);
    const id = telemetry.generateId();

    expect(mathRandomSpy).toHaveBeenCalled();
    expect(id.split('-')[1]).toHaveLength(8);

    mathRandomSpy.mockRestore();
  });

  it('uses msCrypto.getRandomValues as fallback for older browsers', () => {
    // Remove standard crypto
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      enumerable: true,
      value: undefined,
    });

    // Set up msCrypto (legacy IE11 support)
    const getRandomValues = vi.fn((array: Uint8Array) => {
      array.set([0x11, 0x22, 0x33, 0x44]);
      return array;
    });

    (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto = {
      getRandomValues,
    } as Crypto;

    const telemetry = new Telemetry(baseConfig);
    const id = telemetry.generateId();

    expect(getRandomValues).toHaveBeenCalled();
    expect(id.split('-')[1]).toBe('11223344');
  });
});
