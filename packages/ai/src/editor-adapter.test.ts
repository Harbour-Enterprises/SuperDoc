import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorAdapter } from './editor-adapter';
import type { Editor, FoundMatch, MarkType } from './types';

const createChain = (commands?: any) => {
    const chainApi = {
        setTextSelection: vi.fn((args) => {
            commands?.setTextSelection?.(args);
            return chainApi;
        }),
        setHighlight: vi.fn((color) => {
            commands?.setHighlight?.(color);
            return chainApi;
        }),
        enableTrackChanges: vi.fn(() => {
            commands?.enableTrackChanges?.();
            return chainApi;
        }),
        deleteSelection: vi.fn(() => {
            commands?.deleteSelection?.();
            return chainApi;
        }),
        insertContent: vi.fn((content) => {
            commands?.insertContent?.(content);
            return chainApi;
        }),
        disableTrackChanges: vi.fn(() => {
            commands?.disableTrackChanges?.();
            return chainApi;
        }),
        insertComment: vi.fn((payload) => {
            commands?.insertComment?.(payload);
            return chainApi;
        }),
        run: vi.fn(() => true),
    };

    const chainFn = vi.fn(() => chainApi);

    return { chainFn, chainApi };
};

const schema = new Schema({
    nodes: {
        doc: { content: 'paragraph+' },
        paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' },
    },
    marks: {
        bold: {
            parseDOM: [],
            toDOM: () => ['strong', 0],
        },
        italic: {
            parseDOM: [],
            toDOM: () => ['em', 0],
        },
        textStyle: {
            attrs: {
                fontSize: { default: '12pt' },
            },
            parseDOM: [],
            toDOM: (mark) => ['span', mark.attrs],
        },
    },
});

const defaultSegments = [{ text: 'Sample document text' }];

const buildDocFromSegments = (segments: Array<{ text: string; marks?: MarkType[] }>) => {
    const inline = segments.map(({ text, marks }) => schema.text(text, marks ?? []));
    const paragraph = schema.node('paragraph', null, inline);
    return schema.node('doc', null, [paragraph]);
};

const createEditorState = (
    segments: Array<{ text: string; marks?: MarkType[] }>,
    selectionRange?: { from: number; to?: number },
) => {
    const doc = buildDocFromSegments(segments);
    const start = selectionRange?.from ?? 1;
    const defaultTo = doc.content.size - 1;
    const requestedTo = selectionRange?.to ?? defaultTo;
    const end = Math.max(start, Math.min(requestedTo, defaultTo));
    const selection = TextSelection.create(doc, start, end);
    return EditorState.create({
        schema,
        doc,
        selection,
    });
};

describe('EditorAdapter', () => {
    let mockEditor: Editor;
    let mockAdapter: EditorAdapter;
    let chainApi: ReturnType<typeof createChain>['chainApi'];
    let chainFn: ReturnType<typeof createChain>['chainFn'];

    const updateEditorState = (
        segments: Array<{ text: string; marks?: MarkType[] }>,
        selectionRange?: { from: number; to?: number },
    ) => {
        mockEditor.state = createEditorState(segments, selectionRange);
    };

    const getParagraphNodes = () => {
        if (!mockEditor.state?.doc) {
            return [];
        }

        const firstChild = mockEditor.state.doc.firstChild;
        if (!firstChild) {
            return [];
        }

        const nodes: Array<{ text: string; marks: string[] }> = [];
        firstChild.forEach((node) => {
            nodes.push({
                text: node.text ?? '',
                marks: node.marks.map((mark) => mark.type.name),
            });
        });
        return nodes;
    };

    beforeEach(() => {
        mockEditor = {
            state: createEditorState(defaultSegments),
            view: {
                dispatch: vi.fn((tr) => {
                    mockEditor.state = mockEditor.state.apply(tr);
                }),
            },
            exportDocx: vi.fn().mockResolvedValue({}),
            options: {
                documentId: 'doc-123',
                user: { name: 'Test User', image: '' },
            },
            commands: {
                search: vi.fn(),
                setTextSelection: vi.fn(),
                setHighlight: vi.fn(),
                deleteSelection: vi.fn(),
                insertContent: vi.fn(),
                getSelectionMarks: vi.fn().mockReturnValue([]),
                enableTrackChanges: vi.fn(),
                disableTrackChanges: vi.fn(),
                insertComment: vi.fn(),
                insertContentAt: vi.fn(),
            },
            setOptions: vi.fn(),
            chain: vi.fn(),
        } as any;
        const chain = createChain(mockEditor.commands);
        chainFn = chain.chainFn;
        chainApi = chain.chainApi;
        mockEditor.chain = chainFn;
        mockAdapter = new EditorAdapter(mockEditor);
    });

    describe('findResults', () => {
        it('should find positions for matching text', () => {
            const matches: FoundMatch[] = [
                { originalText: 'sample', suggestedText: 'example' }
            ];

            mockEditor.commands.search = vi.fn().mockReturnValue([
                { from: 0, to: 6 },
                { from: 10, to: 16 }
            ]);

            const results = mockAdapter.findResults(matches);

            expect(results).toHaveLength(1);
            expect(results[0].positions).toHaveLength(2);
            expect(results[0].positions![0]).toEqual({ from: 0, to: 6 });
            expect(results[0].positions![1]).toEqual({ from: 10, to: 16 });
        });

        it('should filter out matches without positions', () => {
            const matches: FoundMatch[] = [
                { originalText: 'found', suggestedText: 'replacement1' },
                { originalText: 'notfound', suggestedText: 'replacement2' }
            ];

            mockEditor.commands.search = vi.fn()
                .mockReturnValueOnce([{ from: 0, to: 5 }])
                .mockReturnValueOnce([]);

            const results = mockAdapter.findResults(matches);

            expect(results).toHaveLength(1);
            expect(results[0].originalText).toBe('found');
        });

        it('should handle empty input', () => {
            expect(mockAdapter.findResults([])).toEqual([]);
            expect(mockAdapter.findResults(null as any)).toEqual([]);
            expect(mockAdapter.findResults(undefined as any)).toEqual([]);
        });

        it('should filter invalid position objects', () => {
            const matches: FoundMatch[] = [
                { originalText: 'test', suggestedText: 'replacement' }
            ];

            mockEditor.commands.search = vi.fn().mockReturnValue([
                { from: 0, to: 4 },
                { from: 'invalid' as any, to: 10 },
                { from: 5, to: null as any },
                { notFrom: 0, notTo: 5 }
            ]);

            const results = mockAdapter.findResults(matches);

            expect(results[0].positions).toHaveLength(1);
            expect(results[0].positions![0]).toEqual({ from: 0, to: 4 });
        });

        it('should handle editor without search command', () => {
            const matches: FoundMatch[] = [
                { originalText: 'test', suggestedText: 'replacement' }
            ];

            const results = mockAdapter.findResults(matches);

            expect(results).toEqual([]);
        });
    });

    describe('createHighlight', () => {
        it('should create highlight with default color', () => {
            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.createHighlight(from, to);

            expect(chainFn).toHaveBeenCalledTimes(1);
            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from, to });
            expect(chainApi.setHighlight).toHaveBeenCalledWith('#6CA0DC');
            expect(chainApi.run).toHaveBeenCalled();
        });

        it('should create highlight with custom color', () => {
            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.createHighlight(from, to, '#FF0000');

            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from, to });
            expect(chainApi.setHighlight).toHaveBeenCalledWith('#FF0000');
            expect(chainApi.run).toHaveBeenCalled();
        });
    });

    describe('replaceText', () => {
        it('replaces text while preserving existing mark segments', () => {
            const boldMark = schema.marks.bold.create();
            const italicMark = schema.marks.italic.create();

            updateEditorState([
                { text: 'ab', marks: [boldMark] },
                { text: 'cd', marks: [italicMark] },
            ]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.replaceText(from, to, 'WXYZ');

            expect(mockEditor.state.doc.textContent).toBe('WXYZ');
            expect(getParagraphNodes()).toEqual([
                { text: 'WX', marks: ['bold'] },
                { text: 'YZ', marks: ['italic'] },
            ]);
        });

        it('extends text beyond the original range using the last segment marks', () => {
            const boldMark = schema.marks.bold.create();
            const italicMark = schema.marks.italic.create();

            updateEditorState([
                { text: 'ab', marks: [boldMark] },
                { text: 'cd', marks: [italicMark] },
            ]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.replaceText(from, to, 'WXYZHI');

            expect(mockEditor.state.doc.textContent).toBe('WXYZHI');
            expect(getParagraphNodes()).toEqual([
                { text: 'WX', marks: ['bold'] },
                { text: 'YZHI', marks: ['italic'] },
            ]);
        });

        it('handles very short replacement text (single character)', () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState([{ text: 'abcdef', marks: [boldMark] }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.replaceText(from, to, 'X');

            expect(mockEditor.state.doc.textContent).toBe('X');
            expect(getParagraphNodes()).toEqual([
                { text: 'X', marks: ['bold'] },
            ]);
        });

        it('handles very long replacement text', () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState([{ text: 'ab', marks: [boldMark] }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;
            const longText = 'X'.repeat(1000);

            mockAdapter.replaceText(from, to, longText);

            expect(mockEditor.state.doc.textContent).toBe(longText);
            expect(mockEditor.state.doc.textContent.length).toBe(1000);
        });

        it('handles empty replacement text (deletion)', () => {
            updateEditorState([{ text: 'abcdef' }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            mockAdapter.replaceText(from, to, '');

            expect(mockEditor.state.doc.textContent).toBe('');
        });

        it('safely handles invalid position boundaries (negative from)', () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const dispatchCallsBefore = mockEditor.view.dispatch.mock.calls.length;

            mockAdapter.replaceText(-5, 10, 'replacement');

            // Should not modify document when positions are invalid
            expect(mockEditor.state.doc.textContent).toBe(originalText);
            // Should not dispatch any transactions
            expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
        });

        it('safely handles invalid position boundaries (to exceeds doc size)', () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const docSize = mockEditor.state.doc.content.size;
            const dispatchCallsBefore = mockEditor.view.dispatch.mock.calls.length;

            mockAdapter.replaceText(1, docSize + 100, 'replacement');

            // Should not modify document when positions are invalid
            expect(mockEditor.state.doc.textContent).toBe(originalText);
            // Should not dispatch any transactions
            expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
        });

        it('safely handles invalid position boundaries (from > to)', () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const dispatchCallsBefore = mockEditor.view.dispatch.mock.calls.length;

            mockAdapter.replaceText(10, 5, 'replacement');

            // Should not modify document when positions are invalid
            expect(mockEditor.state.doc.textContent).toBe(originalText);
            // Should not dispatch any transactions
            expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
        });
    });

    describe('createTrackedChange', () => {
        it('enables track changes while applying the patch', () => {
            updateEditorState([{ text: 'original' }]);
            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            const changeId = mockAdapter.createTrackedChange(from, to, 'tracked');

            expect(changeId).toMatch(/^tracked-change-/);
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.commands.disableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.state.doc.textContent).toBe('tracked');
        });
    });

    describe('createComment', () => {
        it('should create comment with text', async () => {
            const commentId = await mockAdapter.createComment(0, 5, 'Please revise');

            expect(commentId).toMatch(/^comment-/);
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from: 0, to: 5 });
            expect(chainApi.insertComment).toHaveBeenCalledWith({
                commentText: 'Please revise'
            });
            expect(chainApi.run).toHaveBeenCalled();
            expect(mockEditor.commands.disableTrackChanges).toHaveBeenCalled();
        });
    });

    describe('insertText', () => {
        it('inserts text at the current selection', () => {
            const endPosition = buildDocFromSegments(defaultSegments).content.size - 1;
            updateEditorState(defaultSegments, { from: endPosition, to: endPosition });

            mockAdapter.insertText(' More content');

            expect(mockEditor.state.doc.textContent).toBe('Sample document text More content');
        });

        it('applies surrounding marks when inserting into marked text', () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState(
                [{ text: 'Boldtext', marks: [boldMark] }],
                { from: 3, to: 3 },
            );

            mockAdapter.insertText('INSERT');

            expect(mockEditor.state.doc.textContent).toContain('INSERT');
            const insertedNode = getParagraphNodes().find((node) => node.text.includes('INSERT'));
            expect(insertedNode).toBeDefined();
            expect(insertedNode?.marks).toEqual(['bold']);
        });
    });
});
