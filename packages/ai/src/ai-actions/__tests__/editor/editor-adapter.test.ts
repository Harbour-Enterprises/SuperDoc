import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorAdapter } from '../../editor/editor-adapter';
import type { Editor, FoundMatch, MarkType } from '../../../shared/types';

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
        focus: vi.fn(() => chainApi),
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
        inlineMarker: {
            inline: true,
            group: 'inline',
            atom: true,
            selectable: true,
            parseDOM: [{ tag: 'inline-marker' }],
            toDOM: () => ['inline-marker'],
        },
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
        const commands = {
            search: vi.fn(),
            setHighlight: vi.fn(),
            enableTrackChanges: vi.fn(),
            disableTrackChanges: vi.fn(),
            insertComment: vi.fn(),
            insertContentAt: vi.fn(),
        } as Record<string, any>;

        let editorState = createEditorState(defaultSegments);
        const view = {
            dispatch: vi.fn((tr) => {
                editorState = editorState.apply(tr);
            }),
            domAtPos: vi.fn((pos: number) => {
                return {
                    node: {
                        scrollIntoView: vi.fn(),
                    },
                    offset: 0,
                };
            }),
        };

        commands.setTextSelection = vi.fn(({ from, to }: { from: number; to: number }) => {
            const clampedFrom = Math.max(1, Math.min(from, editorState.doc.content.size - 1));
            const clampedTo = Math.max(clampedFrom, Math.min(to, editorState.doc.content.size - 1));
            const tr = editorState.tr.setSelection(TextSelection.create(editorState.doc, clampedFrom, clampedTo));
            view.dispatch(tr);
            return true;
        });

        commands.deleteSelection = vi.fn(() => {
            const tr = editorState.tr.deleteSelection();
            view.dispatch(tr);
            return true;
        });

        commands.insertContent = vi.fn((content: any) => {
            const normalized = Array.isArray(content) ? content : [content];
            normalized.forEach((node: any) => {
                const text = node?.text ?? (typeof node === 'string' ? node : '');
                const tr = editorState.tr.insertText(text);
                view.dispatch(tr);
            });
            return true;
        });

        commands.getSelectionMarks = vi.fn(() => editorState.selection.$from.marks());

        mockEditor = {
            get state() {
                return editorState;
            },
            set state(newState) {
                editorState = newState;
            },
            view,
            exportDocx: vi.fn().mockResolvedValue({}),
            options: {
                documentId: 'doc-123',
                user: { name: 'Test User', image: '' },
            },
            commands,
            setOptions: vi.fn(),
            chain: vi.fn(),
        } as any;
        const chain = createChain(mockEditor.commands);
        chainFn = chain.chainFn;
        chainApi = chain.chainApi;
        mockEditor.chain = chainFn;
        mockAdapter = new EditorAdapter(mockEditor, false);
    });

    describe('structured content insertion', () => {
        it.skip('normalizes doc wrappers before insertion', () => {
            const content = {
                type: 'doc',
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Structured' }],
                    },
                ],
            };

            const inserted = mockAdapter.insertStructuredContent(content);

            expect(inserted).toBe(true);
            expect(chainApi.setTextSelection).toHaveBeenCalled();
            expect(chainApi.insertContent).toHaveBeenCalledWith({
                type: 'paragraph',
                content: [{ type: 'text', text: 'Structured' }],
            });
        });

        it.skip('returns false for invalid structured payloads', () => {
            const inserted = mockAdapter.insertStructuredContent('');
            expect(inserted).toBe(false);
            expect(chainApi.insertContent).not.toHaveBeenCalled();
        });
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
            expect(mockEditor.commands.search).toHaveBeenCalledWith('sample', { highlight: false });
        });

        it('should allow highlighting when requested', () => {
            const matches: FoundMatch[] = [
                { originalText: 'sample', suggestedText: 'example' }
            ];

            mockEditor.commands.search = vi.fn().mockReturnValue([
                { from: 0, to: 6 }
            ]);

            mockAdapter.findResults(matches, { highlight: true });

            expect(mockEditor.commands.search).toHaveBeenCalledWith('sample', { highlight: true });
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
        it('replaces text while preserving existing mark segments', async () => {
            const boldMark = schema.marks.bold.create();
            const italicMark = schema.marks.italic.create();

            updateEditorState([
                { text: 'ab', marks: [boldMark] },
                { text: 'cd', marks: [italicMark] },
            ]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            await mockAdapter.replaceText(from, to, 'WXYZ');

            expect(mockEditor.state.doc.textContent).toBe('WXYZ');
            expect(getParagraphNodes()).toEqual([
                { text: 'WX', marks: ['bold'] },
                { text: 'YZ', marks: ['italic'] },
            ]);
        });

        it('extends text beyond the original range using the last segment marks', async () => {
            const boldMark = schema.marks.bold.create();
            const italicMark = schema.marks.italic.create();

            updateEditorState([
                { text: 'ab', marks: [boldMark] },
                { text: 'cd', marks: [italicMark] },
            ]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            await mockAdapter.replaceText(from, to, 'WXYZHI');

            expect(mockEditor.state.doc.textContent).toBe('WXYZHI');
            expect(getParagraphNodes()).toEqual([
                { text: 'WX', marks: ['bold'] },
                { text: 'YZHI', marks: ['italic'] },
            ]);
        });

        it('handles very short replacement text (single character)', async () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState([{ text: 'abcdef', marks: [boldMark] }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            await mockAdapter.replaceText(from, to, 'X');

            expect(mockEditor.state.doc.textContent).toBe('X');
            expect(getParagraphNodes()).toEqual([
                { text: 'X', marks: ['bold'] },
            ]);
        });

        it('handles very long replacement text', async () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState([{ text: 'ab', marks: [boldMark] }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;
            const longText = 'X'.repeat(1000);

            await mockAdapter.replaceText(from, to, longText);

            expect(mockEditor.state.doc.textContent).toBe(longText);
            expect(mockEditor.state.doc.textContent.length).toBe(1000);
        });

        it('handles empty replacement text (deletion)', async () => {
            updateEditorState([{ text: 'abcdef' }]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            await mockAdapter.replaceText(from, to, '');

            expect(mockEditor.state.doc.textContent).toBe('');
        });

        it('safely handles invalid position boundaries (negative from)', async () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const dispatchCallsBefore = (mockEditor.view?.dispatch as any)?.mock?.calls?.length ?? 0;

            await mockAdapter.replaceText(-5, 10, 'replacement');

            // Should not modify document when positions are invalid
            expect(mockEditor.state.doc.textContent).toBe(originalText);
            // Should not dispatch any transactions
            if (mockEditor.view?.dispatch) {
                expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
            }
        });

        it('safely handles invalid position boundaries (to exceeds doc size)', async () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const docSize = mockEditor.state.doc.content.size;
            const dispatchCallsBefore = (mockEditor.view?.dispatch as any)?.mock?.calls?.length ?? 0;

            await mockAdapter.replaceText(1, docSize + 100, 'replacement');

            expect(mockEditor.state.doc.textContent).toBe(originalText);
            if (mockEditor.view?.dispatch) {
                expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
            }
        });

        it('safely handles invalid position boundaries (from > to)', async () => {
            const originalText = 'Sample document text';
            updateEditorState([{ text: originalText }]);
            const dispatchCallsBefore = (mockEditor.view?.dispatch as any)?.mock?.calls?.length ?? 0;

            await mockAdapter.replaceText(10, 5, 'replacement');

            // Should not modify document when positions are invalid
            expect(mockEditor.state.doc.textContent).toBe(originalText);
            // Should not dispatch any transactions
            if (mockEditor.view?.dispatch) {
                expect(mockEditor.view.dispatch).toHaveBeenCalledTimes(dispatchCallsBefore);
            }
        });

        it('preserves zero-width inline nodes at the range boundary', async () => {
            updateEditorState([{ text: 'SERVICES' }]);

            const markerNode = schema.nodes.inlineMarker.create();
            const endPosition = mockEditor.state.doc.content.size - 1;
            const tr = mockEditor.state.tr.insert(endPosition, markerNode);
            mockEditor.view?.dispatch(tr);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1 - markerNode.nodeSize;

            await mockAdapter.replaceText(from, to, 'Services');

            expect(mockEditor.state.doc.textContent).toBe('Services');
            const paragraph = mockEditor.state.doc.firstChild;
            expect(paragraph?.lastChild?.type.name).toBe('inlineMarker');
        });
    });

    describe('createTrackedChange', () => {
        it('enables track changes while applying the patch', async () => {
            updateEditorState([{ text: 'original' }]);
            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;

            const changeId = await mockAdapter.createTrackedChange(from, to, 'tracked');

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

        it('inserts text before the selection when requested', () => {
            updateEditorState(defaultSegments, { from: 7, to: 11 });

            mockAdapter.insertText('Intro ', { position: 'before' });

            expect(mockEditor.state.doc.textContent.includes('Intro')).toBe(true);
        });

        it.skip('inserts text after the selection when requested', () => {
            updateEditorState(defaultSegments, { from: 0, to: 6 });

            mockAdapter.insertText(' summary', { position: 'after' });

            expect(mockEditor.state.doc.textContent.includes('summary document')).toBe(true);
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

    describe('replaceText with appended content', () => {
        it('handles appended text correctly (prefix equals original, suffix is 0)', () => {
            const boldMark = schema.marks.bold.create();
            updateEditorState([
                { text: 'original', marks: [boldMark] },
            ]);

            const from = 1;
            const to = mockEditor.state.doc.content.size - 1;
            const originalText = mockEditor.state.doc.textBetween(from, to, '', '');
            const suggestion = 'original appended text';

            mockAdapter.replaceText(from, to, suggestion);

            expect(mockEditor.state.doc.textContent).toBe('original appended text');
            expect(mockEditor.state.doc.textContent).toContain('appended text');
        });
    });
});
