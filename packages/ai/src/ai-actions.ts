import type {
    AIProvider,
    AIUser,
    EditorLike,
    FindResult,
    FindAllResult,
    HighlightResult,
    ReplaceResult,
    ReplaceAllResult,
    TrackedChangeResult,
    TrackedChangesResult,
    CommentResult,
    CommentsResult,
    SummarizeResult,
    InsertContentResult, FoundMatch, ReplacementEntry, DocumentPosition,
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
     * Finds the first occurrence of content matching the query and resolves concrete positions via the editor adapter.
     * @param query - Natural language description of content to find
     * @returns Result with found locations enriched with editor positions
     */
    async find(query: string): Promise<FindResult> {
        validateInput(query, 'Query');

        if (!this.documentContext) {
            return {found: false, results: []};
        }

        const prompt = this.buildFindPrompt(query, false);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document search assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<FindResult>(response, {found: false, results: []}, this.enableLogging);

        if (!result.found || !result.results || !this.editor) {
            return result;
        }

        const adapter = new EditorAdapter(this.editor);
        const phrases = (result.results as Array<FoundMatch | string>).map((entry) =>
            typeof entry === 'string' ? entry : entry.text,
        );

        return {
            ...result,
            results: adapter.findResults(phrases.filter((text): text is string => Boolean(text))),
        };
    }

    /**
     * Finds all occurrences of content matching the query.
     * @param query - Natural language description of content to find
     * @returns Result with all found locations
     */
    async findAll(query: string): Promise<FindAllResult> {
        validateInput(query, 'Query');

        if (!this.documentContext) {
            return {found: false, results: []};
        }

        const prompt = this.buildFindPrompt(query, true);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document search assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<FindAllResult>(
            response,
            {found: false, results: []},
            this.enableLogging
        );

        if (!result.found || !result.results || !this.editor) {
            return result;
        }

        const adapter = new EditorAdapter(this.editor);
        return {
            ...result,
            results: adapter.findResults(
                (result.results as Array<FoundMatch | string>)
                    .map((entry) => (typeof entry === 'string' ? entry : entry.text))
                    .filter((text): text is string => Boolean(text)),
            ),
        };
    }


    /**
     * Finds and highlights content in the document.
     * @param query - Natural language description of content to highlight
     * @param color - highlight color
     * @returns Result with highlight ID if successful
     */
    async highlight(query: string, color: string = "#6CA0DC"): Promise<HighlightResult> {
        const findResult = await this.find(query);

        if (!findResult.found || !this.editor) {
            return {...findResult, highlighted: false};
        }

        try {
            const adapter = new EditorAdapter(this.editor);
            const firstMatch = findResult.results?.find((match) => match.positions.length > 0)?.positions[0];
            if (!firstMatch) {
                return {...findResult, highlighted: false};
            }

            adapter.createHighlight(firstMatch.from, firstMatch.to, color);
            return {...findResult, highlighted: true};
        } catch (error) {
            console.log(`Failed to highlight: ${error instanceof Error ? error.message : 'Unknown error'}`)
            return {
                ...findResult,
                highlighted: false,
            };
        }
    }

    /**
     * Finds and replaces content with AI-generated alternative.
     * @param instruction - Natural language instruction for replacement
     * @returns Result with old and new text
     */
    async replace(instruction: string): Promise<ReplaceResult> {
        validateInput(instruction, 'Instruction');

        if (!this.documentContext || !this.editor) {
            return {found: false, replaced: false, results: []};
        }

        const prompt = this.buildReplacePrompt(instruction, false);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document editing assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Record<string, unknown>>(
            response,
            {found: false, replaced: false, results: []},
            this.enableLogging
        );

        const replacements = normalizeReplacements(result);

        if (!replacements.length) {
            return {
                ...result,
                found: false,
                replaced: false,
                results: [],
            };
        }

        const adapter = new EditorAdapter(this.editor);

        for (const {oldText, newText} of replacements) {
            const matches = adapter.findResults([oldText]);
            const match = matches?.[0];
            const positions = match?.positions?.length ? [...match.positions].sort((a, b) => a.from - b.from) : [];

            if (!positions.length) {
                continue;
            }

            const targetPosition = positions[0];

            try {
                await adapter.replaceText(targetPosition.from, targetPosition.to, newText);

                return {
                    ...result,
                    found: true,
                    replaced: true,
                    oldText,
                    newText,
                    results: [{
                        text: match?.text ?? oldText,
                        positions: [targetPosition],
                        oldText,
                        newText,
                    }],
                };
            } catch (error) {
                console.log(`Found but failed to replace: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return {
                    ...result,
                    found: true,
                    replaced: false,
                    oldText,
                    newText,
                    results: [{
                        text: match?.text ?? oldText,
                        positions: [targetPosition],
                        oldText,
                        newText,
                    }],
                };
            }
        }

        return {
            ...result,
            found: false,
            replaced: false,
            results: [],
        };
    }

    /**
     * Finds and replaces all occurrences with AI-generated alternatives.
     * @param instruction - Natural language instruction for replacements
     * @returns Result with all replacements made
     */
    async replaceAll(instruction: string): Promise<ReplaceAllResult> {
        validateInput(instruction, 'Instruction');

        if (!this.documentContext || !this.editor) {
            return {
                found: false,
                replaced: false,
                replacements: [],
                results: [],
            };
        }

        const prompt = this.buildReplacePrompt(instruction, true);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document editing assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<Record<string, unknown>>(
            response,
            {
                found: false,
                replaced: false,
                replacements: [],
                results: [],
            },
            this.enableLogging
        );

        const replacements = normalizeReplacements(result);

        if (!replacements.length) {
            return {
                ...result,
                found: false,
                replaced: false,
                replacements: [],
                results: [],
            };
        }

        const adapter = new EditorAdapter(this.editor);
        const appliedReplacements: Array<{ oldText: string; newText: string }> = [];
        const appliedMatches: Array<FoundMatch> = [];

        try {
            for (const {oldText, newText} of replacements) {
                const matches = adapter.findResults([oldText]);
                const match = matches?.[0];
                const positionsAscending = match?.positions?.length
                    ? [...match.positions].sort((a, b) => a.from - b.from)
                    : [];

                if (!positionsAscending.length) {
                    continue;
                }

                const positionsForReplacement = [...positionsAscending].sort((a, b) => b.from - a.from);

                for (const position of positionsForReplacement) {
                    await adapter.replaceText(position.from, position.to, newText);
                }

                appliedReplacements.push({oldText, newText});
                appliedMatches.push({
                    text: match?.text ?? oldText,
                    positions: positionsAscending,
                    oldText,
                    newText,
                });
            }
        } catch (error) {
            console.log(`Found but failed to replace: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                ...result,
                found: appliedReplacements.length > 0,
                replaced: false,
                replacements: appliedReplacements,
                results: appliedMatches,
            };
        }

        const didReplace = appliedReplacements.length > 0;

        return {
            ...result,
            found: didReplace,
            replaced: didReplace,
            replacements: appliedReplacements,
            results: appliedMatches,
        };
    }

    /**
     * Core logic for applying changes (tracked changes or comments)
     */
    private async applyChanges(
        instruction: string,
        multiple: boolean,
        createFn: (adapter: EditorAdapter, position: DocumentPosition, replacement: ReplacementEntry) => Promise<string>
    ): Promise<{ matches: FoundMatch[]; ids: string[] }> {
        if (!this.documentContext || !this.editor) {
            return {matches: [], ids: []};
        }

        const prompt = this.buildReplacePrompt(instruction, multiple);
        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document editing assistant. Always respond with valid JSON.'},
            {role: 'user', content: prompt},
        ]);

        const parsed = parseJSON<Record<string, unknown>>(
            response,
            {found: false, results: []},
            this.enableLogging
        );

        const replacements = normalizeReplacements(parsed);
        if (!replacements.length) {
            return {matches: [], ids: []};
        }

        const adapter = new EditorAdapter(this.editor);
        const matches: FoundMatch[] = [];
        const ids: string[] = [];

        for (const replacement of replacements) {
            const searchResults = adapter.findResults([replacement.oldText]);
            const match = searchResults?.[0];
            const positions = match?.positions?.length
                ? [...match.positions].sort((a, b) => a.from - b.from)
                : [];

            if (!positions.length) continue;

            const targetPositions = multiple ? positions : [positions[0]];

            matches.push({
                text: match?.text ?? replacement.oldText,
                positions: targetPositions,
                oldText: replacement.oldText,
                newText: replacement.newText,
            });

            for (const position of targetPositions) {
                try {
                    const id = await createFn(adapter, position, replacement);
                    ids.push(id);
                } catch (error) {
                    console.error(`Failed to create change: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            if (!multiple) break;
        }

        return {matches, ids};
    }

    /**
     * Insert a single tracked change
     */
    async insertTrackedChange(instruction: string): Promise<TrackedChangeResult> {
        validateInput(instruction, 'Instruction');

        const timestamp = new Date().toISOString();
        const {matches, ids} = await this.applyChanges(
            instruction,
            false,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.oldText,
                    replacement.newText,
                    this.user
                )
        );

        return {
            found: ids.length > 0,
            results: matches,
            trackedChangeId: ids[0],
            author: this.user,
            timestamp,
        };
    }

    /**
     * Insert multiple tracked changes
     */
    async insertTrackedChanges(instruction: string): Promise<TrackedChangesResult> {
        validateInput(instruction, 'Instruction');

        const {matches, ids} = await this.applyChanges(
            instruction,
            true,
            (adapter, position, replacement) =>
                adapter.createTrackedChange(
                    position.from,
                    position.to,
                    replacement.oldText,
                    replacement.newText,
                    this.user
                )
        );

        return {
            found: ids.length > 0,
            results: matches,
            trackedChangeIds: ids,
            changes: ids.map(trackedChangeId => ({trackedChangeId, author: this.user})),
        };
    }

    /**
     * Insert a single comment
     */
    async insertComment(instruction: string): Promise<CommentResult> {
        validateInput(instruction, 'Instruction');

        const timestamp = new Date().toISOString();
        const {matches, ids} = await this.applyChanges(
            instruction,
            false,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.newText,
                    this.user
                )
        );

        return {
            found: ids.length > 0,
            results: matches,
            commentId: ids[0],
            author: this.user,
            commentText: matches[0]?.newText ?? '',
            timestamp,
        };
    }

    /**
     * Insert multiple comments
     */
    async insertComments(instruction: string): Promise<CommentsResult> {
        validateInput(instruction, 'Instruction');

        const {matches, ids} = await this.applyChanges(
            instruction,
            true,
            (adapter, position, replacement) =>
                adapter.createComment(
                    position.from,
                    position.to,
                    replacement.newText,
                    this.user
                )
        );

        return {
            found: ids.length > 0,
            results: matches,
            commentIds: ids,
            comments: matches.map((match, i) => ({
                commentId: ids[i],
                author: this.user,
                commentText: match.newText,
            })),
        };
    }

    /**
     * Generates a summary of the document.
     */
    async summarize(instruction: string): Promise<SummarizeResult> {
        if (!this.documentContext) {
            return {summary: 'No document context available', keyPoints: []};
        }

        const response = await this.provider.getCompletion([
            {role: 'system', content: 'You are a document summarization assistant. Always respond with valid JSON.'},
            {role: 'user', content: instruction},
        ]);

        return parseJSON<SummarizeResult>(
            response,
            {summary: 'Failed to generate summary', keyPoints: []},
            this.enableLogging
        );
    }

    /**
     * Inserts new content into the document.
     * @param instruction - Natural language instruction for content generation
     * @returns Result with inserted content location
     */
    async insertContent(instruction: string): Promise<InsertContentResult> {
        validateInput(instruction, 'Instruction');

        if (!this.editor) {
            return {inserted: false, insertedText: ''};
        }

        const prompt = `${instruction}
        ${this.documentContext ? `Current document:\n${this.documentContext}\n` : ''}
        
        Respond with JSON: { "inserted": boolean, "insertedText": string }`;

        const response = await this.provider.getCompletion([
            {
                role: 'system',
                content: 'You are a document content generation assistant. Always respond with valid JSON.'
            },
            {role: 'user', content: prompt},
        ]);

        const result = parseJSON<any>(response, {
            inserted: false,
            insertedText: ''
        }, this.enableLogging);

        if (!result.insertedText) {
            return {inserted: false, insertedText: ''};
        }

        try {
            const adapter = new EditorAdapter(this.editor);
            await adapter.insertText(result.insertedText);

            return {
                inserted: true,
                insertedText: result.insertedText,
            };
        } catch (error) {
            console.error(`Failed to insert: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                inserted: false,
                insertedText: '',
            };
        }
    }

    private buildFindPrompt(query: string, findAll: boolean): string {
        if (findAll) {
            return `Find the exact text of ALL occurrences of ${query}
            Document context:
            ${this.documentContext}
            
            Respond with JSON:
            {
              "found": boolean,
              "results": list<string>
            }`;
        }

        return `Find the exact text FIRST occurrence ONLY of ${query}
        
        Document context:
        ${this.documentContext}
        
        Respond with JSON:
        {
          "found": boolean,
          "results": list<string>
        }`;
    }

    private buildReplacePrompt(instruction: string, replaceAll: boolean): string {
        const finalInstruction = replaceAll
            ? `Find and replace the exact text of ALL occurrences ${instruction}`
            : `Find and replace the FIRST occurrence ONLY ${instruction}`;

        return `${finalInstruction}
        Document context:
        ${this.documentContext}
        
        Respond with JSON:
        {
          "found": boolean,
          "results": [
              "oldText": string,
              "newText": string,
          ],
        }
        `;
    }
}


