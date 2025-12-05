/**
 * Streaming utilities for provider implementations
 * @module providers/streaming
 */

/**
 * Safely reads the response body as text, swallowing any lower-level errors.
 *
 * @param response - Fetch response to read.
 * @returns Response text or an empty string when reading fails.
 */
export async function safeReadText(response: Response): Promise<string> {
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
export function extractEventSegments(eventChunk: string): string[] {
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
 * Processes SSE event segments and yields parsed text chunks.
 *
 * @param event - Raw SSE event string.
 * @param parseStreamChunk - Provider-specific chunk parser.
 * @param fallbackParser - Fallback parser for unparseable chunks.
 * @returns Generator yielding parsed string chunks.
 */
export function* processEventSegments(
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
 * Reads a streaming response and yields parsed string chunks.
 *
 * @param response - Fetch response with streaming body.
 * @param parseStreamChunk - Provider-specific chunk parser.
 * @param fallbackParser - Fallback parser for unparseable chunks.
 * @returns Async generator yielding parsed string chunks.
 * @throws Error when the response status indicates failure.
 */
export async function* readStreamResponse(
    response: Response,
    parseStreamChunk: (payload: any) => string | undefined,
    fallbackParser: (payload: any) => string,
): AsyncGenerator<string, void, undefined> {
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
 * Parses a non-streaming response by content type, delegating to the provided
 * parser for JSON payloads and falling back to plain text otherwise.
 *
 * @param response - Fetch response to parse.
 * @param parser - Function that extracts a string from the JSON payload.
 * @returns Parsed string derived from the response.
 */
export async function parseResponsePayload(response: Response, parser: (payload: any) => string): Promise<string> {
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

/**
 * Extracts text from Anthropic-style content blocks
 * 
 * @param block - Content block to extract text from
 * @returns Array of text strings
 */
export function extractTextFromBlock(block: any): string[] {
    if (block?.text) return [String(block.text)];

    if (Array.isArray(block?.content)) {
        return block.content
            .map((part: any) => typeof part === 'string' ? part : String(part?.text || ''))
            .filter(Boolean);
    }

    return [];
}

