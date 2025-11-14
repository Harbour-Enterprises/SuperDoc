import type { Editor, FoundMatch, MarkType } from './types';
import {generateId} from "./utils";
import { TextSelection } from 'prosemirror-state';

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
                .filter((value: { from: number; to: number } | null) => value !== null);

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
        this.scrollToPosition(from, to);
    }

    // Scroll to position
    scrollToPosition(from: number, to: number): void {
        const { state, view } = this.editor;
        const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to)).scrollIntoView();
        view.dispatch(tr);
    }

    // Replace operations
    async replaceText(from: number, to: number, suggestedText: string): Promise<void> {
        this.editor.commands.setTextSelection({ from, to })
        const marks = this.editor.commands.getSelectionMarks() as MarkType[];
        this.editor.commands.deleteSelection();
        if (marks.length > 0) {
            this.editor.commands.insertContent({
                type: 'text',
                text: suggestedText,
                marks: marks.map((mark: MarkType) => ({
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
        this.editor.commands.enableTrackChanges();
        this.editor.commands.setTextSelection({ from, to });
        const marks = this.editor.commands.getSelectionMarks() as MarkType[];
        this.editor.commands.deleteSelection();
        if (marks.length > 0) {
            this.editor.commands.insertContent({
                type: 'text',
                text: suggestedText,
                marks: marks.map((mark: MarkType) => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                })),
            });
        } else {
            this.editor.commands.insertContent(suggestedText);
        }
        this.editor.commands.disableTrackChanges();
        return changeId;
    }

    // Comment operations
    async createComment(
        from: number,
        to: number,
        text: string,
    ): Promise<string> {
        const commentId = generateId('comment');
        this.editor.commands.enableTrackChanges();
        try {
            this.editor
                .chain()
                .setTextSelection({ from, to })
                .insertComment({
                    commentText: text,
                })
                .run();
        } finally {
            this.editor.commands.disableTrackChanges();
        }

        return commentId;
    }

    // Insert operations
    async insertText(suggestedText: string): Promise<void> {
        const marks = this.editor.commands.getSelectionMarks() as MarkType[];
        this.editor.commands.insertContent({
            type: 'text',
            text: suggestedText,
            marks: marks.map((mark: MarkType) => ({
                type: mark.type.name,
                attrs: mark.attrs,
            })),
        });
    }
}
