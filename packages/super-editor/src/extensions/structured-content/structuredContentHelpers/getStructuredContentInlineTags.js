import { findChildren } from '@core/helpers/findChildren';
import { EditorState } from 'prosemirror-state';

/**
 * Gets all structured content inline tags in the state.
 * @param {EditorState} state Editor state.
 * @returns {Array}
 */
export function getStructuredContentInlineTags(state) {
  const result = findChildren(state.doc, (node) => node.type.name === 'structuredContent');
  return result;
}
