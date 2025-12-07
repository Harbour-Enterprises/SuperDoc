export { readSelection } from './readSelection';
export { readContent } from './readContent';
export { readRange } from './readRange';
export { readSection } from './readSection';
export { searchContent } from './searchContent';
export { searchDocument } from './searchDocument';
export { getContentSchema } from './getContentSchema';
export { getDocumentOutline } from './getDocumentOutline';
export { insertContent } from './insertContent';
export { replaceContent } from './replaceContent';
export { deleteContent } from './deleteContent';
export { setMark } from './setMark';
export { unsetMark } from './unsetMark';
export { updateNode } from './updateNode';

export type { InsertContentParams } from './insertContent';
export type { ReplaceContentParams } from './replaceContent';
export type { SearchMatch } from './searchDocument';
export { default as SearchDocumentParams } from './searchDocument'
export type { SetMarkParams } from './setMark';
export type { UnsetMarkParams } from './unsetMark';
export {default as ReadRangeParams} from './readRange'
export type { DeleteContentParams } from './deleteContent';
export type { UpdateNodeParams } from './updateNode';

import { readSelection } from './readSelection';
import { readContent } from './readContent';
import { readRange } from './readRange';
import { readSection } from './readSection';
import { searchContent } from './searchContent';
import { searchDocument } from './searchDocument';
import { getContentSchema } from './getContentSchema';
import { getDocumentOutline } from './getDocumentOutline';
import { insertContent } from './insertContent';
import { replaceContent } from './replaceContent';
import { deleteContent } from './deleteContent';
import { setMark } from './setMark';
import { unsetMark } from './unsetMark';
import { updateNode } from './updateNode';
import type { SuperDocTool } from '../types';

/**
 * All available SuperDoc AI tools
 */
export const ALL_TOOLS: Record<string, SuperDocTool> = {
    readSelection,
    readContent,
    readRange,
    readSection,
    searchContent,
    searchDocument,
    getContentSchema,
    getDocumentOutline,
    insertContent,
    replaceContent,
    deleteContent,
    setMark,
    unsetMark,
    updateNode
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
