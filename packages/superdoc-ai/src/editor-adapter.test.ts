import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorAdapter } from './editor-adapter';
import type { Editor, FoundMatch } from './types';

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

describe('EditorAdapter', () => {
    let mockEditor: Editor;
    let mockAdapter: EditorAdapter;
    let chainApi: ReturnType<typeof createChain>['chainApi'];
    let chainFn: ReturnType<typeof createChain>['chainFn'];

    beforeEach(() => {
        mockEditor = {
            state: {
                doc: {
                    textContent: 'Sample document text',
                    content: { size: 100 }
                }
            },
            exportDocx: vi.fn().mockResolvedValue({}),
            options: {
                documentId: 'doc-123',
                user: { name: 'Test User', image: '' }
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
                insertContentAt: vi.fn()
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
            mockAdapter.createHighlight(0, 10);

            expect(chainFn).toHaveBeenCalledTimes(1);
            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from: 0, to: 10 });
            expect(chainApi.setHighlight).toHaveBeenCalledWith('#6CA0DC');
            expect(chainApi.run).toHaveBeenCalled();
        });

        it('should create highlight with custom color', () => {
            mockAdapter.createHighlight(5, 15, '#FF0000');

            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 15 });
            expect(chainApi.setHighlight).toHaveBeenCalledWith('#FF0000');
            expect(chainApi.run).toHaveBeenCalled();
        });
    });

    describe('replaceText', () => {
        it('should replace text with marks preserved', async () => {
            const marks = [
                { type: { name: 'bold' }, attrs: {} },
                { type: { name: 'textStyle' }, attrs: { fontSize: '14pt' } }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            await mockAdapter.replaceText(0, 5, 'hello');

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 0, to: 5 });
            expect(mockEditor.commands.deleteSelection).toHaveBeenCalled();
            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
                type: 'text',
                text: 'hello',
                marks: [
                    { type: 'bold', attrs: {} },
                    { type: 'textStyle', attrs: { fontSize: '14pt' } }
                ]
            });
        });

        it('should replace text without marks when none exist', async () => {
            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            await mockAdapter.replaceText(0, 5, 'hello');

            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith('hello');
        });
    });

    describe('createTrackedChange', () => {
        it('should create tracked change with author', async () => {

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            const changeId = await mockAdapter.createTrackedChange(0, 5,  'new');

            expect(changeId).toMatch(/^tracked-change-/);
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.commands.disableTrackChanges).toHaveBeenCalled();
        });

        it('should preserve marks in tracked changes', async () => {
            const marks = [
                { type: { name: 'italic' }, attrs: {} }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            await mockAdapter.createTrackedChange(0, 5, 'new');

            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
                type: 'text',
                text: 'new',
                marks: [{ type: 'italic', attrs: {} }]
            });
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
        it('should insert text at end of document', async () => {
            const marks = [
                { type: { name: 'textStyle' }, attrs: { fontFamily: 'Arial' } }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            await mockAdapter.insertText('New content');

            const expectedPos = mockEditor.state.doc.content.size;
            const expectedFrom = Math.max(0, expectedPos - 50);

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({
                from: expectedFrom,
                to: expectedPos
            });

            expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
                expectedPos,
                {
                    type: 'text',
                    text: 'New content',
                    marks: [{ type: 'textStyle', attrs: { fontFamily: 'Arial' } }]
                }
            );
        });

        it('clamps selection start to zero when document is short', async () => {
            mockEditor.state.doc.content.size = 20;

            await mockAdapter.insertText('Short doc content');

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({
                from: 0,
                to: 20
            });
        });

        it('should handle empty marks when inserting', async () => {
            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            await mockAdapter.insertText('Plain text');

            expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
                expect.any(Number),
                {
                    type: 'text',
                    text: 'Plain text',
                    marks: []
                }
            );
        });
    });
});
