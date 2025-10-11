import { AIProviderInterface } from './provider-interface.js';

/**
 * Insights AI Provider - Default implementation
 * Uses the Insights API for AI operations
 */
export class InsightsAIProvider extends AIProviderInterface {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || config.api_key;
    this.endpoint =
      config.endpoint || config.baseUrl || 'https://sd-dev-express-gateway-i6xtm.ondigitalocean.app/insights';
    this.model = config.model;
  }

  async findContent(prompt, options = {}) {
    const payload = {
      stream: false,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name: 'find_content',
          message: `From context extract the exact text: ${prompt}`,
        },
      ],
    };

    if (options.documentXml) {
      payload.context = options.documentXml;
    }

    const response = await this.#fetch(payload);
    return this.#extractValue(response);
  }

  async write(prompt, options = {}) {
    const payload = {
      stream: false,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name: 'text_generation',
          message: `Generate text based on: ${prompt}`,
          format: [{ value: '' }],
        },
      ],
    };

    if (options.documentXml) {
      payload.document_content = options.documentXml;
    }

    const response = await this.#fetch(payload);
    return this.#extractValue(response);
  }

  async writeStreaming(prompt, options = {}, onChunk, onDone) {
    const payload = {
      stream: true,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name: 'text_generation',
          message: `Generate text based on: ${prompt}`,
        },
      ],
    };

    if (options.documentXml) {
      payload.document_content = options.documentXml;
    }

    const response = await this.#fetch(payload);
    return this.#processStream(response.body, onChunk, onDone);
  }

  async rewrite(text, instructions = '', options = {}) {
    const message = instructions ? `Rewrite: "${text}" using: ${instructions}` : `Rewrite: "${text}"`;

    const payload = {
      stream: false,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name: 'text_rewrite',
          message,
          format: [{ value: '' }],
        },
      ],
    };

    const response = await this.#fetch(payload);
    return this.#extractValue(response);
  }

  async rewriteStreaming(text, instructions = '', options = {}, onChunk, onDone) {
    const message = instructions ? `Rewrite: "${text}" using: ${instructions}` : `Rewrite: "${text}"`;

    const payload = {
      stream: true,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name: 'text_rewrite',
          message,
        },
      ],
    };

    const response = await this.#fetch(payload);
    return this.#processStream(response.body, onChunk, onDone);
  }

  // Private methods
  #getSystemPrompt() {
    return 'Extract the exact text from the document.';
  }

  async #fetch(payload) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.status}`);
    }

    return response;
  }

  async #extractValue(response) {
    const json = await response.json();

    // Check if custom_prompt exists
    if (!json.custom_prompt) return '';

    // If it's a string, return it directly
    if (typeof json.custom_prompt === 'string') {
      return json.custom_prompt;
    }

    // If it's an array, return the first item's value
    if (Array.isArray(json.custom_prompt)) {
      return json.custom_prompt[0]?.value || '';
    }

    // If it's an object, return its value property
    if (typeof json.custom_prompt === 'object') {
      return json.custom_prompt.value || '';
    }

    return '';
  }

  async #processStream(stream, onChunk, onDone) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onDone?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        onChunk?.(chunk);
      }
    } finally {
      reader.releaseLock();
    }
  }
}
