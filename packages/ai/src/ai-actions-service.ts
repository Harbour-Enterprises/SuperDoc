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
export class AIActionsService {
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
     *
     * @param query - Natural language description of content to find
     * @param findAll - Whether to find all occurrences or just the first
     * @returns Result with found locations enriched with editor positions
     * @throws Error if query is empty
     * @private
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
     * Automatically scrolls to bring the found text into view.
     *
     * @param query - Natural language description of content to find
     * @returns Result with found locations enriched with editor positions
     * @throws Error if query is empty
     */
    async find(query: string): Promise<Result> {
        const result = await this.executeFindQuery(query, false);

        if (result.success && result.results?.length) {
            result.results = [result.results[0]];
            
            // Scroll to the found text
            const firstMatch = result.results[0];
            if (firstMatch?.positions && firstMatch.positions.length > 0) {
                const { from, to } = firstMatch.positions[0];
                this.adapter.scrollToPosition(from, to);
            }
        }

        return result;
    }

    /**
     * Finds all occurrences of content matching the query.
     *
     * @param query - Natural language description of content to find
     * @returns Result with all found locations
     * @throws Error if query is empty
     */
    async findAll(query: string): Promise<Result> {
        return this.executeFindQuery(query, true);
    }


    /**
     * Finds and highlights content in the document.
     * Automatically scrolls to bring the highlighted content into view.
     *
     * @param query - Natural language description of content to highlight
     * @param color - Hex color for the highlight (default: #6CA0DC)
     * @returns Result with highlight ID if successful
     * @throws Error if query is empty or content not found
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
     * Fetches AI-generated replacements based on the query.
     *
     * @param query - Natural language query describing what to replace
     * @param multiple - Whether to find all occurrences or just the first
     * @returns Array of FoundMatch results from AI, or empty array if no context or results
     * @private
     */
    private async fetchAIReplacements(query: string, multiple: boolean): Promise<FoundMatch[]> {
        const documentContext = this.getDocumentContext();

        if (!documentContext) {
            return [];
        }

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

        return parsed.results || [];
    }

    /**
     * Executes a single operation on the first valid match found.
     * 
     * @param searchResults - Array of search results with positions
     * @param operationFn - Function to execute the specific operation
     * @returns Array with the processed result, or empty array if no valid result
     * @throws Error if operation execution fails
     * @private
     */
    private async executeSingleOperation(
        searchResults: FoundMatch[],
        operationFn: (adapter: EditorAdapter, position: DocumentPosition, replacement: FoundMatch) => Promise<string | void>
    ): Promise<FoundMatch[]> {
        const firstValidResult = searchResults.find(
            result => result.positions && result.positions.length > 0
        );

        if (!firstValidResult) {
            return [];
        }

        try {
            const position = firstValidResult.positions![0];
            await operationFn(this.adapter, position, firstValidResult);
            return [firstValidResult];
        } catch (error) {
            if (this.enableLogging) {
                console.error(`Failed to execute operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            throw error;
        }
    }

    /**
     * Collects all operations from search results into a flat array.
     * Creates immutable copies of positions to prevent mutation.
     * 
     * @param searchResults - Array of search results with positions
     * @returns Array of operations with positions and associated results
     * @private
     */
    private collectOperationsFromResults(
        searchResults: FoundMatch[]
    ): Array<{ position: DocumentPosition; result: FoundMatch }> {
        const allOperations: Array<{ position: DocumentPosition; result: FoundMatch }> = [];
        
        for (const result of searchResults) {
            if (!result.positions || !result.positions.length) {
                continue;
            }
            for (const position of result.positions) {
                allOperations.push({
                    position: { from: position.from, to: position.to }, 
                    result 
                });
            }
        }
        return allOperations;
    }

    /**
     * Checks if a position overlaps with any of the processed ranges.
     * 
     * @param position - Position to check for overlap
     * @param processedRanges - Array of already processed ranges
     * @returns True if position overlaps with any processed range
     * @private
     */
    private hasOverlap(
        position: DocumentPosition,
        processedRanges: Array<{ from: number; to: number }>
    ): boolean {
        return processedRanges.some(
            range => position.from < range.to && position.to > range.from
        );
    }

    /**
     * Executes multiple operations, handling overlaps and processing in reverse order.
     * Processes positions from end to beginning to prevent position drift.
     * 
     * @param allOperations - Array of all operations to process
     * @param operationFn - Function to execute the specific operation
     * @returns Array of successfully processed results
     * @throws Error if any operation execution fails
     * @private
     */
    private async executeMultipleOperations(
        allOperations: Array<{ position: DocumentPosition; result: FoundMatch }>,
        operationFn: (adapter: EditorAdapter, position: DocumentPosition, replacement: FoundMatch) => Promise<string | void>
    ): Promise<FoundMatch[]> {
        // Sort positions by 'from' in descending order (end to beginning)
        // This prevents position drift - earlier positions remain valid when processing from the end
        allOperations.sort((a, b) => b.position.from - a.position.from);

        const processedRanges: Array<{ from: number; to: number }> = [];
        const processedResults: FoundMatch[] = [];
        
        for (const { position, result } of allOperations) {
            try {
                // Check if this position overlaps with any already processed range
                if (this.hasOverlap(position, processedRanges)) {
                    continue;
                }
                
                await operationFn(this.adapter, { from: position.from, to: position.to }, result);
                processedRanges.push({ from: position.from, to: position.to });
                if (!processedResults.includes(result)) {
                    processedResults.push(result);
                }
            } catch (error) {
                if (this.enableLogging) {
                    console.error(`Failed to execute operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
                throw error;
            }
        }
        
        return processedResults;
    }

    /**
     * Core logic for all document operations (replace, tracked changes, comments).
     * Finds matching content and applies the operation function to each match.
     *
     * @param query - Natural language query to find content
     * @param multiple - Whether to apply to all occurrences or just the first
     * @param operationFn - Function to execute the specific operation on each match
     * @returns Array of matches with IDs of created items
     * @throws Error if query is empty
     * @private
     */
    private async executeOperation(
        query: string,
        multiple: boolean,
        operationFn: (adapter: EditorAdapter, position: DocumentPosition, replacement: FoundMatch) => Promise<string | void>
    ): Promise<FoundMatch[]> {
        const replacements = await this.fetchAIReplacements(query, multiple);

        if (!replacements.length) {
            return [];
        }
        const searchResults = this.adapter.findResults(replacements);
        
        if (!multiple) {
            return await this.executeSingleOperation(searchResults, operationFn);
        }
        
        const allOperations = this.collectOperationsFromResults(searchResults);
        
        if (!allOperations.length) {
            return [];
        }
        
        return await this.executeMultipleOperations(allOperations, operationFn);
    }


    /**
     * Finds and replaces the first occurrence of content with AI-generated alternative.
     * Uses intelligent mark preservation to maintain formatting.
     *
     * @param query - Natural language query describing what to replace and how
     * @returns Result with original and suggested text for the replacement
     * @throws Error if query is empty
     */
    async replace(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) => {
                adapter.replaceText(position.from, position.to, replacement?.suggestedText || '');
                return Promise.resolve();
            }
        );

        return {
            success: matches.length > 0,
            results: matches
        };
    }

    /**
     * Finds and replaces all occurrences with AI-generated alternatives.
     * Uses intelligent mark preservation to maintain formatting for each replacement.
     *
     * @param query - Natural language query describing what to replace and how
     * @returns Result with all replacements made
     * @throws Error if query is empty
     */
    async replaceAll(query: string): Promise<Result> {
        if (!validateInput(query, 'Query')) {
            throw new Error('Query cannot be empty');
        }

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) => {
                adapter.replaceText(position.from, position.to, replacement?.suggestedText || '');
                return Promise.resolve();
            }
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
            (adapter, position, replacement) => {
                const changeId = adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                );
                return Promise.resolve(changeId);
            }
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
            (adapter, position, replacement) => {
                const changeId = adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                );
                return Promise.resolve(changeId);
            }
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
        if (this.enableLogging) {
            console.log('[AIActions] AI request', {
                stream,
                messages,
            });
        }

        if (!stream) {
            const response = await this.provider.getCompletion(messages);
            if (this.enableLogging) {
                console.log('[AIActions] AI response', { stream: false, response });
            }
            return response;
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
                const fallbackResponse = await this.provider.getCompletion(messages);
                if (this.enableLogging) {
                    console.log('[AIActions] AI response', { stream: false, response: fallbackResponse });
                }
                return fallbackResponse;
            }
            throw error;
        }

        if (!streamed || !aggregated) {
            const fallbackResponse = await this.provider.getCompletion(messages);
            if (this.enableLogging) {
                console.log('[AIActions] AI response', { stream: false, response: fallbackResponse });
            }
            return fallbackResponse;
        }

        const trimmed = aggregated.trim();
        if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
            const fallbackResponse = await this.provider.getCompletion(messages);
            if (this.enableLogging) {
                console.log('[AIActions] AI response', { stream: false, response: fallbackResponse });
            }
            return fallbackResponse;
        }

        if (this.enableLogging) {
            console.log('[AIActions] AI response', { stream: true, response: aggregated });
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
