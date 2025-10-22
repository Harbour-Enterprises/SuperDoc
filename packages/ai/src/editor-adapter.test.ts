import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorAdapter } from './editor-adapter';
import type { EditorLike, AIUser, FoundMatch } from './types';

describe('EditorAdapter', () => {
    let mockEditor: EditorLike;

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
            }
        };
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

            const adapter = new EditorAdapter(mockEditor);
            const results = adapter.findResults(matches);

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

            const adapter = new EditorAdapter(mockEditor);
            const results = adapter.findResults(matches);

            expect(results).toHaveLength(1);
            expect(results[0].originalText).toBe('found');
        });

        it('should handle empty input', () => {
            const adapter = new EditorAdapter(mockEditor);
            expect(adapter.findResults([])).toEqual([]);
            expect(adapter.findResults(null as any)).toEqual([]);
            expect(adapter.findResults(undefined as any)).toEqual([]);
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

            const adapter = new EditorAdapter(mockEditor);
            const results = adapter.findResults(matches);

            expect(results[0].positions).toHaveLength(1);
            expect(results[0].positions![0]).toEqual({ from: 0, to: 4 });
        });

        it('should handle editor without search command', () => {
            const matches: FoundMatch[] = [
                { originalText: 'test', suggestedText: 'replacement' }
            ];

            mockEditor.commands = {} as any;

            const adapter = new EditorAdapter(mockEditor);
            const results = adapter.findResults(matches);

            expect(results).toEqual([]);
        });
    });

    describe('createHighlight', () => {
        it('should create highlight with default color', () => {
            const adapter = new EditorAdapter(mockEditor);
            adapter.createHighlight(0, 10);

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 0, to: 10 });
            expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('#6CA0DC');
        });

        it('should create highlight with custom color', () => {
            const adapter = new EditorAdapter(mockEditor);
            adapter.createHighlight(5, 15, '#FF0000');

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 15 });
            expect(mockEditor.commands.setHighlight).toHaveBeenCalledWith('#FF0000');
        });
    });

    describe('replaceText', () => {
        it('should replace text with marks preserved', async () => {
            const marks = [
                { type: { name: 'bold' }, attrs: {} },
                { type: { name: 'textStyle' }, attrs: { fontSize: '14pt' } }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            const adapter = new EditorAdapter(mockEditor);
            await adapter.replaceText(0, 5, 'hello');

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

            const adapter = new EditorAdapter(mockEditor);
            await adapter.replaceText(0, 5, 'hello');

            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith('hello');
        });
    });

    describe('createTrackedChange', () => {
        it('should create tracked change with author', async () => {
            const author: AIUser = {
                displayName: 'AI Bot',
                profileUrl: 'https://example.com/avatar.png',
                userId: 'bot-123'
            };

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            const adapter = new EditorAdapter(mockEditor);
            const changeId = await adapter.createTrackedChange(0, 5, 'old', 'new', author);

            expect(changeId).toMatch(/^tracked-change-/);
            expect(mockEditor.options.user.name).toBe('AI Bot');
            expect(mockEditor.options.user.image).toBe('https://example.com/avatar.png');
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.commands.disableTrackChanges).toHaveBeenCalled();
        });

        it('should preserve marks in tracked changes', async () => {
            const marks = [
                { type: { name: 'italic' }, attrs: {} }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            const author: AIUser = {
                displayName: 'AI Bot'
            };

            const adapter = new EditorAdapter(mockEditor);
            await adapter.createTrackedChange(0, 5, 'old', 'new', author);

            expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
                type: 'text',
                text: 'new',
                marks: [{ type: 'italic', attrs: {} }]
            });
        });

        it('should handle author as string', async () => {
            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            const adapter = new EditorAdapter(mockEditor);
            await adapter.createTrackedChange(0, 5, 'old', 'new', 'Simple Name' as any);

            expect(mockEditor.options.user.name).toBe('Simple Name');
            expect(mockEditor.options.user.image).toBe('');
        });
    });

    describe('createComment', () => {
        it('should create comment with text', async () => {
            const author: AIUser = {
                displayName: 'Reviewer'
            };

            const adapter = new EditorAdapter(mockEditor);
            const commentId = await adapter.createComment(0, 5, 'Please revise', author);

            expect(commentId).toMatch(/^comment-/);
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({ from: 0, to: 5 });
            expect(mockEditor.commands.insertComment).toHaveBeenCalledWith({
                commentText: 'Please revise'
            });
        });
    });

    describe('insertText', () => {
        it('should insert text at end of document', async () => {
            const marks = [
                { type: { name: 'textStyle' }, attrs: { fontFamily: 'Arial' } }
            ];

            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue(marks);

            const adapter = new EditorAdapter(mockEditor);
            await adapter.insertText('New content');

            const expectedPos = mockEditor.state.doc.content.size;
            const expectedFrom = expectedPos - 50;

            expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({
                from: expectedFrom,
                pos: expectedPos
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

        it('should handle empty marks when inserting', async () => {
            mockEditor.commands.getSelectionMarks = vi.fn().mockReturnValue([]);

            const adapter = new EditorAdapter(mockEditor);
            await adapter.insertText('Plain text');

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

