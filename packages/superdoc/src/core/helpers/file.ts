import { DOCX, PDF, HTML } from '@superdoc/common';

/**
 * Wrapper object used by various UI file uploader libraries
 * These libraries often wrap the native File object with additional metadata
 */
export interface UploadWrapper {
  /** Underlying file reference used by some uploaders */
  originFileObj?: File | Blob;
  /** Underlying file reference used by some uploaders */
  file?: File | Blob;
  /** Underlying file reference used by some uploaders */
  raw?: File | Blob;
  /** Optional unique id from uploaders (ignored) */
  uid?: string | number;
  /** Display name (not always reliable for the native file) */
  name?: string;
}

/**
 * Represents a document entry that can be loaded into SuperDoc
 * Supports both file-based and URL-based document sources
 */
export interface DocumentEntry {
  /** Mime type or shorthand ('docx' | 'pdf' | 'html') */
  type?: string;
  /** Filename to display */
  name?: string;
  /** File-like data; normalized to File when available, otherwise Blob */
  data?: File | Blob | UploadWrapper;
  /** Remote URL to fetch; left as-is for URL flows */
  url?: string;
  /** Indicates if this is a newly uploaded file */
  isNewFile?: boolean;
}

/**
 * Extract a native File from various wrapper shapes used by UI uploader libraries.
 * Safely handles common wrapper keys or plain Blob/File inputs.
 *
 * @param input - File-like object or an uploader wrapper
 * @returns Extracted native File/Blob or null if not resolvable
 */
export const extractBrowserFile = (input: File | Blob | UploadWrapper | unknown): File | Blob | null => {
  if (!input) return null;

  // Already a File
  if (typeof File === 'function' && input instanceof File) return input;

  // Blob without name → wrap as File with a default name
  if (typeof Blob === 'function' && input instanceof Blob) {
    const hasFileCtor = typeof File === 'function';
    if (hasFileCtor) {
      const name = (input as File).name || 'document';
      return new File([input], name, { type: input.type });
    }
    // In Node.js without File constructor, return the Blob as-is
    return input;
  }

  // Handle wrapper objects
  const wrapper = input as UploadWrapper;

  // Common: real file often lives in `originFileObj`
  if (wrapper.originFileObj) return extractBrowserFile(wrapper.originFileObj);

  // Other libraries sometimes use `file` or `raw`
  if (wrapper.file) return extractBrowserFile(wrapper.file);
  if (wrapper.raw) return extractBrowserFile(wrapper.raw);

  return null;
};

/**
 * Infer a mime type from filename when missing
 *
 * @param name - The filename to infer type from
 * @returns The inferred MIME type or empty string if unknown
 */
const inferTypeFromName = (name?: string): string => {
  const lower = String(name ?? '').toLowerCase();
  if (lower.endsWith('.docx')) return DOCX;
  if (lower.endsWith('.pdf')) return PDF;
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return HTML;
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  return '';
};

/**
 * Normalize any supported document input into SuperDoc's expected shape.
 * Accepts File/Blob/uploader wrappers directly, or a config-like object with a `data` field.
 * URL-based entries are returned unchanged for downstream handling.
 *
 * @param entry - Document entry to normalize
 * @returns Normalized document entry or the original value when unchanged
 */
export const normalizeDocumentEntry = (
  entry: File | Blob | UploadWrapper | DocumentEntry | unknown,
): DocumentEntry | unknown => {
  // Direct file-like input (e.g., uploader wrapper or File)
  const maybeFile = extractBrowserFile(entry);
  if (maybeFile) {
    const name: string =
      (maybeFile as File).name ||
      (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as { name?: string }).name === 'string'
        ? (entry as { name: string }).name
        : null) ||
      'document';
    const type = maybeFile.type || inferTypeFromName(name) || DOCX;
    return {
      type,
      data: maybeFile,
      name,
      isNewFile: true,
    };
  }

  // Config object with a `data` property that could be file-like
  if (entry && typeof entry === 'object' && 'data' in entry) {
    const docEntry = entry as DocumentEntry;
    const file = extractBrowserFile(docEntry.data);
    if (file) {
      const type = docEntry.type || file.type || inferTypeFromName((file as File).name) || DOCX;
      return {
        ...docEntry,
        type,
        data: file,
        name: docEntry.name || (file as File).name || 'document',
      };
    }
  }

  // Unchanged (e.g., URL-based configs handled later)
  return entry;
};
