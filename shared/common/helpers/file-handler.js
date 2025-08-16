import { getFileObject } from './get-file-object.js';

/**
 * File handler utilities for SuperDoc and SuperEditor
 * Provides unified file processing for both text and binary files
 */
export class FileHandler {
  /**
   * Process uploaded file based on type
   * @param {File} file - The uploaded file
   * @returns {Promise<Object>} Processed file object
   */
  static async processFile(file) {
    const extension = this.getFileExtension(file);
    const isTextFile = this.isTextFormat(extension);

    if (isTextFile) {
      const content = await this.readAsText(file);
      return {
        name: file.name,
        type: file.type,
        extension,
        content,
        contentType: extension,
        // For backward compatibility with existing code
        [`${extension}Content`]: content,
      };
    }

    // Binary file (DOCX, PDF)
    const url = URL.createObjectURL(file);
    return await getFileObject(url, file.name, file.type);
  }

  /**
   * Get file extension from filename
   * @param {File} file - The file object
   * @returns {string} File extension in lowercase
   * @private
   */
  static getFileExtension(file) {
    return file.name.split('.').pop()?.toLowerCase();
  }

  /**
   * Check if file is text-based format
   * @param {string} extension - File extension
   * @returns {boolean} True if text format
   * @private
   */
  static isTextFormat(extension) {
    return ['md', 'html', 'htm', 'txt'].includes(extension);
  }

  /**
   * Read file as text content
   * @param {File} file - The file to read
   * @returns {Promise<string>} The file content as text
   * @private
   */
  static readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Build document config for SuperDoc/SuperEditor
   * @param {Object} fileData - Processed file data
   * @param {Object} options - Configuration options
   * @param {string} options.id - Document ID
   * @param {boolean} options.isNewFile - Whether this is a new file
   * @returns {Object} Document configuration
   */
  static buildDocumentConfig(fileData, options = {}) {
    const config = {
      id: options.id || `doc-${Date.now()}`,
      isNewFile: options.isNewFile !== false,
    };

    // Add content based on type
    if (fileData.contentType === 'md') {
      config.markdown = fileData.content;
    } else if (fileData.contentType === 'html' || fileData.contentType === 'htm') {
      config.html = fileData.content;
    } else {
      // Binary file (DOCX, PDF, etc.)
      config.data = fileData;
    }

    return config;
  }

  /**
   * Check if processed file is markdown
   * @param {Object} fileData - Processed file data
   * @returns {boolean} True if markdown file
   */
  static isMarkdown(fileData) {
    return fileData.contentType === 'md';
  }

  /**
   * Check if processed file is HTML
   * @param {Object} fileData - Processed file data
   * @returns {boolean} True if HTML file
   */
  static isHtml(fileData) {
    return fileData.contentType === 'html' || fileData.contentType === 'htm';
  }
}
