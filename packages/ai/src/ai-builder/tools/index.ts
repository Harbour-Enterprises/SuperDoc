export { readSelection } from './readSelection';
export { readContent } from './readContent';
export { searchContent } from './searchContent';
export { getContentSchema } from './getContentSchema';
export { insertContent } from './insertContent';
export { replaceContent } from './replaceContent';
export { getDocumentOutline } from './getDocumentOutline';
export { readSection } from './readSection';

export type { ReadSelectionParams } from './readSelection';
export type { ReadContentParams } from './readContent';
export type { SearchContentParams, SearchMatch } from './searchContent';
export type { InsertContentParams } from './insertContent';
export type { ReplaceContentParams } from './replaceContent';
export type { HeadingInfo } from './getDocumentOutline';
export type { ReadSectionParams } from './readSection';

import { readSelection } from './readSelection';
import { readContent } from './readContent';
import { searchContent } from './searchContent';
import { getContentSchema } from './getContentSchema';
import { insertContent } from './insertContent';
import { replaceContent } from './replaceContent';
import { getDocumentOutline } from './getDocumentOutline';
import { readSection } from './readSection';
import type { SuperDocTool } from '../types';

/**
 * All available SuperDoc AI tools
 */
export const ALL_TOOLS: Record<string, SuperDocTool> = {
  readSelection,
  readContent,
  searchContent,
  getContentSchema,
  insertContent,
  replaceContent,
  getDocumentOutline,
  readSection,
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
