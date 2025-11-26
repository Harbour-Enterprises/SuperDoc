/**
 * Mapping of file extensions to their corresponding MIME types
 */
const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  zip: 'application/zip',
  html: 'text/html',
  txt: 'text/plain;charset=utf-8',
  json: 'application/json',
};

/**
 * Get the MIME type for a file extension
 *
 * @param extension - The file extension (with or without leading dot)
 * @returns The corresponding MIME type, or 'application/octet-stream' if unknown
 */
const getMimeType = (extension: string): string => {
  if (!extension || typeof extension.toLowerCase !== 'function') return 'application/octet-stream';
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
};

/**
 * Convert various data types into a Blob with the appropriate MIME type
 *
 * @param data - The data to convert (Blob, ArrayBuffer, ArrayBufferView, or string)
 * @param extension - File extension to determine MIME type
 * @returns A Blob with the appropriate MIME type
 * @throws {TypeError} If data is null/undefined or an unsupported type
 */
const ensureBlob = (
  data: Blob | ArrayBuffer | ArrayBufferView | string | null | undefined,
  extension: string,
): Blob => {
  if (data instanceof Blob) return data;

  const mimeType = getMimeType(extension);

  if (data instanceof ArrayBuffer) {
    return new Blob([data], { type: mimeType });
  }

  if (ArrayBuffer.isView(data)) {
    const { buffer, byteOffset, byteLength } = data;
    // Explicitly cast to ArrayBuffer to satisfy TypeScript's BlobPart type requirements
    const slice = buffer.slice(byteOffset, byteOffset + byteLength) as ArrayBuffer;
    return new Blob([slice], { type: mimeType });
  }

  if (typeof data === 'string') {
    return new Blob([data], { type: mimeType });
  }

  if (data == null) {
    throw new TypeError('createDownload requires a Blob, ArrayBuffer, or ArrayBufferView.');
  }

  throw new TypeError(`Cannot create download from value of type ${typeof data}`);
};

/**
 * Create and trigger a browser download for the provided data
 *
 * Creates a Blob from the provided data, generates a temporary download URL,
 * and programmatically triggers a download in the browser. The URL is automatically
 * revoked after the download to free up memory.
 *
 * @param data - The data to download (Blob, ArrayBuffer, ArrayBufferView, or string)
 * @param name - The base filename without extension
 * @param extension - The file extension (determines MIME type and download name)
 * @returns The Blob that was used for the download
 * @throws {TypeError} If data is null/undefined or an unsupported type
 *
 * @example
 * const blob = createDownload(myData, 'report', 'pdf');
 * // Downloads as 'report.pdf'
 */
export const createDownload = (
  data: Blob | ArrayBuffer | ArrayBufferView | string,
  name: string,
  extension: string,
): Blob => {
  const blob = ensureBlob(data, extension);

  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return blob;
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return blob;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.${extension}`;

  // Some browsers require the link to be in the DOM for the click to trigger.
  const shouldAppend = document.body && typeof document.body.appendChild === 'function';
  if (shouldAppend) document.body.appendChild(a);

  a.click();

  if (shouldAppend) document.body.removeChild(a);

  if (typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return blob;
};

/**
 * Remove file extensions from a filename to get the base name
 *
 * Strips common document extensions (.docx, .pdf) from filenames.
 * Other extensions are left as-is.
 *
 * @param currentName - The current filename with extension
 * @returns The filename without the extension
 *
 * @example
 * cleanName('report.docx') // Returns 'report'
 * cleanName('document.pdf') // Returns 'document'
 * cleanName('file.txt') // Returns 'file.txt' (unrecognized extension kept)
 */
export const cleanName = (currentName: string): string => {
  const lowerName = currentName.toLowerCase();
  if (lowerName.endsWith('.docx')) {
    return currentName.slice(0, -5);
  }
  if (lowerName.endsWith('.pdf')) {
    return currentName.slice(0, -4);
  }
  return currentName;
};
