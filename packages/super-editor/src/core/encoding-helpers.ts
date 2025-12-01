/**
 * Quick check for .xml / .rels
 * @param name File name to check
 * @returns True if the name has a .xml or .rels extension
 */
export const isXmlLike = (name: string): boolean => /\.xml$|\.rels$/i.test(name);

/**
 * Hex dump for optional debugging
 * @param bytes Bytes to dump
 * @param n Number of bytes to dump
 * @returns Hex dump
 */
export function hex(bytes: Uint8Array | ArrayBuffer, n: number = 32): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8.slice(0, n))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Try to detect encoding by BOM / null density
 * @param u8 Byte array to check
 * @returns Detected encoding
 */
export function sniffEncoding(u8: Uint8Array): string {
  if (u8.length >= 2) {
    const b0 = u8[0],
      b1 = u8[1];
    if (b0 === 0xff && b1 === 0xfe) return 'utf-16le';
    if (b0 === 0xfe && b1 === 0xff) return 'utf-16be';
  }
  // Heuristic: lots of NULs near the start → likely UTF-16
  let nul = 0;
  for (let i = 0; i < Math.min(64, u8.length); i++) if (u8[i] === 0) nul++;
  if (nul > 16) return 'utf-16le';
  return 'utf-8';
}

/**
 * Remove leading BOM from already-decoded JS string
 * @param str String to strip BOM from
 * @returns Cleaned string without BOM
 */
export function stripBOM(str: string): string {
  return str && str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

/**
 * Decode XML/RELS content to a clean JS string.
 * Accepts: string | Uint8Array | ArrayBuffer
 * @param content Content to decode
 * @returns Clean XML string
 */
export function ensureXmlString(content: string | Uint8Array | ArrayBuffer | Buffer): string {
  if (typeof content === 'string') return stripBOM(content);

  // Accept: Buffer, Uint8Array, DataView, any TypedArray, or ArrayBuffer
  let u8: Uint8Array | null = null;

  if (content && typeof content === 'object') {
    if (content instanceof Uint8Array) {
      u8 = content;
    } else if (content instanceof ArrayBuffer) {
      u8 = new Uint8Array(content);
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(content)) {
      // Node Buffer - using type assertion since Buffer type isn't fully known here
      const bufferContent = content as unknown as { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
      u8 = new Uint8Array(bufferContent.buffer, bufferContent.byteOffset, bufferContent.byteLength);
    } else if (ArrayBuffer.isView && ArrayBuffer.isView(content)) {
      // Any ArrayBufferView: DataView or other TypedArray
      const viewContent = content as ArrayBufferView;
      u8 = new Uint8Array(viewContent.buffer, viewContent.byteOffset, viewContent.byteLength);
    } else {
      // Fallback: check constructor name for ArrayBuffer-like objects
      const anyContent = content as unknown as { constructor?: { name?: string } };
      if (anyContent.constructor && anyContent.constructor.name === 'ArrayBuffer') {
        u8 = new Uint8Array(content as ArrayBuffer);
      }
    }
  }

  if (!u8) throw new Error('Unsupported content type for XML');

  const enc = sniffEncoding(u8);
  const xml = new TextDecoder(enc).decode(u8);
  return stripBOM(xml);
}
