import { findChildren } from '@core/helpers/findChildren';
import { EditorState } from 'prosemirror-state';

/**
 * Gets structured content tags by ID in the state.
 * @param {string | string[]} idOrIds
 * @param {EditorState} state Editor state.
 * @returns {Array}
 */
export function getStructuredContentTagsById(idOrIds, state) {
  const result = findChildren(state.doc, (node) => {
    const isStructuredContent = ['structuredContent', 'structuredContentBlock'].includes(node.type.name);
    if (Array.isArray(idOrIds)) {
      return isStructuredContent && idOrIds.includes(node.attrs.id);
    } else {
      return isStructuredContent && node.attrs.id === idOrIds;
    }
  });
  return result;
}
