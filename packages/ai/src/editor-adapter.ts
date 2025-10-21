import type {
    AIUser,
    EditorLike,
    FoundMatch,
} from './types';
import {generateId} from "./utils";

/**
 * Adapter for SuperDoc editor operations
 * Encapsulates all editor-specific API calls
 */
export class EditorAdapter {
    constructor(private editor: EditorLike) {}

    // Search for string occurrences and resolve document positions
    findResults(results: Array<string>): FoundMatch[] {
        if (!results?.length) {
            return [];
        }

        return results
            .map((text) => {
                const rawMatches = this.editor.commands?.search?.(text) ?? [];

                const positions = rawMatches
                    .map((match: { from?: number; to?: number; start?: number; end?: number }) => {
                        const from = match.from ?? match.start;
                    const to = match.to ?? match.end;
                    if (typeof from !== 'number' || typeof to !== 'number') {
                        return null;
                    }
                    return { from, to };
                })
                .filter((value: any): value is { from: number; to: number } => value !== null);

                return {
                    text,
                    positions,
                };
            })
            .filter((entry) => entry.positions.length > 0);
    }

    // Highlight operations
    createHighlight(from: number, to: number, inlineColor: string = "#6CA0DC"): void {
        this.editor.commands.setTextSelection({ from, to })
        this.editor.commands.setHighlight(inlineColor);
    }

    // Replace operations
    async replaceText(from: number, to: number, newText: string): Promise<void> {
        this.editor.commands.setTextSelection({ from, to })
        const marks = this.editor.commands.getSelectionMarks();
        this.editor.commands.deleteSelection();
        if (marks.length > 0) {
            this.editor.commands.insertContent({
                type: 'text',
                text: newText,
                marks: marks.map((mark: any) => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                })),
            });
        } else {
            this.editor.commands.insertContent(newText);
        }
    }

    // Tracked change operations
    async createTrackedChange(
        from: number,
        to: number,
        oldText: string,
        newText: string,
        author: AIUser,
    ): Promise<string> {
        const changeId = generateId('tracked-change');
        this.editor.options.user = {
            name: author.display_name || author,
            image: author.profile_url || '',
        };

        this.editor.commands.setTextSelection({ from, to })
        const marks = this.editor.commands.getSelectionMarks();
        this.editor.commands.enableTrackChanges();
        this.editor.commands.deleteSelection();
        if (marks.length > 0) {
            this.editor.commands.insertContent({
                type: 'text',
                text: newText,
                marks: marks.map((mark: any) => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                })),
            });
        } else {
            this.editor.commands.insertContent(newText);
        }
        this.editor.commands.disableTrackChanges();
        return changeId;
    }

    // Comment operations
    async createComment(
        from: number,
        to: number,
        text: string,
        author: AIUser,
    ): Promise<string> {
        const commentId = generateId('comment');
        this.editor.commands.enableTrackChanges();
        this.editor.commands.setTextSelection({ from, to })
        this.editor.commands.insertComment({
            commentText: text,
        });

        return commentId;
    }

    // Insert operations
    async insertText(newText: string): Promise<void> {
        this.editor.commands.insertContentAt(this.editor.state.doc.content.size, newText);
    }
}
