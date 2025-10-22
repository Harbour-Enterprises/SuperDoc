import type {
    AIProvider,
    AIUser,
    EditorLike,
    Result,
    FoundMatch,
    DocumentPosition
} from './types';
import {EditorAdapter} from './editor-adapter';
import {validateInput, parseJSON, normalizeReplacements} from './utils';

/**
 * AI-powered document actions
 * All methods are pure - they receive dependencies and return results
 */
export class AIActions {
    constructor(
        private provider: AIProvider,
        private editor: EditorLike | null,
        private user: AIUser,
        private documentContext: string,
        private enableLogging: boolean = false
    ) {
    }


    /**
     * Executes a find query and resolves editor positions for matches.
     * @param query - Natural language description of content to find
     * @param findAll - Whether to find all occurrences or just the first
     * @returns Result with found locations enriched with editor positions
     */
    private async executeFindQuery(query: string, findAll: boolean): Promise<Result> {
        validateInput(query, 'Query');

        if (!this.documentContext) {
            return {success: false, results: []};
        }

        const prompt = this.buildFindPrompt(query, findAll);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document search assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results || !this.editor) {
            return result;
        }

        const adapter = new EditorAdapter(this.editor);
        result.results = adapter.findResults(result.results);

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

        if (!findResult.success || !this.editor) {
            return {...findResult, success: false};
        }

        try {
            const adapter = new EditorAdapter(this.editor);
            const firstMatch = findResult.results?.find((match) => match.positions
                && match.positions.length > 0);
            if (!firstMatch || !firstMatch.positions || !firstMatch.positions.length) {
                return {success: false, results: []};
            }

            adapter.createHighlight(firstMatch.positions[0].from, firstMatch.positions[0].to, color);
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
        if (!this.documentContext || !this.editor) {
            return [];
        }

        // Get AI query
        const prompt = this.buildReplacePrompt(query, multiple);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document editing assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const parsed = parseJSON<Result>(
            response,
            {success: false, results: []},
            this.enableLogging
        );

        const replacements = normalizeReplacements(parsed);

        if (!replacements.length) {
            return [];
        }

        // Find matches and execute operations
        const adapter = new EditorAdapter(this.editor);
        const searchResults = adapter.findResults(replacements);
        const match = searchResults?.[0];
        for (const result of searchResults) {
            try {
                if (!result.positions || !result.positions.length) {
                    return [];
                }
                await operationFn(adapter, result.positions[0], result);
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
        validateInput(query, 'query');

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
        validateInput(query, 'query');

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
        validateInput(query, 'query');

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                    this.user
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
        validateInput(query, 'query');

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                    this.user
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
        validateInput(query, 'query');

        const matches = await this.executeOperation(
            query,
            false,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                    this.user
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
        validateInput(query, 'query');

        const matches = await this.executeOperation(
            query,
            true,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.suggestedText || '',
                    this.user
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
        if (!this.documentContext) {
            return {results: [], success: false};
        }
        const prompt = this.buildSummaryPrompt(query);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document summarization assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        return parseJSON<Result>(
            response,
            {results: [], success: false},
            this.enableLogging
        );
    }

    /**
     * Inserts new content into the document.
     * @param query - Natural language query for content generation
     * @returns Result with inserted content location
     */
    async insertContent(query: string): Promise<Result> {
        validateInput(query, 'query');

        if (!this.editor) {
            return {success: false, results: []};
        }

        const prompt = `${query}
        ${this.documentContext ? `Current document:\n${this.documentContext}\n` : ''}
        Respond with JSON: { 
            "success": boolean, "results": [ { 
            "suggestedText": string,
            }
        ]`;

        const response = await this.provider.getCompletion([
            {
                role: 'system',
                content: 'You are a document content generation assistant. Always respond with valid JSON.'
            },
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results || !this.editor) {
            return {success: false, results: []};
        }

        try {
            const adapter = new EditorAdapter(this.editor);
            const suggestedResult = result.results[0];
            if (!suggestedResult || !suggestedResult.suggestedText) {
                return {success: false, results: []};
            }
            await adapter.insertText(suggestedResult.suggestedText);

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

    private buildFindPrompt(query: string, findAll: boolean): string {
        if (findAll) {
            return `apply this query: ${query} if find and replace query then Find the EXACT text of ALL occurrences of ${query}
            Document context:
            ${this.documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "originalText": string,
                }
              ]
            }`;
        }

        return `apply this query: ${query} if find and replace query then Find the EXACT text FIRST occurrence ONLY
            Document context:
            ${this.documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "originalText": string,
                }
              ]
            }`;
    }

    private buildReplacePrompt(query: string, replaceAll: boolean): string {
        const finalQuery = replaceAll
            ? `apply this query: ${query} if find and replace query then Find and replace the EXACT text of ALL occurrences`
            : `apply this query: ${query} if find and replace query then Find and replace the EXACT FIRST occurrence ONLY ${query}`;

        return `${finalQuery}
        Document context:
        ${this.documentContext}
        
        Respond with JSON:
        {
          "success": boolean,
          "results": [{
              "originalText": string,
              "suggestedText": string,
          }],
        }
        `;
    }

    private buildSummaryPrompt(query: string,): string {
        return `${query}
            Document context:
            ${this.documentContext}
            
            Respond with JSON:
            {
              "success": boolean,
              "results": [ { 
                  "suggestedText": string,
                }
              ]
            }`;
    }

}


