export { readSelection } from './readSelection';
export { insertContent } from './insertContent';
export { replaceContent } from './replaceContent';
export { searchDocument } from './searchDocument';

export type { InsertContentParams } from './insertContent';
export type { ReplaceContentParams } from './replaceContent';
export type { SearchDocumentParams, SearchMatch } from './searchDocument';

import { readSelection } from './readSelection';
import { insertContent } from './insertContent';
import { replaceContent } from './replaceContent';
import { searchDocument } from './searchDocument';
import type { SuperDocTool } from '../types';

/**
 * All available SuperDoc AI tools
 */
export const ALL_TOOLS: Record<string, SuperDocTool> = {
    readSelection,
    insertContent,
    replaceContent,
    searchDocument
};

/**
 * Get a tool by name
 */
export function getTool(name: string): SuperDocTool | undefined {
    return ALL_TOOLS[name];
}

/**
 * Get all tool names
 */
export function getToolNames(): string[] {
    return Object.keys(ALL_TOOLS);
}
