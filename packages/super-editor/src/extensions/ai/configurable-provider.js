import { AIProviderInterface } from './provider-interface.js';

/**
 * Configurable AI Provider - Allows custom request/response mapping
 */
export class ConfigurableAIProvider extends AIProviderInterface {
  constructor(config) {
    super();
    this.endpoint = config.endpoint;
    this.headers = config.headers || {};

    this.defaultModel = config.model || config.defaultModel;
    this.defaultMaxTokens = config.maxTokens || config.defaultMaxTokens || 1000;
    this.defaultTemperature = config.temperature || config.defaultTemperature || 0.7;

    // Request builders - how to build the request body for each operation
    this.requestBuilders = {
      write: config.buildWriteRequest || this.defaultBuildWriteRequest,
      rewrite: config.buildRewriteRequest || this.defaultBuildRewriteRequest,
      findContent: config.buildFindContentRequest || this.defaultBuildFindContentRequest,
    };

    // Response parsers - how to extract the text from the response
    this.responseParser = config.parseResponse || this.defaultParseResponse;

    // Stream parser - how to extract chunks from streaming response
    this.streamParser = config.parseStreamChunk || this.defaultParseStreamChunk;
  }

  #withDefaults(request) {
    return {
      model: request.model || this.defaultModel,
      max_tokens: request.max_tokens || this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      ...request,
    };
  }

  defaultBuildWriteRequest(prompt, options) {
    return {
      prompt,
      context: options.documentXml,
      operation: 'write',
    };
  }

  defaultBuildRewriteRequest(text, instructions, options) {
    return {
      text,
      instructions,
      context: options.documentXml,
      operation: 'rewrite',
    };
  }

  defaultBuildFindContentRequest(prompt, options) {
    return {
      prompt,
      document: options.documentXml,
      operation: 'find',
    };
  }

  defaultParseResponse(data) {
    return data.text || data.content || data.result || data.output || '';
  }

  defaultParseStreamChunk(chunk) {
    return chunk;
  }

  async fetch(body, streaming = false) {
    body = this.#withDefaults(body);
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`AI provider error: ${response.status} - ${response.statusText}`);
    }

    return response;
  }

  async write(prompt, options = {}) {
    const requestBody = this.requestBuilders.write(prompt, options);
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.responseParser(data);
  }

  async writeStreaming(prompt, options = {}, onChunk, onDone) {
    const requestBody = { ...this.requestBuilders.write(prompt, options), stream: true };
    const response = await this.fetch(requestBody, true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onDone?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const parsedChunk = this.streamParser(chunk);

        if (parsedChunk) {
          onChunk?.(parsedChunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async rewrite(text, instructions = '', options = {}) {
    const requestBody = this.requestBuilders.rewrite(text, instructions, options);
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.responseParser(data);
  }

  async rewriteStreaming(text, instructions = '', options = {}, onChunk, onDone) {
    const requestBody = { ...this.requestBuilders.rewrite(text, instructions, options), stream: true };
    const response = await this.fetch(requestBody, true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          onDone?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const parsedChunk = this.streamParser(chunk);

        if (parsedChunk) {
          onChunk?.(parsedChunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async findContent(prompt, options = {}) {
    const requestBody = this.requestBuilders.findContent(prompt, options);
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.responseParser(data);
  }
}
