import { findChildren } from '@core/helpers/findChildren';

/**
 * Gets all structured content tags in the state.
 * @param {import('prosemirror-state').EditorState} state Editor state.
 * @returns {Array}
 */
export function getStructuredContentTags(state) {
  const result = findChildren(state.doc, (node) => {
    return node.type.name === 'structuredContent' || node.type.name === 'structuredContentBlock';
  });
  return result;
}
