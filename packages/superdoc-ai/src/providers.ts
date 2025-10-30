/**
 * Provider factories and adapter utilities that normalize different LLM backends
 * (OpenAI, Anthropic, bespoke HTTP endpoints, or pre-built provider instances)
 * into the shared `AIProvider` interface consumed by SuperDoc AI.
 *
 * Consumers typically pass a configuration object to `createAIProvider`; internally
 * we map that object to an implementation that exposes the two required methods:
 * `getCompletion` for single-turn requests and `streamCompletion` for incremental
 * responses.  Each helper below handles nuances such as request body shape,
 * authentication headers, and stream parsing for the corresponding provider.
 */
import type { AIMessage, AIProvider, CompletionOptions, StreamOptions } from './types';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ProviderRequestContext {
    messages: AIMessage[];
    options?: CompletionOptions;
    stream: boolean;
}

interface ProviderDefaults {
    temperature?: number;
    maxTokens?: number;
    stop?: string[];
    streamResults?: boolean;
}

export interface HttpProviderConfig extends ProviderDefaults {
    type: 'http';
    url: string;
    streamUrl?: string;
    headers?: Record<string, string>;
    method?: string;
    fetch?: FetchLike;
    buildRequestBody?: (context: ProviderRequestContext) => Record<string, any>;
    parseCompletion?: (payload: any) => string;
    parseStreamChunk?: (payload: any) => string | undefined;
}

export interface OpenAIProviderConfig extends ProviderDefaults {
    type: 'openai';
    apiKey: string;
    model: string;
    baseURL?: string;
    organizationId?: string;
    headers?: Record<string, string>;
    completionPath?: string;
    requestOptions?: Record<string, any>;
    fetch?: FetchLike;
}

export interface AnthropicProviderConfig extends ProviderDefaults {
    type: 'anthropic';
    apiKey: string;
    model: string;
    baseURL?: string;
    apiVersion?: string;
    headers?: Record<string, string>;
    requestOptions?: Record<string, any>;
    fetch?: FetchLike;
}

export type AIProviderInput = AIProvider | OpenAIProviderConfig | AnthropicProviderConfig | HttpProviderConfig;

/**
 * Type guard that determines whether a value already implements the `AIProvider`
 * contract (both `getCompletion` and `streamCompletion` functions).
 *
 * @param value - Candidate object to validate.
 * @returns True if the value satisfies the provider interface.
 */
export function isAIProvider(value: any): value is AIProvider {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const provider = value as AIProvider;
    return typeof provider.getCompletion === 'function' && typeof provider.streamCompletion === 'function';
}

/**
 * Entry point for consumers. Accepts either an already-instantiated provider
 * (anything that satisfies the `AIProvider` interface) or a configuration object
 * describing one of the supported backends. The helper returns a normalized
 * provider that SuperDoc AI can call without knowing the underlying vendor.
 *
 * @param config - Provider instance or configuration object.
 * @returns An `AIProvider` ready for use by SuperDoc AI.
 * @throws Error when an unsupported provider type is supplied.
 */
export function createAIProvider(config: AIProviderInput): AIProvider {
    if (isAIProvider(config)) {
        return config;
    }

    switch (config.type) {
        case 'openai':
            return createOpenAIProvider(config);
        case 'anthropic':
            return createAnthropicProvider(config);
        case 'http':
            return createHttpProvider(config);
        default:
            throw new Error('Unsupported AI provider type');
    }
}

/**
 * Factory for arbitrary HTTP-based backends. Useful for self-hosted gateways
 * or thin wrappers around vendor APIs. Callers may override how the request
 * body is constructed (`buildRequestBody`) and how responses / stream chunks
 * are parsed (`parseCompletion`, `parseStreamChunk`) to fit their protocol.
 *
 * @param config - HTTP provider configuration.
 * @returns An `AIProvider` backed by the specified HTTP endpoint.
 */
export function createHttpProvider(config: HttpProviderConfig): AIProvider {
    const {
        url,
        streamUrl,
        headers = {},
        method = 'POST',
        fetch: customFetch,
        buildRequestBody,
        parseCompletion = defaultParseCompletion,
        parseStreamChunk = defaultParseStreamChunk,
        temperature,
        maxTokens,
        stop,
        streamResults,
    } = config;

    const fetchImpl = resolveFetch(customFetch);

    const buildBody =
        buildRequestBody ??
        ((context: ProviderRequestContext) =>
            cleanUndefined({
                messages: context.messages,
                stream: context.options?.stream ?? context.stream ?? streamResults,
                temperature: context.options?.temperature ?? temperature,
                max_tokens: context.options?.maxTokens ?? maxTokens,
                stop: context.options?.stop ?? stop,
                model: context.options?.model,
                ...context.options?.providerOptions,
            }));

    /**
     * Internal helper to execute an HTTP request against the configured provider.
     *
     * @param targetUrl - URL that should receive the JSON payload.
     * @param context - Context containing the chat messages and invocation options.
     * @returns The raw `Response` instance from fetch.
     * @throws Error when the provider responds with a non-ok status.
     */
    async function requestJson(targetUrl: string, context: ProviderRequestContext) {
        const bodyPayload = buildBody(context);
        const response = await fetchImpl(targetUrl, {
            method,
            headers: ensureContentType(headers),
            body: JSON.stringify(bodyPayload),
            signal: context.options?.signal,
        });

        if (!response.ok) {
            const errorText = await safeReadText(response);
            throw new Error(`AI provider request failed with status ${response.status} (${response.statusText}): ${errorText}`);
        }

        return response;
    }

    return {
        streamResults,
        async *streamCompletion(messages: AIMessage[], options?: StreamOptions) {
            const target = streamUrl ?? url;

            if (!target) {
                const fullResult = await this.getCompletion(messages, options);
                if (fullResult) {
                    yield fullResult;
                }
                return;
            }

            const response = await requestJson(target, { messages, stream: true, options });
            yield* readStreamResponse(response, parseStreamChunk, parseCompletion);
        },

        async getCompletion(messages: AIMessage[], options?: CompletionOptions): Promise<string> {
            const response = await requestJson(url, { messages, stream: false, options });
            return parseResponsePayload(response, parseCompletion);
        }
    };
}

/**
 * Convenience wrapper around the OpenAI Chat Completions API. Translates the
 * generic `AIProvider` contract into the expected OpenAI request shape, applies
 * auth headers, and reuses the streaming helpers defined in this module.
 *
 * @param config - OpenAI provider configuration.
 * @returns An `AIProvider` targeting OpenAI's chat completions endpoint.
 */
export function createOpenAIProvider(config: OpenAIProviderConfig): AIProvider {
    const {
        apiKey,
        baseURL = 'https://api.openai.com/v1',
        model,
        organizationId,
        headers,
        completionPath = '/chat/completions',
        requestOptions,
        fetch: customFetch,
        temperature,
        maxTokens,
        stop,
        streamResults,
    } = config;

    const url = joinUrl(baseURL, completionPath);
    const baseHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(organizationId ? { 'OpenAI-Organization': organizationId } : {}),
        ...headers,
    };

    return createHttpProvider({
        type: 'http',
        url,
        streamUrl: url,
        headers: baseHeaders,
        fetch: customFetch,
        temperature,
        maxTokens,
        stop,
        streamResults,
        buildRequestBody: ({ messages, stream: contextStream, options }) =>
            cleanUndefined({
                model: options?.model ?? model,
                temperature: options?.temperature ?? temperature,
                max_tokens: options?.maxTokens ?? maxTokens,
                stop: options?.stop ?? stop,
                stream: options?.stream ?? contextStream ?? streamResults,
                messages,
                ...requestOptions,
                ...options?.providerOptions,
            }),
        parseCompletion: parseOpenAICompletion,
        parseStreamChunk: parseOpenAIStreamChunk,
    });
}

/**
 * Convenience wrapper for Anthropic Messages API (Claude). Handles conversion
 * from the SuperDoc chat message format to Anthropic's `system` and `messages`
 * structure and unifies streaming behaviour with the rest of the providers.
 *
 * @param config - Anthropic provider configuration.
 * @returns An `AIProvider` targeting Anthropic's messages endpoint.
 */
export function createAnthropicProvider(config: AnthropicProviderConfig): AIProvider {
    const {
        apiKey,
        baseURL = 'https://api.anthropic.com',
        apiVersion = '2023-06-01',
        model,
        headers,
        requestOptions,
        fetch: customFetch,
        temperature,
        maxTokens = 1024,
        stop,
        streamResults,
    } = config;

    const url = joinUrl(baseURL, '/v1/messages');
    const baseHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': apiVersion,
        ...headers,
    };

    return createHttpProvider({
        type: 'http',
        url,
        streamUrl: url,
        headers: baseHeaders,
        fetch: customFetch,
        temperature,
        maxTokens,
        stop,
        streamResults,
        buildRequestBody: ({ messages, stream: contextStream, options }) => {
            const { system, anthropicMessages } = convertToAnthropicMessages(messages);
            return cleanUndefined({
                model: options?.model ?? model,
                temperature: options?.temperature ?? temperature,
                max_tokens: options?.maxTokens ?? maxTokens,
                stop_sequences: options?.stop ?? stop,
                stream: options?.stream ?? contextStream ?? streamResults,
                system,
                messages: anthropicMessages,
                ...requestOptions,
                ...options?.providerOptions,
            });
        },
        parseCompletion: parseAnthropicCompletion,
        parseStreamChunk: parseAnthropicStreamChunk,
    });
}

/**
 * Streams data from a fetch `Response`, parsing SSE / chunked payloads into
 * plain text snippets that are yielded back to the caller.
 *
 * @param response - Fetch response to consume.
 * @param parseStreamChunk - Provider-specific chunk parser.
 * @param fallbackParser - Parser to apply when custom parsing fails.
 * @returns Async generator yielding parsed string chunks.
 * @throws Error when the response status indicates failure.
 */
async function* readStreamResponse(
    response: Response,
    parseStreamChunk: (payload: any) => string | undefined,
    fallbackParser: (payload: any) => string,
) {
    if (!response.ok) {
        throw new Error(`AI provider stream failed with status ${response.status}: ${await safeReadText(response)}`);
    }

    // Handle non-streaming response
    if (!response.body) {
        const text = await safeReadText(response);
        if (text) yield* processEventSegments(text, parseStreamChunk, fallbackParser);
        return;
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';

            for (const part of parts) {
                yield* processEventSegments(part, parseStreamChunk, fallbackParser);
            }
        }

        if (buffer.trim()) {
            yield* processEventSegments(buffer, parseStreamChunk, fallbackParser);
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Processes SSE event segments and yields parsed text chunks.
 *
 * @param event - Raw SSE event string.
 * @param parseStreamChunk - Provider-specific chunk parser.
 * @param fallbackParser - Fallback parser for unparseable chunks.
 * @returns Generator yielding parsed string chunks.
 */
function* processEventSegments(
    event: string,
    parseStreamChunk: (payload: any) => string | undefined,
    fallbackParser: (payload: any) => string,
): Generator<string, void, any> {
    for (const segment of extractEventSegments(event)) {
        if (segment === '[DONE]') {
            return;
        }

        let payload: any = segment;
        try {
            payload = JSON.parse(segment);
        } catch {
            // Keep payload as string if JSON parsing fails
        }

        const chunk = parseStreamChunk(payload) ?? (typeof payload === 'string' ? payload : fallbackParser(payload));
        if (chunk) {
            yield chunk;
        }
    }
}

/**
 * Safely reads the response body as text, swallowing any lower-level errors.
 *
 * @param response - Fetch response to read.
 * @returns Response text or an empty string when reading fails.
 */
async function safeReadText(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        return '';
    }
}

/**
 * Splits an SSE event chunk into its constituent data segments.
 *
 * @param eventChunk - Raw SSE data block separated by newlines.
 * @returns Array of cleaned event payload strings.
 */
function extractEventSegments(eventChunk: string) {
    const dataLines = eventChunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const dataSegments: string[] = [];

    for (const line of dataLines) {
        if (line.startsWith('data:')) {
            dataSegments.push(line.slice(5).trim());
        } else {
            dataSegments.push(line);
        }
    }

    return dataSegments;
}

/**
 * Parses a non-streaming response by content type, delegating to the provided
 * parser for JSON payloads and falling back to plain text otherwise.
 *
 * @param response - Fetch response to parse.
 * @param parser - Function that extracts a string from the JSON payload.
 * @returns Parsed string derived from the response.
 */
async function parseResponsePayload(response: Response, parser: (payload: any) => string): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
        const json = await response.json();
        const parsed = parser(json);
        if (parsed.length > 0) {
            return parsed;
        }
        return JSON.stringify(json);
    }

    return await response.text();
}

function extractTextFromBlock(block: any): string[] {
    if (block?.text) return [String(block.text)];

    if (Array.isArray(block?.content)) {
        return block.content
            .map((part: any) => typeof part === 'string' ? part : String(part?.text || ''))
            .filter(Boolean);
    }

    return [];
}

/**
 * Fallback completion parser capable of handling several common payload shapes
 * (OpenAI-style choices, Anthropic content blocks, or raw strings).
 *
 * @param payload - Provider response payload.
 * @returns Extracted text content suitable for callers.
 */
function defaultParseCompletion(payload: any): string {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';

    // OpenAI format: choices[0].message.content or choices[0].text
    const choice = payload.choices?.[0];
    if (choice) {
        if (choice.message?.content) return choice.message.content;
        if (choice.text) return choice.text;
    }

    // Anthropic format: content (string or array)
    const { content } = payload;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .flatMap(block => extractTextFromBlock(block))
            .join('');
    }

    return JSON.stringify(payload);
}

/**
 * Specialized completion parser for OpenAI chat responses.
 *
 * @param payload - Raw OpenAI JSON payload.
 * @returns Message content or the default parsing result.
 */
function parseOpenAICompletion(payload: any): string {
    return payload?.choices?.[0]?.message?.content || defaultParseCompletion(payload);
}

/**
 * Extracts incremental content from OpenAI stream delta payloads.
 *
 * @param payload - Stream event payload.
 * @returns Concatenated chunk text or undefined when no content is present.
 */
function parseOpenAIStreamChunk(payload: any): string | undefined {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    if ('choices' in payload && Array.isArray(payload?.choices)) {
        const choices = payload?.choices;
        return choices.map((choice: any) => {
            const delta = choice.delta;
            return delta?.content ?? delta?.text ?? '';
        }).join('');
    }

    return undefined;
}

/**
 * Converts the SuperDoc message format into Anthropic's `system` and `messages`
 * structure required by the Claude Messages API.
 *
 * @param messages - Chat messages supplied by SuperDoc.
 * @returns Object containing an optional system string and Anthropic-formatted messages.
 */
function convertToAnthropicMessages(messages: AIMessage[]) {
    const anthropicMessages = [];
    const systemMessages: string[] = [];

    for (const message of messages) {
        if (message.role === 'system') {
            systemMessages.push(message.content);
            continue;
        }
        anthropicMessages.push({
            role: message.role,
            content: [{type: 'text', text: message.content}],
        });
    }

    return {
        system: systemMessages.length ? systemMessages.join('\n') : undefined,
        anthropicMessages,
    };
}

/**
 * Extracts text content from Anthropic completion payloads.
 *
 * @param payload - Raw Anthropic JSON payload.
 * @returns Parsed text content, falling back to the default parser when needed.
 */
function parseAnthropicCompletion(payload: any): string {
    if (!Array.isArray(payload?.content)) {
        return defaultParseCompletion(payload);
    }

    return payload.content
        .flatMap((block: any) => extractTextFromBlock(block))
        .join('');

}

/**
 * Extracts incremental text from Anthropic streaming events.
 *
 * @param payload - Stream event payload emitted by Anthropic.
 * @returns Text chunk when available, otherwise undefined.
 */
function parseAnthropicStreamChunk(payload: any): string | undefined {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    if ((payload.type === 'content_block_delta' || payload.type === 'message_delta') && payload.delta?.text) {
        return payload.delta.text;
    }

    if (payload.type === 'message_start' && payload.message) {
        return parseAnthropicCompletion(payload.message);
    }

    return undefined;
}

/**
 * Generic stream chunk parser that attempts OpenAI parsing first and then falls
 * back to Anthropic-specific parsing.
 *
 * @param payload - Stream event payload.
 * @returns Parsed chunk text or undefined when nothing could be extracted.
 */
function defaultParseStreamChunk(payload: unknown): string | undefined {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }

    return parseOpenAIStreamChunk(payload) ?? parseAnthropicStreamChunk(payload);
}

/**
 * Resolves a fetch implementation, using the provided custom function when
 * supplied, otherwise falling back to the global fetch.
 *
 * @param customFetch - Optional fetch implementation.
 * @returns A fetch-compatible function.
 * @throws Error when no fetch implementation can be determined.
 */
function resolveFetch(customFetch?: FetchLike): FetchLike {
    if (customFetch) return customFetch;
    if (!globalThis?.fetch) throw new Error('No fetch available. Provide fetch in provider config.');
    return globalThis.fetch.bind(globalThis);
}

/**
 * Ensures the `Content-Type` header is set to JSON when the caller did not
 * provide one explicitly.
 *
 * @param headers - Original headers object.
 * @returns Headers object guaranteed to include `Content-Type`.
 */
function ensureContentType(headers: Record<string, string>) {
    if (Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
        return headers;
    }
    return {
        ...headers,
        'Content-Type': 'application/json',
    };
}

/**
 * Removes properties with `undefined` values from an object to avoid sending
 * spurious keys to provider APIs.
 *
 * @param object - Source object to clean.
 * @returns New object without undefined values.
 */
function cleanUndefined(object: Record<string, any>) {
    return Object.fromEntries(
        Object.entries(object).filter(([, v]) => v !== undefined)
    );
}

/**
 * Joins a base URL and relative path without introducing duplicate slashes.
 *
 * @param base - Base URL (with or without trailing slash).
 * @param path - Path segment to append.
 * @returns Normalized URL string.
 */
function joinUrl(base: string, path: string): string {
    let normalizedBase = base;
    while (normalizedBase.endsWith('/')) {
        normalizedBase = normalizedBase.slice(0, -1);
    }

    return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
}

export type { FetchLike, ProviderRequestContext };
