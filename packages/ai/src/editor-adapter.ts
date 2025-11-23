import type { Editor, FoundMatch, MarkType } from './types';
import type { Node as ProseMirrorNode, Mark } from 'prosemirror-model';
import {generateId} from "./utils";
import { TextSelection } from 'prosemirror-state';

/**
 * Default highlight color for text selections.
 * Light blue (#6CA0DC) chosen for accessibility and contrast.
 */
const DEFAULT_HIGHLIGHT_COLOR = '#6CA0DC';

/**
 * Adapter for SuperDoc editor operations
 * Encapsulates all editor-specific API calls
 */
export class EditorAdapter {
    constructor(private editor: Editor) {}

    /**
     * Finds document positions for all search match results.
     * Maps abstract search results to concrete editor positions using the search command.
     *
     * @param results - Array of found matches with originalText to search for
     * @returns Array of matches enriched with position data, filtered to only matches with positions
     */
    findResults(results: FoundMatch[]): FoundMatch[] {
        if (!results?.length) {
            return [];
        }

        // Get current selection if it exists - access through view to ensure latest state
        const state = this.editor?.view?.state;
        const selection = state?.selection;
        const hasSelection = selection && !selection.empty && 
            typeof selection.from === 'number' && typeof selection.to === 'number';
        const selectionRange = hasSelection 
            ? { from: selection.from, to: selection.to }
            : null;

        return results
            .map((match) => {
                const text = match.originalText;
                const rawMatches = this.editor.commands?.search?.(text) ?? [];

                let positions = rawMatches
                    .map((match: { from?: number; to?: number}) => {
                        const from = match.from;
                        const to = match.to;
                        if (typeof from !== 'number' || typeof to !== 'number') {
                            return null;
                        }
                        return { from, to };
                    })
                    .filter((value: { from: number; to: number } | null) => value !== null);

                // Filter positions to only include matches within the selected range
                if (selectionRange) {
                    positions = positions.filter((pos: { from: number; to: number }) => {
                       return pos.from < selectionRange.to && pos.to > selectionRange.from;
                    });
                }

                return {
                    ...match,
                    positions,
                };
            })
            .filter((entry) => entry.positions.length > 0);
    }

    /**
     * Creates a highlight mark at the specified document range.
     * Automatically scrolls to bring the highlighted range into view.
     *
     * @param from - Start position of the highlight
     * @param to - End position of the highlight
     * @param inlineColor - Hex color for the highlight (default: #6CA0DC)
     */
    createHighlight(from: number, to: number, inlineColor: string = DEFAULT_HIGHLIGHT_COLOR): void {
        this.editor.chain().setTextSelection({ from, to }).setHighlight(inlineColor).run();
        this.scrollToPosition(from, to);
    }

    /**
     * Scrolls the editor view to bring a specific position range into view.
     *
     * @param from - Start position to scroll to
     * @param to - End position to scroll to
     */
    scrollToPosition(from: number, to: number): void {
        const { view } = this.editor;
        const domPos = view.domAtPos(from);
        domPos?.node?.scrollIntoView(true);

    }

    /**
     * Gets the current selection range from the editor state.
     *
     * @returns Selection range with from/to positions, or null if no valid state
     * @private
     */
    private getSelectionRange(): { from: number; to: number } | null {
        const { state } = this.editor;
        if (!state) {
            return null;
        }
        const { from, to } = state.selection;
        if (typeof from !== 'number' || typeof to !== 'number') {
            return null;
        }
        return { from, to };
    }

    /**
     * Collects text segments with their marks from a document range.
     * Handles text nodes that partially overlap with the specified range by computing
     * the intersection and extracting only the overlapping portion with its marks.
     *
     * @param from - Start position (validated against doc boundaries)
     * @param to - End position (validated against doc boundaries)
     * @returns Array of segments with length and marks, or empty array if invalid positions
     * @private
     */
    private collectTextSegments(from: number, to: number): Array<{length: number; marks: MarkType[]}> {
        const { state } = this.editor;
        const segments: Array<{length: number; marks: MarkType[]}> = [];

        if (!state?.doc) {
            return segments;
        }

        // Validate position boundaries
        const docSize = state.doc.content.size;
        if (from < 0 || to > docSize || from > to) {
            return segments;
        }

        state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
            if (!node.isText) {
                return true;
            }
            const textValue = typeof node.text === 'string' ? node.text : '';
            const nodeStart = Math.max(from, pos);
            const nodeEnd = Math.min(to, pos + node.nodeSize);
            const startOffset = Math.max(0, Math.min(textValue.length, nodeStart - pos));
            const endOffset = Math.max(0, Math.min(textValue.length, nodeEnd - pos));
            const overlapLength = Math.max(0, endOffset - startOffset);

            if (overlapLength === 0) {
                return true;
            }

            segments.push({
                length: overlapLength,
                marks: node.marks.map((mark: Mark) => mark) as MarkType[],
            });

            return true;
        });

        return segments;
    }

    /**
     * Gets the marks that should be applied at a specific position.
     * Checks stored marks first, then resolves marks from the document position.
     *
     * @param position - Document position to get marks from
     * @returns Array of marks at the position, or empty array if invalid position
     * @private
     */
    private getMarksAtPosition(position: number): MarkType[] {
        const { state } = this.editor;
        if (!state?.doc) {
            return [];
        }

        // Validate position boundaries
        const docSize = state.doc.content.size;
        if (position < 0 || position > docSize) {
            return [];
        }

        if (state.storedMarks) {
            return [...state.storedMarks];
        }

        const resolved = state.doc.resolve(position);
        return resolved.marks();
    }

    /**
     * Builds an array of ProseMirror text nodes with preserved marks.
     * Distributes the suggested text across segments, applying each segment's marks
     * to the corresponding portion of text. If text extends beyond segments, uses
     * the last segment's marks for the overflow.
     *
     * @param from - Original range start (used if segments not provided)
     * @param to - Original range end (used if segments not provided)
     * @param suggestedText - The text to split into marked nodes
     * @param segments - Optional pre-collected segments (will collect if not provided)
     * @returns Array of text nodes with marks applied
     * @private
     */
    private buildTextNodes(
        from: number,
        to: number,
        suggestedText: string,
        segments?: Array<{length: number; marks: MarkType[]}>,
    ): ProseMirrorNode[] {
        if (!suggestedText) {
            return [];
        }

        const { state } = this.editor;
        if (!state) {
            return [];
        }

        const resolvedSegments = segments ?? this.collectTextSegments(from, to);
        const schema = state.schema;

        if (!resolvedSegments.length) {
            return [schema.text(suggestedText, this.getMarksAtPosition(from))];
        }

        const nodes: ProseMirrorNode[] = [];
        let cursor = 0;

        for (const segment of resolvedSegments) {
            if (cursor >= suggestedText.length) {
                break;
            }

            const take = Math.min(segment.length, suggestedText.length - cursor);
            if (!take) {
                continue;
            }

            const textSegment = suggestedText.slice(cursor, cursor + take);
            nodes.push(schema.text(textSegment, segment.marks));
            cursor += take;
        }

        if (cursor < suggestedText.length) {
            const fallbackMarks = resolvedSegments[resolvedSegments.length - 1].marks;
            nodes.push(schema.text(suggestedText.slice(cursor), fallbackMarks));
        }

        return nodes;
    }

    /**
     * Maps a character offset within extracted text to the corresponding document position.
     * Handles node boundaries where character count doesn't equal position offset.
     *
     * @param from - Starting document position
     * @param to - Ending document position (exclusive)
     * @param charOffset - Number of characters to advance from the start
     * @returns Document position corresponding to the character offset
     * @private
     */
    private mapCharOffsetToPosition(from: number, to: number, charOffset: number): number {
        const { state } = this.editor;
        if (!state?.doc || charOffset <= 0) {
            return from;
        }
        if (from >= to) {
            return from;
        }

        const totalTextLength = state.doc.textBetween(from, to, '', '').length;
        if (totalTextLength <= 0) {
            return from;
        }

        const targetOffset = Math.min(charOffset, totalTextLength);
        const clampToEnd = targetOffset === totalTextLength;

        let low = from;
        let high = to;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const textLength = state.doc.textBetween(from, mid, '', '').length;
            
            if (textLength < targetOffset) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        let result = Math.min(low, to);

        if (clampToEnd && result > from) {
            let resolved = state.doc.resolve(result);
            let nodeBefore = resolved.nodeBefore;

            while (
                nodeBefore &&
                nodeBefore.isInline &&
                !nodeBefore.isText &&
                result > from
            ) {
                result -= nodeBefore.nodeSize;
                resolved = state.doc.resolve(result);
                nodeBefore = resolved.nodeBefore;
            }
        }

        return result;
    }

    /**
     * Computes the range of actual changes between original and suggested text.
     * Uses a diff algorithm to find common prefix and suffix, minimizing the
     * region that needs to be replaced in the document.
     *
     * @param original - Original text string
     * @param suggested - Suggested replacement text string
     * @returns Object with prefix length, suffix length, and whether any change exists
     * @private
     */
    private computeChangeRange(original: string, suggested: string): { prefix: number; suffix: number; hasChange: boolean } {
        const origLen = original.length;
        const suggLen = suggested.length;
        let prefix = 0;

        while (prefix < origLen && prefix < suggLen && original[prefix] === suggested[prefix]) {
            prefix++;
        }

        if (prefix === origLen && prefix === suggLen) {
            return { prefix, suffix: 0, hasChange: false };
        }

        let suffix = 0;
        while (
            suffix < origLen - prefix &&
            suffix < suggLen - prefix &&
            original[origLen - 1 - suffix] === suggested[suggLen - 1 - suffix]
        ) {
            suffix++;
        }

        return { prefix, suffix, hasChange: true };
    }

    /**
     * Applies a text replacement patch to the document.
     * Uses intelligent diffing to replace only the changed portion while preserving marks.
     * Validates position boundaries before making changes.
     *
     * @param from - Start position of the replacement range
     * @param to - End position of the replacement range
     * @param suggestedText - The text to insert
     * @private
     */
    private applyPatch(from: number, to: number, suggestedText: string): void {
        const { state, view } = this.editor;
        if (!state || !view) {
            return;
        }

        // Validate position boundaries
        const docSize = state.doc.content.size;
        if (from < 0 || to > docSize || from > to) {
            return;
        }

        const originalText = state.doc.textBetween(from, to, '', '');
        const { prefix, suffix, hasChange } = this.computeChangeRange(originalText, suggestedText);
        if (!hasChange) {
            return;
        }

        // Map character offsets to document positions (handles node boundaries correctly)
        const changeFrom = this.mapCharOffsetToPosition(from, to, prefix);
        const originalTextLength = originalText.length;
        const changeTo = this.mapCharOffsetToPosition(from, to, originalTextLength - suffix);
        
        const replacementEnd = suggestedText.length - suffix;
        const replacementText = suggestedText.slice(prefix, replacementEnd);

        const segments = this.collectTextSegments(changeFrom, changeTo);
        const nodes = this.buildTextNodes(changeFrom, changeTo, replacementText, segments);
        const tr = state.tr.delete(changeFrom, changeTo);
        let insertPos = changeFrom;
        for (const node of nodes) {
            tr.insert(insertPos, node);
            insertPos += node.nodeSize;
        }
        view.dispatch(tr);
    }

    /**
     * Replaces text in the document while intelligently preserving ProseMirror marks.
     * Uses a diffing algorithm to minimize document changes by only replacing changed portions.
     * Validates position boundaries and silently ignores invalid positions.
     *
     * @param from - Start position (must be >= 0 and < doc size)
     * @param to - End position (must be <= doc size and >= from)
     * @param suggestedText - The replacement text to insert
     */
    replaceText(from: number, to: number, suggestedText: string): void {
        this.applyPatch(from, to, suggestedText);
    }

    /**
     * Creates a tracked change for the specified replacement.
     * Temporarily enables track changes mode, applies the replacement, then disables tracking.
     *
     * @param from - Start position of the change
     * @param to - End position of the change
     * @param suggestedText - The suggested replacement text
     * @returns Generated ID for the tracked change
     */
    createTrackedChange(
        from: number,
        to: number,
        suggestedText: string,
    ): string {
        const changeId = generateId('tracked-change');
        this.editor.commands.enableTrackChanges();
        this.applyPatch(from, to, suggestedText);
        this.editor.commands.disableTrackChanges();
        return changeId;
    }

    /**
     * Creates a comment at the specified document range.
     * Enables track changes during comment insertion to maintain editing context.
     *
     * @param from - Start position of the comment anchor
     * @param to - End position of the comment anchor
     * @param text - The comment text content
     * @returns Promise resolving to the generated ID for the comment
     */
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

    /**
     * Inserts text at the current editor selection.
     * Preserves marks from the surrounding context at the insertion point.
     *
     * @param suggestedText - The text to insert
     */
    insertText(suggestedText: string): void {
        const position = this.getSelectionRange();
        if (!position) {
            return;
        }

        this.applyPatch(position.from, position.to, suggestedText);
    }
}
