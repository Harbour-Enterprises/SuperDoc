import { AIProviderInterface } from '../provider-interface.js';

/**
 * ConfigurableAIProvider - Universal adapter for any AI backend
 */
export class ConfigurableAIProvider extends AIProviderInterface {
  constructor(config) {
    super();

    if (!config?.endpoint) {
      throw new Error('ConfigurableAIProvider: endpoint is required');
    }

    if (typeof config.buildRequest !== 'function') {
      throw new Error('ConfigurableAIProvider: buildRequest function is required');
    }

    if (typeof config.parseResponse !== 'function') {
      throw new Error('ConfigurableAIProvider: parseResponse function is required');
    }

    this.endpoint = config.endpoint;
    this.headers = config.headers || {};

    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.temperature = config.temperature;

    this.buildRequest = config.buildRequest;
    this.parseResponse = config.parseResponse;
    this.parseStreamChunk = config.parseStreamChunk || ((chunk) => chunk);
  }

  #withDefaults(request) {
    return {
      model: request.model || this.model,
      max_tokens: request.max_tokens || this.maxTokens,
      temperature: request.temperature ?? this.temperature,
      ...request,
    };
  }

  async fetch(body) {
    const payload = this.#withDefaults(body);
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI provider error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async write(prompt, options = {}) {
    const requestBody = this.buildRequest('write', { prompt }, options);
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.parseResponse(data);
  }

  async writeStreaming(prompt, options = {}, onChunk, onDone) {
    const requestBody = this.buildRequest('writeStreaming', { prompt, stream: true }, options);
    const response = await this.fetch(requestBody);
    return this.#processStream(response.body, onChunk, onDone);
  }

  async rewrite(text, instructions = '', options = {}) {
    const requestBody = this.buildRequest('rewrite', { text, instructions }, options);
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.parseResponse(data);
  }

  async rewriteStreaming(text, instructions = '', options = {}, onChunk, onDone) {
    const requestBody = this.buildRequest('rewriteStreaming', { text, instructions, stream: true }, options);
    const response = await this.fetch(requestBody);
    return this.#processStream(response.body, onChunk, onDone);
  }

  async findContent(prompt, options = {}) {
    const requestBody = this.buildRequest(
      'findContent',
      `${prompt}\n\n find and return ONLY the exact text as it appear`,
      options,
    );
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.parseResponse(data);
  }

  async findContents(prompt, options = {}) {
    const requestBody = this.buildRequest(
      'findContents',
      `${prompt}\n\n Find ALL occurrences exact text. Return JSON: ["exact text", "exact text", ...]`,
      options,
    );
    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.parseResponse(data);
  }

  async change(prompt, options = {}) {
    const requestBody = this.buildRequest(
      'change',
      `${prompt}\n\n Return JSON: {"original": "the exact text as it appears in the document", "modified": "modified version"}`,
      options,
    );

    const response = await this.fetch(requestBody);
    const data = await response.json();
    return this.parseResponse(data);
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
        const parsedChunk = this.parseStreamChunk(chunk);

        if (parsedChunk) {
          onChunk?.(parsedChunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
