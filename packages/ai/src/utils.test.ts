import { describe, it, expect, vi } from 'vitest';
import {
    validateInput,
    parseJSON,
    removeMarkdownCodeBlocks,
    generateId,
    normalizeReplacements
} from './utils';
import type { Result } from './types';

describe('utils', () => {
    describe('validateInput', () => {
        it('should not throw for valid input', () => {
            expect(() => validateInput('valid input', 'Test')).not.toThrow();
        });

        it('should throw for empty string', () => {
            expect(() => validateInput('', 'Test')).toThrow('Test cannot be empty');
        });

        it('should throw for whitespace-only string', () => {
            expect(() => validateInput('   ', 'Query')).toThrow('Query cannot be empty');
        });

        it('should throw for null/undefined', () => {
            expect(() => validateInput(null as any, 'Input')).toThrow('Input cannot be empty');
            expect(() => validateInput(undefined as any, 'Input')).toThrow('Input cannot be empty');
        });
    });

    describe('parseJSON', () => {
        it('should parse valid JSON', () => {
            const json = '{"success": true, "results": []}';
            const result = parseJSON<Result>(json, { success: false, results: [] });
            expect(result).toEqual({ success: true, results: [] });
        });

        it('should remove markdown code blocks before parsing', () => {
            const json = '```json\n{"success": true, "results": []}\n```';
            const result = parseJSON<Result>(json, { success: false, results: [] });
            expect(result).toEqual({ success: true, results: [] });
        });

        it('should handle code blocks with different languages', () => {
            const jsonBlocks = [
                '```javascript\n{"success": true}\n```',
                '```typescript\n{"success": true}\n```',
                '```js\n{"success": true}\n```',
                '```ts\n{"success": true}\n```'
            ];

            jsonBlocks.forEach(block => {
                const result = parseJSON<{ success: boolean }>(block, { success: false });
                expect(result.success).toBe(true);
            });
        });

        it('should return fallback for invalid JSON', () => {
            const fallback = { success: false, results: [] };
            const result = parseJSON<Result>('not valid json', fallback);
            expect(result).toEqual(fallback);
        });

        it('should trim whitespace before parsing', () => {
            const json = '  \n  {"success": true, "results": []}  \n  ';
            const result = parseJSON<Result>(json, { success: false, results: [] });
            expect(result).toEqual({ success: true, results: [] });
        });

        it('should not log errors when logging is disabled', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            parseJSON('invalid', {}, false);
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should log errors when logging is enabled', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            parseJSON('invalid', {}, true);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('removeMarkdownCodeBlocks', () => {
        it('should remove json code blocks', () => {
            const input = '```json\ncontent\n```';
            expect(removeMarkdownCodeBlocks(input)).toBe('content');
        });

        it('should remove code blocks without language specifier', () => {
            const input = '```\ncontent\n```';
            expect(removeMarkdownCodeBlocks(input)).toBe('content');
        });

        it('should handle code blocks without newlines', () => {
            const input = '```json{"success":true}```';
            expect(removeMarkdownCodeBlocks(input)).toBe('{"success":true}');
        });

        it('should return original text if no code blocks', () => {
            const input = 'plain text';
            expect(removeMarkdownCodeBlocks(input)).toBe('plain text');
        });

        it('should handle multiline content in code blocks', () => {
            const input = '```json\n{\n  "success": true,\n  "data": "test"\n}\n```';
            const expected = '{\n  "success": true,\n  "data": "test"\n}';
            expect(removeMarkdownCodeBlocks(input)).toBe(expected);
        });
    });

    describe('generateId', () => {
        it('should generate ID with correct prefix', () => {
            const id = generateId('test');
            expect(id).toMatch(/^test-\d+-[a-z0-9]+$/);
        });

        it('should generate unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateId('test'));
            }
            expect(ids.size).toBe(100);
        });

        it('should work with different prefixes', () => {
            const prefixes = ['comment', 'tracked-change', 'highlight'];
            prefixes.forEach(prefix => {
                const id = generateId(prefix);
                expect(id).toMatch(new RegExp(`^${prefix}-`));
            });
        });
    });

    describe('normalizeReplacements', () => {
        it('should normalize array format replacements', () => {
            const response: Result = {
                success: true,
                results: [
                    { originalText: 'hello', suggestedText: 'hi' }
                ]
            };
            const normalized = normalizeReplacements(response);
            expect(normalized).toEqual([
                { originalText: 'hello', suggestedText: 'hi' }
            ]);
        });

        it('should handle object format with various property names', () => {
            const response = {
                success: true,
                results: [
                    { originalText: 'old1', suggestedText: 'new1' },
                    { original_text: 'old2', suggested_text: 'new2' },
                    { text: 'old3', replacement: 'new3' },
                    { original: 'old4', suggested: 'new4' }
                ]
            } as Result;
            const normalized = normalizeReplacements(response);
            expect(normalized).toHaveLength(4);
            expect(normalized.map(n => n.originalText)).toContain('old1');
            expect(normalized.map(n => n.suggestedText)).toContain('new1');
        });

        it('should trim whitespace from text', () => {
            const response: Result = {
                success: true,
                results: [
                    { originalText: '  hello  ', suggestedText: '  world  ' }
                ]
            };
            const normalized = normalizeReplacements(response);
            expect(normalized[0].originalText).toBe('hello');
            expect(normalized[0].suggestedText).toBe('world');
        });

        it('should remove duplicates', () => {
            const response: Result = {
                success: true,
                results: [
                    { originalText: 'hello', suggestedText: 'hi' },
                    { originalText: 'hello', suggestedText: 'hi' }
                ]
            };
            const normalized = normalizeReplacements(response);
            expect(normalized).toHaveLength(1);
        });

        it('should ignore entries without both original and suggested text', () => {
            const response: Result = {
                success: true,
                results: [
                    { originalText: 'hello', suggestedText: 'hi' },
                    { originalText: 'incomplete', suggestedText: '' },
                    { originalText: '', suggestedText: 'also incomplete' }
                ]
            };
            const normalized = normalizeReplacements(response);
            expect(normalized).toHaveLength(1);
            expect(normalized[0].originalText).toBe('hello');
        });

        it('should handle empty results', () => {
            const response: Result = {
                success: true,
                results: []
            };
            const normalized = normalizeReplacements(response);
            expect(normalized).toEqual([]);
        });

        it('should handle null/undefined entries', () => {
            const response: Result = {
                success: true,
                results: [null as any, undefined as any, { originalText: 'valid', suggestedText: 'text' }]
            };
            const normalized = normalizeReplacements(response);
            expect(normalized).toHaveLength(1);
        });
    });
});

