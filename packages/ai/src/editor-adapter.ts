import type {
  ContextBlock,
  ContextScope,
  ContextWindow,
  Editor,
  FoundMatch,
  MarkType,
  SelectionContext,
} from './types';
import { generateId } from './utils';
import { TextSelection } from 'prosemirror-state';

type TemplateNode = {
    marks: MarkType[];
    length: number;
};

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
            type: 'paragraph',
            content: [{
              type: 'text',
              text: suggestedText,
              marks: marks.map((mark: MarkType) => ({
                type: mark.type.name,
                attrs: mark.attrs,
              })),
            }],
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


  getContextWindow(paddingBlocks: number = 1, scopeOverride?: ContextScope): ContextWindow {
    const state = this.editor?.state;
    const doc = state?.doc;

    if (!state || !doc) {
      return {
        scope: 'document',
        primaryText: '',
      };
    }

    const selection = state.selection;
    const blocks = this.collectBlocks();
    const selectionInfo = this.buildSelectionContext(blocks, paddingBlocks);
    const documentText = doc.textContent?.trim() ?? '';

    const hasSelection = Boolean(selection && !selection.empty && selectionInfo?.text !== undefined);
    const derivedPrimaryText = hasSelection
      ? (selectionInfo?.text ?? '')
      : (selectionInfo?.block?.text ?? documentText);
    const primaryText = scopeOverride === 'document' ? documentText : derivedPrimaryText;

    const scope: ContextScope = scopeOverride
      ? scopeOverride
      : hasSelection
        ? 'selection'
        : selectionInfo?.block
          ? 'block'
          : 'document';

    const metadata: Record<string, unknown> = {
      documentId: (this.editor.options as any)?.documentId,
    };

    return {
      scope,
      primaryText: primaryText ?? '',
      selection: scopeOverride === 'document' ? undefined : (selectionInfo ?? undefined),
      documentStats: {
        wordCount: documentText ? documentText.split(/\s+/).filter(Boolean).length : 0,
        charCount: documentText.length,
      },
      metadata,
    };
  }

  private collectBlocks(): ContextBlock[] {
    const {doc} = this.editor.state;
    const blocks: ContextBlock[] = [];
    doc.descendants((node: any, pos: any) => {
      if (!node.isBlock) {
        return true;
      }

      const text = node.textContent?.trim() ?? '';

      blocks.push({
        type: node.type.name,
        text,
        from: pos,
        to: pos + node.nodeSize,
        attrs: node.attrs,
        headingLevel: typeof node.attrs?.level === 'number' ? node.attrs.level : undefined,
        title: typeof node.attrs?.title === 'string' ? node.attrs.title : undefined,
      });

      return true;
    });

    return blocks;
  }

  private buildSelectionContext(
    blocks: ContextBlock[],
    paddingBlocks: number
  ): SelectionContext | null {
    if (!this.editor.state?.selection) {
      return null;
    }

  const selection = this.editor.state.selection;
  const doc = this.editor.state.doc;
  const text =
      selection && !selection.empty ? doc.textBetween(selection.from, selection.to, '\n\n', '\n\n') : '';

    const blockIndex = this.findBlockIndex(blocks, selection.from);
    const block = blockIndex >= 0 ? blocks[blockIndex] : undefined;
    const surroundingBlocks = blockIndex >= 0 ? this.getNeighborBlocks(blocks, blockIndex, paddingBlocks) : [];
    const activeMarks = (this.editor.commands.getSelectionMarks?.() as MarkType[]) || [];

    const metadata: Record<string, unknown> = {};
    if (block?.title) {
      metadata.clauseTitle = block.title;
    }
    if (typeof block?.headingLevel === 'number') {
      metadata.headingLevel = block.headingLevel;
    }

    if (!text && !block) {
      return null;
    }

    return {
      from: selection.from,
      to: selection.to,
      text,
      normalizedText: text?.trim?.(),
      block,
      surroundingBlocks,
      activeMarks: activeMarks.map((mark) => ({
        type: mark.type.name,
        attrs: mark.attrs,
      })),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    };
  }

  private findBlockIndex(blocks: ContextBlock[], position: number): number {
    return blocks.findIndex((block) => position >= block.from && position < block.to);
  }

  private getNeighborBlocks(blocks: ContextBlock[], index: number, paddingBlocks: number): ContextBlock[] {
    if (index < 0) {
      return [];
    }

    const neighbors: ContextBlock[] = [];
    for (let i = Math.max(0, index - paddingBlocks); i <= Math.min(blocks.length - 1, index + paddingBlocks); i++) {
      if (i === index) {
        continue;
      }

      neighbors.push(blocks[i]);
    }

    return neighbors;
  }
}
