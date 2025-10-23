import type {
    AIProvider,
    AIUser,
    Editor,
    Result,
    FoundMatch,
    DocumentPosition
} from './types';
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
        private user: AIUser,
        private documentContext: string,
        private enableLogging: boolean = false
    ) {
        this.adapter = new EditorAdapter(this.editor);
        //define the variables here
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

        if (!this.documentContext) {
            return {success: false, results: []};
        }

        const prompt = buildFindPrompt(query, this.documentContext, findAll);
        const response = await this.provider.getCompletion([
            {role: 'system', content: SYSTEM_PROMPTS.SEARCH},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results || !this.adapter) {
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

        if (!findResult.success || !this.adapter) {
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
        if (!this.documentContext || !this.adapter) {
            return [];
        }

        // Get AI query
        const prompt = buildReplacePrompt(query, this.documentContext, multiple);
        const response = await this.provider.getCompletion([
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

        // Find matches and execute operations
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
        if (!this.documentContext) {
            return {results: [], success: false};
        }
        const prompt = buildSummaryPrompt(query, this.documentContext);
        const response = await this.provider.getCompletion([
            {role: 'system', content: SYSTEM_PROMPTS.SUMMARY},
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
        if (!validateInput(query, 'query')) {
            throw new Error('Query cannot be empty');
        }

        if (!this.adapter) {
            return {success: false, results: []};
        }

        const prompt = buildInsertContentPrompt(query, this.documentContext);

        const response = await this.provider.getCompletion([
            {
                role: 'system',
                content: SYSTEM_PROMPTS.CONTENT_GENERATION
            },
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Result>(response, {success: false, results: []}, this.enableLogging);

        if (!result.success || !result.results || !this.adapter) {
            return {success: false, results: []};
        }

        try {
            const suggestedResult = result.results[0];
            if (!suggestedResult || !suggestedResult.suggestedText) {
                return {success: false, results: []};
            }
            await this.adapter.insertText(suggestedResult.suggestedText);

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
}