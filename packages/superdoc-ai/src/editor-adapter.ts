import type {
    Editor,
    FoundMatch,
} from './types';
import {generateId} from "./utils";

/**
 * Adapter for SuperDoc editor operations
 * Encapsulates all editor-specific API calls
 */
export class EditorAdapter {
    constructor(private editor: Editor) {}

    // Search for string occurrences and resolve document positions
    findResults(results: FoundMatch[]): FoundMatch[] {
        if (!results?.length) {
            return [];
        }

        return results
            .map((match) => {
                const text = match.originalText;
                const rawMatches = this.editor.commands?.search?.(text) ?? [];

                const positions = rawMatches
                    .map((match: { from?: number; to?: number}) => {
                        const from = match.from;
                        const to = match.to;
                        if (typeof from !== 'number' || typeof to !== 'number') {
                            return null;
                        }
                        return { from, to };
                    })
                .filter((value: any): value is { from: number; to: number } => value !== null);

                return {
                    ...match,
                    positions,
                };
            })
            .filter((entry) => entry.positions.length > 0);
    }

    // Highlight operations
    createHighlight(from: number, to: number, inlineColor: string = "#6CA0DC"): void {
        this.editor.chain().setTextSelection({ from, to }).setHighlight(inlineColor).run();
    }

    // Replace operations
    async replaceText(from: number, to: number, suggestedText: string): Promise<void> {
        this.editor.commands.setTextSelection({ from, to })
        const marks = this.editor.commands.getSelectionMarks();
        this.editor.commands.deleteSelection();
        if (marks.length > 0) {
            this.editor.commands.insertContent({
                type: 'text',
                text: suggestedText,
                marks: marks.map((mark: any) => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                })),
            });
        } else {
            this.editor.commands.insertContent(suggestedText);
        }
    }

    // Tracked change operations
    async createTrackedChange(
        from: number,
        to: number,
        suggestedText: string,
    ): Promise<string> {
        const changeId = generateId('tracked-change');
        this.editor.chain().enableTrackChanges().setTextSelection({ from, to }).run();
        const marks = this.editor.commands.getSelectionMarks();
        if (marks.length > 0) {
            this.editor.chain().deleteSelection().insertContent({
                type: 'text',
                text: suggestedText,
                marks: marks.map((mark: any) => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                })),
            }).run();
        } else {
            this.editor.chain().deleteSelection().insertContent(suggestedText).disableTrackChanges().run();
        }
        return changeId;
    }

    // Comment operations
    async createComment(
        from: number,
        to: number,
        text: string,
    ): Promise<string> {
        const commentId = generateId('comment');
        this.editor.chain().enableTrackChanges().setTextSelection({ from, to }).insertComment({
            commentText: text,
        }).run();

        return commentId;
    }

    // Insert operations
    async insertText(suggestedText: string): Promise<void> {
        const pos: number = this.editor.state.doc.content.size;
        const from: number = pos-50;
        this.editor.commands.setTextSelection({ from, pos });
        const marks = this.editor.commands.getSelectionMarks();
        this.editor.commands.insertContentAt(this.editor.state.doc.content.size, {
            type: 'text',
            text: suggestedText,
            marks: marks.map((mark: any) => ({
                type: mark.type.name,
                attrs: mark.attrs,
            })),
        });
    }
}
