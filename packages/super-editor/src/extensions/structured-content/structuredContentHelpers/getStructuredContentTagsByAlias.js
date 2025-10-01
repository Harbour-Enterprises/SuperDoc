import { findChildren } from '@core/helpers/findChildren';
import { EditorState } from 'prosemirror-state';

/**
 * Gets structured content tags by alias in the state.
 * @param {string | string[]} aliasOrAliases
 * @param {EditorState} state Editor state.
 * @returns {Array}
 */
export function getStructuredContentTagsByAlias(aliasOrAliases, state) {
  const result = findChildren(state.doc, (node) => {
    const isStructuredContent = ['structuredContent', 'structuredContentBlock'].includes(node.type.name);
    if (Array.isArray(aliasOrAliases)) {
      return isStructuredContent && aliasOrAliases.includes(node.attrs.alias);
    } else {
      return isStructuredContent && node.attrs.alias === aliasOrAliases;
    }
  });
  return result;
}
