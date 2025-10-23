import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIActions } from './ai-actions';
import type { AIProvider, Editor, AIUser } from './types';

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

describe('AIActions', () => {
    let mockProvider: AIProvider;
    let mockEditor: Editor;
    let user: AIUser;
    let chainFn: ReturnType<typeof createChain>['chainFn'];
    let chainApi: ReturnType<typeof createChain>['chainApi'];

    beforeEach(() => {
        mockProvider = {
            async *streamCompletion() {
                yield 'test';
            },
            async getCompletion() {
                return JSON.stringify({ success: true, results: [] });
            }
        };

        mockEditor = {
            state: {
                doc: {
                    textContent: 'Sample document text for testing',
                    content: { size: 100 }
                }
            },
            exportDocx: vi.fn(),
            options: {
                documentId: 'doc-123',
                user: { name: 'Test User', image: '' }
            },
            commands: {
                search: vi.fn().mockReturnValue([]),
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
            chain: vi.fn(),
        } as any;
        const chain = createChain(mockEditor.commands);
        chainFn = chain.chainFn;
        chainApi = chain.chainApi;
        mockEditor.chain = chainFn;

        user = {
            displayName: 'AI Bot',
            profileUrl: 'https://example.com/avatar.png',
            userId: 'bot-123'
        };
    });

    describe('find', () => {
        it('should find first occurrence', async () => {
            const response = JSON.stringify({
                success: true,
                results: [
                    { originalText: 'Sample' },
                    { originalText: 'document' }
                ]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn()
                .mockReturnValueOnce([{ from: 0, to: 6 }])
                .mockReturnValueOnce([{ from: 7, to: 15 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.find('find sample');

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0].originalText).toBe('Sample');
        });

        it('should return empty result when no matches', async () => {
            mockProvider.getCompletion = vi.fn().mockResolvedValue(
                JSON.stringify({ success: false, results: [] })
            );

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.find('find nothing');

            expect(result.success).toBe(false);
            expect(result.results).toHaveLength(0);
        });

        it('should validate input query', async () => {
            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            
            await expect(actions.find('')).rejects.toThrow('Query cannot be empty');
            await expect(actions.find('   ')).rejects.toThrow('Query cannot be empty');
        });

        it('should return empty when no document context', async () => {
            const actions = new AIActions(mockProvider, mockEditor, '', false);
            const result = await actions.find('query');

            expect(result).toEqual({ success: false, results: [] });
        });
    });

    describe('findAll', () => {
        it('should find all occurrences', async () => {
            const response = JSON.stringify({
                success: true,
                results: [
                    { originalText: 'test' },
                    { originalText: 'test' },
                    { originalText: 'test' }
                ]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([
                { from: 0, to: 4 },
                { from: 10, to: 14 },
                { from: 20, to: 24 }
            ]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.findAll('find all test');

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(3);
        });
    });

    describe('highlight', () => {
        it('should highlight found content', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{ originalText: 'highlight me' }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 5, to: 17 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.highlight('highlight this');

            expect(result.success).toBe(true);
            expect(chainFn).toHaveBeenCalled();
            expect(chainApi.setTextSelection).toHaveBeenCalledWith({ from: 5, to: 17 });
            expect(chainApi.setHighlight).toHaveBeenCalledWith('#6CA0DC');
            expect(chainApi.run).toHaveBeenCalled();
        });

        it('should use custom color', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{ originalText: 'text' }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 4 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            await actions.highlight('highlight', '#FF0000');

            expect(chainApi.setHighlight).toHaveBeenCalledWith('#FF0000');
        });

        it('should return failure when no positions found', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{ originalText: 'text' }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.highlight('highlight');

            expect(result.success).toBe(false);
        });
    });

    describe('replace', () => {
        it('should replace single occurrence', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    originalText: 'old',
                    suggestedText: 'new'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 3 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.replace('replace old with new');

            expect(result.success).toBe(true);
            expect(mockEditor.commands.deleteSelection).toHaveBeenCalled();
        });

        it('should validate input', async () => {
            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            
            await expect(actions.replace('')).rejects.toThrow('Query cannot be empty');
        });
    });

    describe('replaceAll', () => {
        it('should replace all occurrences', async () => {
            const response = JSON.stringify({
                success: true,
                results: [
                    { originalText: 'old', suggestedText: 'new' },
                    { originalText: 'old', suggestedText: 'new' }
                ]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn()
                .mockReturnValueOnce([{ from: 0, to: 3 }])
                .mockReturnValueOnce([{ from: 10, to: 13 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.replaceAll('replace all old with new');

            expect(result.success).toBe(true);
        });
    });

    describe('insertTrackedChange', () => {
        it('should insert single tracked change', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    originalText: 'original',
                    suggestedText: 'modified'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 8 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertTrackedChange('suggest change');

            expect(result.success).toBe(true);
            expect(mockEditor.commands.enableTrackChanges).toHaveBeenCalled();
            expect(mockEditor.commands.disableTrackChanges).toHaveBeenCalled();
        });
    });

    describe('insertTrackedChanges', () => {
        it('should insert multiple tracked changes', async () => {
            const response = JSON.stringify({
                success: true,
                results: [
                    { originalText: 'first', suggestedText: 'modified1' },
                    { originalText: 'second', suggestedText: 'modified2' }
                ]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn()
                .mockReturnValueOnce([{ from: 0, to: 5 }])
                .mockReturnValueOnce([{ from: 10, to: 16 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertTrackedChanges('suggest multiple changes');

            expect(result.success).toBe(true);
        });
    });

    describe('insertComment', () => {
        it('should insert single comment', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    originalText: 'text',
                    suggestedText: 'comment content'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 4 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertComment('add comment');

            expect(result.success).toBe(true);
            expect(chainApi.insertComment).toHaveBeenCalledWith({
                commentText: 'comment content'
            });
        });
    });

    describe('insertComments', () => {
        it('should insert multiple comments', async () => {
            const response = JSON.stringify({
                success: true,
                results: [
                    { originalText: 'text1', suggestedText: 'comment1' },
                    { originalText: 'text2', suggestedText: 'comment2' }
                ]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn()
                .mockReturnValueOnce([{ from: 0, to: 5 }])
                .mockReturnValueOnce([{ from: 10, to: 15 }]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertComments('add multiple comments');

            expect(result.success).toBe(true);
        });
    });

    describe('summarize', () => {
        it('should generate summary', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    suggestedText: 'This is a summary of the document'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.summarize('summarize this document');

            expect(result.success).toBe(true);
            expect(result.results[0].suggestedText).toBe('This is a summary of the document');
        });

        it('should return failure when no document context', async () => {
            const actions = new AIActions(mockProvider, mockEditor, '', false);
            const result = await actions.summarize('summarize');

            expect(result).toEqual({ results: [], success: false });
        });
    });

    describe('insertContent', () => {
        it('should insert new content', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    suggestedText: 'New content to insert'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertContent('generate introduction');

            expect(result.success).toBe(true);
            expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
                100,
                expect.objectContaining({
                    type: 'text',
                    text: 'New content to insert'
                })
            );
        });

        it('should validate input', async () => {
            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            
            await expect(actions.insertContent('')).rejects.toThrow('Query cannot be empty');
        });

        it('should return failure when no editor', async () => {
            const actions = new AIActions(mockProvider, null, mockEditor.state.doc.textContent, false);
            const result = await actions.insertContent('insert content');

            expect(result).toEqual({ success: false, results: [] });
        });

        it('should return failure when AI returns no suggestions', async () => {
            const response = JSON.stringify({
                success: true,
                results: []
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.insertContent('insert content');

            expect(result).toEqual({ success: false, results: [] });
        });
    });

    describe('error handling', () => {
        it('should respect enableLogging flag', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            mockProvider.getCompletion = vi.fn().mockResolvedValue('invalid json');
            mockEditor.commands.search = vi.fn().mockReturnValue([{ from: 0, to: 4 }]);

            // Test with logging disabled
            const actions1 = new AIActions(mockProvider, mockEditor, 'context', false);
            const response1 = JSON.stringify({
                success: true,
                results: [{ originalText: 'test', suggestedText: 'new' }]
            });
            mockProvider.getCompletion = vi.fn().mockResolvedValue(response1);
            
            await actions1.replace('test');
            
            consoleSpy.mockRestore();
        });

        it('should handle missing positions gracefully', async () => {
            const response = JSON.stringify({
                success: true,
                results: [{
                    originalText: 'text',
                    suggestedText: 'replacement'
                }]
            });

            mockProvider.getCompletion = vi.fn().mockResolvedValue(response);
            mockEditor.commands.search = vi.fn().mockReturnValue([]);

            const actions = new AIActions(mockProvider, mockEditor, mockEditor.state.doc.textContent, false);
            const result = await actions.replace('replace text');

            expect(result.results).toHaveLength(0);
        });
    });
});
