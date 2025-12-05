/**
 * Helper functions for editor operations
 * Shared utilities for working with ProseMirror editors
 * @module editor-helpers
 */

import type {Editor} from '../shared';
import {safeTextBetween, LOG_PREFIXES} from '../shared';

/**
 * Result of extracting selection from editor
 */
export interface SelectionExtractionResult {
    text: string;
    from: number;
    to: number;
    isEmpty: boolean;
}

/**
 * Extracts the current selection text from the editor
 * @param editor - Editor instance
 * @param enableLogging - Whether to log warnings on errors
 * @returns Extracted selection text or empty string
 */
export function extractSelectionText(editor: Editor | null, enableLogging = false): string {
    if (!editor || !editor.view?.state) {
        return '';
    }

    const {state} = editor.view;
    const {selection, doc} = state;
    
    if (!doc || !selection || selection.empty) {
        return '';
    }

    try {
        return safeTextBetween(doc, selection.from, selection.to);
    } catch (error) {
        if (enableLogging) {
            console.warn(`${LOG_PREFIXES.SERVICE} Failed to extract selection:`, error);
        }
        return '';
    }
}

/**
 * Extracts detailed selection information from the editor
 * @param editor - Editor instance
 * @param enableLogging - Whether to log warnings on errors
 * @returns Selection extraction result with position info
 */
export function extractSelection(editor: Editor | null, enableLogging = false): SelectionExtractionResult {
    const emptyResult: SelectionExtractionResult = {
        text: '',
        from: 0,
        to: 0,
        isEmpty: true,
    };

    if (!editor || !editor.view?.state) {
        return emptyResult;
    }

    const {state} = editor.view;
    const {selection, doc} = state;
    
    if (!doc || !selection) {
        return emptyResult;
    }

    if (selection.empty) {
        return {
            ...emptyResult,
            from: selection.from,
            to: selection.to,
        };
    }

    try {
        const text = safeTextBetween(doc, selection.from, selection.to);
        return {
            text,
            from: selection.from,
            to: selection.to,
            isEmpty: text.length === 0,
        };
    } catch (error) {
        if (enableLogging) {
            console.warn(`${LOG_PREFIXES.SERVICE} Failed to extract selection:`, error);
        }
        return emptyResult;
    }
}

/**
 * Gets the full document text content from the editor
 * @param editor - Editor instance
 * @param enableLogging - Whether to log warnings on errors
 * @returns Document text content or empty string
 */
export function getDocumentText(editor: Editor | null, enableLogging = false): string {
    if (!editor) {
        return '';
    }

    try {
        const viewState = editor.view?.state ?? editor.state;
        const doc = viewState?.doc;
        return doc?.textContent?.trim() ?? '';
    } catch (error) {
        if (enableLogging) {
            console.warn(`${LOG_PREFIXES.SERVICE} Failed to get document text:`, error);
        }
        return '';
    }
}

/**
 * Gets document context with priority to selection over full document
 * @param editor - Editor instance
 * @param enableLogging - Whether to log warnings on errors
 * @returns Document context (selection if available, otherwise full document)
 */
export function getDocumentContext(editor: Editor | null, enableLogging = false): string {
    const selectionText = extractSelectionText(editor, enableLogging);
    if (selectionText) {
        return selectionText;
    }
    return getDocumentText(editor, enableLogging);
}

/**
 * Checks if the editor has an active selection
 * @param editor - Editor instance
 * @returns True if selection exists and is not empty
 */
export function hasSelection(editor: Editor | null): boolean {
    if (!editor || !editor.view?.state) {
        return false;
    }

    const {selection} = editor.view.state;
    return selection ? !selection.empty : false;
}



/**
 * Validates that an editor instance is ready for operations
 * @param editor - Editor instance to validate
 * @returns True if editor is ready, false otherwise
 */
export function isEditorReady(editor: Editor | null | undefined): editor is Editor {
    return Boolean(editor && (editor.view?.state || editor.state));
}

