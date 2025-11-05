import {AIProvider, Editor, Result, FoundMatch, DocumentPosition, AIMessage} from './types';
import {EditorAdapter} from './editor-adapter';
import {validateInput, parseJSON} from './utils';
import {
    buildFindPrompt,
    buildReplacePrompt,
    buildSummaryPrompt,
    buildInsertContentPrompt,
    SYSTEM_PROMPTS
} from './prompts';

/**
 * AI-powered document actions
 * All methods are pure - they receive dependencies and return results
 */
export class AIActions {
    private adapter: EditorAdapter;

    constructor(
        private provider: AIProvider,
        private editor: Editor | null,
        private documentContextProvider: () => string,
        private enableLogging: boolean = false,
        private onStreamChunk?: (partialResult: string) => void,
        private streamPreference?: boolean,
    ) {
        this.adapter = new EditorAdapter(this.editor);
        if (!this.adapter) {
            throw new Error('SuperDoc editor is not available; retry once the editor is initialized');
        }

        if (typeof this.provider.streamResults === 'boolean') {
            this.streamPreference = this.provider.streamResults;
        }
    }

    private getDocumentContext(): string {
        if (!this.documentContextProvider) {
            return '';
        }

        try {
            return this.documentContextProvider();
        } catch (error) {
            if (this.enableLogging) {
                console.error(
                    `Failed to retrieve document context: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }
            return '';
        }
    }


    /**
     * Executes a find query and resolves editor positions for matches.
     * @param query - Natural language description of content to find
     * @param findAll - Whether to find all occurrences or just the first
     * @returns Result with found locations enriched with editor positions
     */
    private async executeFindQuery(query: string, findAll: boolean): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const documentContext = this.getDocumentContext();

        if (!documentContext) {
            return {success: false, results: []};
        }

        const prompt = buildFindPrompt(query, documentContext, findAll);
        const response = await this.runCompletion([
            {role: 'system', content: SYSTEM_PROMPTS.SEARCH},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results) {
            return result;
        }
        result.results = this.adapter.findResults(result.results);

        return result;
    }

    /**
     * Finds the first occurrence of content matching the query and resolves concrete positions via the editor adapter.
     * @param query - Natural language description of content to find
     * @returns Result with found locations enriched with editor positions
     */
    async find(query: string): Promise<Result> {
        const result = await this.executeFindQuery(query, false);

        if (result.success && result.results?.length) {
            result.results = [result.results[0]];
        }

        return result;
    }

    /**
     * Finds all occurrences of content matching the query.
     * @param query - Natural language description of content to find
     * @returns Result with all found locations
     */
    async findAll(query: string): Promise<Result> {
        return this.executeFindQuery(query, true);
    }


    /**
     * Finds and highlights content in the document.
     * @param query - Natural language description of content to highlight
     * @param color - highlight color
     * @returns Result with highlight ID if successful
     */
    async highlight(query: string, color: string = "#6CA0DC"): Promise<Result> {
        const findResult = await this.find(query);

        if (!findResult.success) {
            return {...findResult, success: false};
        }

        try {
            const firstMatch = findResult.results?.find((match) => match.positions
                && match.positions.length > 0);
            if (!firstMatch || !firstMatch.positions || !firstMatch.positions.length) {
                return {success: false, results: []};
            }

            this.adapter.createHighlight(firstMatch.positions[0].from, firstMatch.positions[0].to, color);
            return {results: [firstMatch], success: true};
        } catch (error) {
            if (this.enableLogging) {
                console.error(`Failed to highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    }

    /**
     * Core logic for all document operations (replace, tracked changes, comments)
     * @param query - Natural language query
     * @param multiple - Whether to apply to all occurrences or just the first
     * @param operationFn - Function to execute the specific operation
     * @returns Matches and IDs of created items
     */
    private async executeOperation(
        query: string,
        multiple: boolean,
        operationFn: (adapter: EditorAdapter, position: DocumentPosition, replacement: FoundMatch) => Promise<string | void>
    ): Promise<FoundMatch[]> {
        const documentContext = this.getDocumentContext();

        if (!documentContext) {
            return [];
        }

        // Get AI query
        const prompt = buildReplacePrompt(query, documentContext, multiple);
        const response = await this.runCompletion([
            {role: 'system', content: SYSTEM_PROMPTS.EDIT},
            {role: 'user', content: prompt},
        ]);

        const parsed = parseJSON<Result>(
            response,
            {success: false, results: []},
            this.enableLogging
        );

        const replacements = parsed.results || [];

        if (!replacements.length) {
            return [];
        }

        const searchResults = this.adapter.findResults(replacements);
        const match = searchResults?.[0];
        for (const result of searchResults) {
            try {
                if (!result.positions || !result.positions.length) {
                    return [];
                }
                await operationFn(this.adapter, result.positions[0], result);
                if (!multiple) return [match];
            } catch (error) {
                if (this.enableLogging) {
                    console.error(`Failed to execute operation: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
                throw error;
            }
        }
        return searchResults;
    }


    /**
     * Finds and replaces content with AI-generated alternative.
     * @param query - Natural language query for replacement
     * @returns Result with original and suggested text
     */
    async replace(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) =>
                adapter.replaceText(position.from, position.to, replacement?.suggestedText || '')
        );

        return {
            success: matches.length > 0,
            results: matches
        };
    }

    /**
     * Finds and replaces all occurrences with AI-generated alternatives.
     * @param query - Natural language query for replacements
     * @returns Result with all replacements made
     */
    async replaceAll(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) =>
                adapter.replaceText(position.from, position.to, replacement?.suggestedText || '')
        );

        return {
            success: matches.length > 0,
            results: matches
        };
    }

    /**
     * Insert a single tracked change
     */
    async insertTrackedChange(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                )
        );

        return {
            success: true,
            results: matches,
        };
    }

    /**
     * Insert multiple tracked changes
     */
    async insertTrackedChanges(query: string): Promise<Result> {
        if (!validateInput(query, 'query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                )
        );

        return {
            success: true,
            results: matches,
        };
    }

    /**
     * Insert a single comment
     */
    async insertComment(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.suggestedText || ''
                )
        );

        return {
            success: true,
            results: matches,
        };
    }

    /**
     * Insert multiple comments
     */
    async insertComments(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.suggestedText || ''
                )
        );

        return {
            success: true,
            results: matches,
        };
    }


    /**
     * Generates a summary of the document.
     */
    async summarize(query: string): Promise<Result> {
        const documentContext = this.getDocumentContext();

        if (!documentContext) {
            return {results: [], success: false};
        }
        const prompt = buildSummaryPrompt(query, documentContext);
        const useStreaming = this.streamPreference !== false;
        let streamedLength = 0;

        const response = await this.runCompletion([
            {role: 'system', content: SYSTEM_PROMPTS.SUMMARY},
            {role: 'user', content: prompt},
        ], useStreaming);

        const parsed = parseJSON<Result>(
            response,
            {results: [], success: false},
            this.enableLogging
        );

        const finalText = parsed.results?.[0]?.suggestedText;
        if (finalText) {
            if (!useStreaming || finalText.length > streamedLength) {
                this.onStreamChunk?.(finalText);
            }
        }

        return parsed;
    }

    /**
     * Inserts new content into the document.
     * @param query - Natural language query for content generation
     * @returns Result with inserted content location
     */
    async insertContent(query: string): Promise<Result> {
        if (!validateInput(query, 'query')) {
            throw new Error('Query cannot be empty');
        }

        if (!this.adapter) {
            return {success: false, results: []};
        }

        const documentContext = this.getDocumentContext();
        const prompt = buildInsertContentPrompt(query, documentContext);

        const useStreaming = this.streamPreference !== false;
        let streamingInsertedLength = 0;
        const response = await this.runCompletion([
            {
                role: 'system',
                content: SYSTEM_PROMPTS.CONTENT_GENERATION
            },
            {role: 'user', content: prompt},
        ], useStreaming, async (aggregated) => {
            const extraction = extractSuggestedText(aggregated);
            if (!extraction?.available) {
                return false;
            }

            this.onStreamChunk?.(extraction.text);

            if (extraction.text.length > streamingInsertedLength) {
                const delta = extraction.text.slice(streamingInsertedLength);
                streamingInsertedLength = extraction.text.length;
                if (delta) {
                    await this.adapter.insertText(delta);
                }
            }
            return true;
        });

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results) {
            return {success: false, results: []};
        }

        try {
            const suggestedResult = result.results[0];
            if (!suggestedResult || !suggestedResult.suggestedText) {
                return {success: false, results: []};
            }
            if (useStreaming) {
                const decoded = suggestedResult.suggestedText;
                if (streamingInsertedLength < decoded.length) {
                    await this.adapter.insertText(decoded.slice(streamingInsertedLength));
                }
                this.onStreamChunk?.(decoded);
            } else {
                await this.adapter.insertText(suggestedResult.suggestedText);
                this.onStreamChunk?.(suggestedResult.suggestedText);
            }

            return {
                success: true,
                results: [suggestedResult],
            };
        } catch (error) {
            if (this.enableLogging) {
                console.error(`Failed to insert: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    }

    private async runCompletion(
        messages: AIMessage[],
        stream: boolean = false,
        onStreamProgress?: (aggregated: string, chunk: string) => Promise<boolean | void> | boolean | void,
    ): Promise<string> {
        if (!stream) {
            return this.provider.getCompletion(messages);
        }

        let aggregated = '';
        let streamed = false;

        try {
            const completionStream = this.provider.streamCompletion(messages);
            for await (const chunk of completionStream) {
                streamed = true;
                if (!chunk) {
                    continue;
                }
                aggregated += chunk;
                let handled = false;
                if (onStreamProgress) {
                    handled = Boolean(await onStreamProgress(aggregated, chunk));
                }
                if (!handled) {
                    this.onStreamChunk?.(aggregated);
                }
            }
        } catch (error) {
            if (!aggregated) {
                // No progress, fallback to non-streaming completion so callers still get a response.
                return this.provider.getCompletion(messages);
            }
            throw error;
        }

        if (!streamed || !aggregated) {
            return this.provider.getCompletion(messages);
        }

        const trimmed = aggregated.trim();
        if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
            return this.provider.getCompletion(messages);
        }

        return aggregated;
    }
}

type SuggestedTextExtraction = {
    text: string;
    complete: boolean;
    available: boolean;
};

function extractSuggestedText(payload: string): SuggestedTextExtraction | null {
    const key = '"suggestedText"';
    const keyIndex = payload.lastIndexOf(key);

    if (keyIndex === -1) {
        return null;
    }

    let cursor = keyIndex + key.length;
    let colonFound = false;

    while (cursor < payload.length) {
        const char = payload[cursor];
        if (char === ':') {
            colonFound = true;
            cursor++;
            break;
        }
        if (!isWhitespace(char)) {
            return {text: '', complete: false, available: false};
        }
        cursor++;
    }

    if (!colonFound) {
        return {text: '', complete: false, available: false};
    }

    while (cursor < payload.length && isWhitespace(payload[cursor])) {
        cursor++;
    }

    if (cursor >= payload.length) {
        return {text: '', complete: false, available: false};
    }

    if (payload[cursor] !== '"') {
        return {text: '', complete: false, available: false};
    }

    cursor++; // skip opening quote

    let result = '';
    let escape = false;
    let complete = false;
    let index = cursor;

    while (index < payload.length) {
        const char = payload[index];

        if (escape) {
            if (char === 'n') {
                result += '\n';
                index++;
            } else if (char === 'r') {
                result += '\r';
                index++;
            } else if (char === 't') {
                result += '\t';
                index++;
            } else if (char === '"') {
                result += '"';
                index++;
            } else if (char === '\\') {
                result += '\\';
                index++;
            } else if (char === 'u') {
                const hex = payload.slice(index + 1, index + 5);
                if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) {
                    return {text: result, complete: false, available: true};
                }
                result += String.fromCharCode(parseInt(hex, 16));
                index += 5;
            } else {
                result += char;
                index++;
            }
            escape = false;
            continue;
        }

        if (char === '\\') {
            escape = true;
            index++;
            continue;
        }

        if (char === '"') {
            complete = true;
            break;
        }

        result += char;
        index++;
    }

    if (escape) {
        return {text: result, complete: false, available: true};
    }

    return {
        text: result,
        complete,
        available: true,
    };
}

function isWhitespace(char: string): boolean {
    return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}
