import { AIProviderInterface } from '../provider-interface.js';

/**
 * Insights AI Provider - Default implementation using the Insights API.
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
    const payload = this.#buildSharedPayload({
      stream: false,
      message: `From context extract the exact text: ${prompt}`,
      name: 'find_content',
    });

    if (options.documentXml) {
      payload.context = this.#composeContext(options.documentXml);
    }

    const response = await this.#fetch(payload);
    const data = await response.json();
    return this.#extractSingleValue(data);
  }

  async findContents(prompt, options = {}) {
    const payload = this.#buildSharedPayload({
      stream: false,
      message:
        `From context extract every occurrence that satisfies: ${prompt}. ` +
        'Respond strictly with a JSON array of the exact matching strings.',
      name: 'find_contents',
    });

    if (options.documentXml) {
      payload.context = this.#composeContext(options.documentXml);
    }

    const response = await this.#fetch(payload);
    const data = await response.json();

    const matches = this.#extractValues(data);
    if (matches.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(matches[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean);
      }
    } catch (error) {
      // Ignore parse errors – fallback to normalized list below.
    }

    return matches;
  }

  async write(prompt, options = {}) {
    const payload = this.#buildSharedPayload({
      stream: false,
      message: `Generate text based on: ${prompt}`,
      name: 'text_generation',
      format: [{ value: '' }],
    });

    if (options.documentXml) {
      payload.document_content = options.documentXml;
    }

    const response = await this.#fetch(payload);
    const data = await response.json();
    return this.#extractSingleValue(data);
  }

  async writeStreaming(prompt, options = {}, onChunk, onDone) {
    const payload = this.#buildSharedPayload({
      stream: true,
      message: `Generate text based on: ${prompt}`,
      name: 'text_generation',
    });

    if (options.documentXml) {
      payload.document_content = options.documentXml;
    }

    const response = await this.#fetch(payload);
    return this.#processStream(response.body, onChunk, onDone);
  }

  async rewrite(text, instructions = '', options = {}) {
    const message = instructions ? `Rewrite: "${text}" using: ${instructions}` : `Rewrite: "${text}"`;

    const payload = this.#buildSharedPayload({
      stream: false,
      message,
      name: 'text_rewrite',
      format: [{ value: '' }],
    });

    const response = await this.#fetch(payload);
    const data = await response.json();
    return this.#extractSingleValue(data);
  }

  async rewriteStreaming(text, instructions = '', options = {}, onChunk, onDone) {
    const message = instructions ? `Rewrite: "${text}" using: ${instructions}` : `Rewrite: "${text}"`;

    const payload = this.#buildSharedPayload({
      stream: true,
      message,
      name: 'text_rewrite',
    });

    const response = await this.#fetch(payload);
    return this.#processStream(response.body, onChunk, onDone);
  }

  async change(prompt, options = {}) {
    const { documentXml, extraContext } = options;

    const payload = this.#buildSharedPayload({
      stream: false,
      message:
        `Locate the passage described by: ${prompt}. ` +
        'Respond with JSON: {"originalText":"<exact excerpt>","modifiedText":"<revised text>"}.',
      name: 'text_change',
      format: [{ value: { originalText: '', modifiedText: '' } }],
    });

    const contextSource = documentXml ? this.#composeContext(documentXml) : this.#getSystemPrompt();
    payload.context = extraContext ? `${contextSource}\n\nExtra context:\n${extraContext}` : contextSource;

    if (documentXml) {
      payload.document_content = documentXml;
    }

    const response = await this.#fetch(payload);
    const data = await response.json();
    const result = this.#extractChange(data);

    if (!result.originalText || !result.modifiedText) {
      throw new Error('AI provider returned an invalid change payload');
    }

    return result;
  }

  #getSystemPrompt() {
    return 'Extract the exact text from the document.';
  }

  #buildSharedPayload({ stream, message, name, format }) {
    const payload = {
      stream,
      context: this.#getSystemPrompt(),
      insights: [
        {
          type: 'custom_prompt',
          name,
          message,
        },
      ],
    };

    if (format) {
      payload.insights[0].format = format;
    }

    return payload;
  }

  #composeContext(documentXml) {
    return documentXml;
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

  #extractValues(data) {
    if (!data || data.custom_prompt == null) return [];

    const entries = Array.isArray(data.custom_prompt) ? data.custom_prompt : [data.custom_prompt];

    return entries
      .map((entry) => {
        if (entry == null) return '';
        if (typeof entry === 'string') return entry.trim();
        if (typeof entry === 'object') {
          if (entry.value != null) {
            return String(entry.value).trim();
          }
          return JSON.stringify(entry).trim();
        }
        return String(entry).trim();
      })
      .filter((value) => value.length > 0);
  }

  #extractSingleValue(data) {
    const [first] = this.#extractValues(data);
    return first ?? '';
  }

  #extractChange(data) {
    const values = this.#extractValues(data);

    for (const value of values) {
      const normalized = this.#normalizeChangeCandidate(value);
      if (normalized) {
        return normalized;
      }
    }

    if (data && typeof data.custom_prompt === 'object' && !Array.isArray(data.custom_prompt)) {
      const normalized = this.#normalizeChangeCandidate(data.custom_prompt);
      if (normalized) {
        return normalized;
      }
    }

    return { originalText: '', modifiedText: '' };
  }

  #normalizeChangeCandidate(candidate) {
    if (!candidate) return null;

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      try {
        const parsed = JSON.parse(trimmed);
        return this.#normalizeChangeCandidate(parsed);
      } catch (error) {
        return trimmed
          ? {
              originalText: '',
              modifiedText: trimmed,
            }
          : null;
      }
    }

    if (typeof candidate === 'object') {
      const original =
        candidate.originalText ?? candidate.original ?? candidate.source ?? candidate.exact ?? candidate.before ?? '';
      const modified =
        candidate.modifiedText ?? candidate.modified ?? candidate.result ?? candidate.after ?? candidate.rewrite ?? '';

      if (original || modified) {
        return {
          originalText: original,
          modifiedText: modified,
        };
      }
    }

    return null;
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
