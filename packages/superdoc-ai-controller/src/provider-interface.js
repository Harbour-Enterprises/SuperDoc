/**
 * AI Provider Interface
 * Implement this interface to create custom AI providers.
 */
export class AIProviderInterface {
  /**
   * Find content in document.
   * @param {string} prompt - Search query.
   * @param {Object} options - Additional options (documentXml, context, etc.).
   * @returns {Promise<string>} - Found content or generated response.
   */
  async findContent(prompt, options = {}) {
    throw new Error('findContent() must be implemented');
  }

  /**
   * Find multiple pieces of content in the document.
   * @param {string} prompt - Search query describing desired matches.
   * @param {Object} options - Additional options (documentXml, context, etc.).
   * @returns {Promise<string[]|string>} - Matched content.
   */
  async findContents(prompt, options = {}) {
    throw new Error('findContents() must be implemented');
  }

  /**
   * Generate text based on prompt (non-streaming).
   * @param {string} prompt - Generation prompt.
   * @param {Object} options - Additional options.
   * @returns {Promise<string>} - Generated text.
   */
  async write(prompt, options = {}) {
    throw new Error('write() must be implemented');
  }

  /**
   * Generate text based on prompt (streaming).
   * @param {string} prompt - Generation prompt.
   * @param {Object} options - Additional options.
   * @param {Function} onChunk - Callback for each chunk.
   * @param {Function} onDone - Callback when complete.
   * @returns {Promise<void>}
   */
  async writeStreaming(prompt, options = {}, onChunk, onDone) {
    throw new Error('writeStreaming() must be implemented');
  }

  /**
   * Rewrite text (non-streaming).
   * @param {string} text - Text to rewrite.
   * @param {string} instructions - Rewrite instructions.
   * @param {Object} options - Additional options.
   * @returns {Promise<string>} - Rewritten text.
   */
  async rewrite(text, instructions = '', options = {}) {
    throw new Error('rewrite() must be implemented');
  }

  /**
   * Change existing content inside the document.
   * @param {string} prompt - Instructions describing the change.
   * @param {Object} options - Additional options.
   * @returns {Promise<Object>} - Object describing original and modified text.
   */
  async change(prompt, options = {}) {
    throw new Error('change() must be implemented');
  }

  /**
   * Rewrite text (streaming).
   * @param {string} text - Text to rewrite.
   * @param {string} instructions - Rewrite instructions.
   * @param {Object} options - Additional options.
   * @param {Function} onChunk - Callback for each chunk.
   * @param {Function} onDone - Callback when complete.
   * @returns {Promise<void>}
   */
  async rewriteStreaming(text, instructions = '', options = {}, onChunk, onDone) {
    throw new Error('rewriteStreaming() must be implemented');
  }
}
