/**
 * Shared utility functions
 */
import {FoundMatch, type Result} from "./types";

export function validateInput(input: string, name: string): void {
    if (!input?.trim()) {
        throw new Error(`${name} cannot be empty`);
    }
}

/**
 * Parses JSON from a string, with robust handling of:
 *
 * @param response - String potentially containing JSON
 * @param fallback - Value to return if parsing fails
 * @param enableLogging - Whether to log parsing errors
 * @returns Parsed object or fallback value
 */
export function parseJSON<T>(response: string, fallback: T, enableLogging: boolean = false): T {
    try {
        let cleaned = response.trim();
        cleaned = removeMarkdownCodeBlocks(cleaned);
        return JSON.parse(cleaned) as T;
    } catch (error) {
        if (enableLogging) {
            console.error('[SuperDocAI] Failed to parse JSON:', {
                original: response,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        return fallback;
    }
}

/**
 * Removes markdown code block syntax from a string.
 *
 * @param text - Text potentially wrapped in code blocks
 * @returns Cleaned text without markdown syntax
 */
export function removeMarkdownCodeBlocks(text: string): string {
    const trimmed = text.trim();
    
    // Check for code block markers without regex for better performance and security
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
        // Find the end of the first line (language specifier)
        let startIndex = 3; // Length of '```'
        const firstNewline = trimmed.indexOf('\n', startIndex);
        
        if (firstNewline !== -1) {
            startIndex = firstNewline + 1;
        } else {
            // No newline after opening ```, look for language specifier
            const languageMatch = trimmed.substring(3).match(/^(?:json|javascript|typescript|js|ts)/);
            if (languageMatch) {
                startIndex = 3 + languageMatch[0].length;
            }
        }
        
        // Remove closing ```
        const endIndex = trimmed.lastIndexOf('```');
        if (endIndex > startIndex) {
            return trimmed.substring(startIndex, endIndex).trim();
        }
    }

    return text;
}

/**
 * Generates a unique ID with a prefix.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 * ```
 */
export function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


/**
 * Normalizes find and replace entries from AI response
 */
export function normalizeReplacements(response: Result): FoundMatch[] {
    const entries: FoundMatch[] = [];
    const seen = new Set<string>();

    const addEntry = (entry: unknown) => {
        if (!entry) return;
        let originalText: string | undefined;
        let suggestedText: string | undefined;
        if (Array.isArray(entry) && entry.length >= 2) {
            originalText = String(entry[0]).trim();
            suggestedText = String(entry[1]).trim();
        }
        else if (typeof entry === 'object') {
            const obj = entry as Record<string, unknown>;
            originalText = String(obj.originalText ?? obj.original_text ?? obj.text ?? obj.original ?? '').trim();
            suggestedText = String(obj.suggestedText ?? obj.suggested_text ?? obj.replacement ?? obj.suggested ?? '').trim();
        }
        if (!originalText || !suggestedText) return;
        const key = `${originalText}→${suggestedText}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ originalText, suggestedText });
    };
    const arrays = [response.results].filter(Array.isArray);
    arrays.forEach(arr => arr.forEach(addEntry));
    return entries;
}
