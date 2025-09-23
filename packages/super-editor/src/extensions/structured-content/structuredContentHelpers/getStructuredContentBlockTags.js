import { findChildren } from '@core/helpers/findChildren';
import { EditorState } from 'prosemirror-state';

/**
 * Gets all structured content block tags in the state.
 * @param {EditorState} state Editor state.
 * @returns {Array}
 */
export function getStructuredContentBlockTags(state) {
  const result = findChildren(state.doc, (node) => node.type.name === 'structuredContentBlock');
  return result;
}
