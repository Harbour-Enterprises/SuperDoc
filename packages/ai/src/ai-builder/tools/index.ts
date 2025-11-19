export { readSelection } from './readSelection';
export { insertContent } from './insertContent';
export { replaceContent } from './replaceContent';

export type { InsertContentParams } from './insertContent';
export type { ReplaceContentParams } from './replaceContent';

import { readSelection } from './readSelection';
import { insertContent } from './insertContent';
import { replaceContent } from './replaceContent';
import type { SuperDocTool } from '../types';

/**
 * All available SuperDoc AI tools
 */
export const ALL_TOOLS: Record<string, SuperDocTool> = {
    readSelection,
    insertContent,
    replaceContent
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
