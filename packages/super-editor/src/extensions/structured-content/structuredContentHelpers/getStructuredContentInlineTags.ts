import { findChildren } from '@core/helpers/findChildren';
import type { EditorState } from 'prosemirror-state';
import type { StructuredContentMatch } from './types';

/**
 * Get all inline structured content tags in the document
 * @category Helper
 * @param {import('prosemirror-state').EditorState} state Editor state
 * @returns {Array<{ node: import('prosemirror-model').Node, pos: number }>} All inline structured content nodes
 * @example
 * const inlines = editor.helpers.getStructuredContentInlineTags(editor.state)
 * console.log(`Found ${inlines.length} inline fields`)
 */
export function getStructuredContentInlineTags(state: EditorState): StructuredContentMatch[] {
  const result = findChildren(state.doc, (node) => node.type.name === 'structuredContent');
  return result;
}
