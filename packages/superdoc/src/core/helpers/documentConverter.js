/* global FormData, AbortController, AbortSignal */
import { DOC, DOCX } from '@superdoc/common';

/**
 * @typedef {Object} ConversionConfig
 * @property {string} [serverUrl] - URL of the conversion server (e.g., 'http://localhost:3001')
 * @property {boolean} [enabled] - Whether conversion is enabled (default: true if serverUrl is provided)
 * @property {number} [timeout] - Request timeout in milliseconds (default: 60000)
 */

/**
 * @typedef {Object} ConversionResult
 * @property {boolean} success - Whether the conversion succeeded
 * @property {File} [file] - The converted .docx file
 * @property {Error} [error] - Error if conversion failed
 */

/**
 * Check if a file is a legacy .doc file that needs conversion
 * @param {File|Blob} file - The file to check
 * @returns {boolean}
 */
export const isDocFile = (file) => {
  if (!file) return false;

  // Check by MIME type
  if (file.type === DOC || file.type === 'application/msword') {
    return true;
  }

  // Check by extension (fallback for files without proper MIME type)
  const name = file.name || '';
  return name.toLowerCase().endsWith('.doc') && !name.toLowerCase().endsWith('.docx');
};

/**
 * Check if a filename indicates a .doc file
 * @param {string} filename - The filename to check
 * @returns {boolean}
 */
export const isDocFilename = (filename) => {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return lower.endsWith('.doc') && !lower.endsWith('.docx');
};

/**
 * Convert a .doc file to .docx using the conversion server
 * @param {File|Blob} file - The .doc file to convert
 * @param {ConversionConfig} config - Conversion configuration
 * @returns {Promise<ConversionResult>}
 */
export const convertDocToDocx = async (file, config) => {
  const { serverUrl, timeout = 60000 } = config || {};

  if (!serverUrl) {
    return {
      success: false,
      error: new Error('Conversion server URL not configured. Set modules.conversion.serverUrl in SuperDoc config.'),
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${serverUrl}/convert`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Conversion failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const originalName = file.name || 'document.doc';
    const newName = originalName.replace(/\.doc$/i, '.docx');

    const convertedFile = new File([blob], newName, { type: DOCX });

    return {
      success: true,
      file: convertedFile,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: new Error('Conversion timed out. The file may be too large or the server is unavailable.'),
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * Check if the conversion server is available
 * @param {string} serverUrl - The conversion server URL
 * @returns {Promise<boolean>}
 */
export const isConversionServerAvailable = async (serverUrl) => {
  if (!serverUrl) return false;

  try {
    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get conversion server status including LibreOffice availability
 * @param {string} serverUrl - The conversion server URL
 * @returns {Promise<{available: boolean, libreOfficeInstalled: boolean, message: string}>}
 */
export const getConversionServerStatus = async (serverUrl) => {
  if (!serverUrl) {
    return {
      available: false,
      libreOfficeInstalled: false,
      message: 'No conversion server URL configured',
    };
  }

  try {
    const response = await fetch(`${serverUrl}/check-libreoffice`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();

    return {
      available: true,
      libreOfficeInstalled: response.ok,
      message: data.message || (response.ok ? 'Ready' : 'LibreOffice not installed'),
    };
  } catch {
    return {
      available: false,
      libreOfficeInstalled: false,
      message: 'Conversion server unavailable',
    };
  }
};
