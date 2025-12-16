import { getStructuredContentTagsById } from './getStructuredContentTagsById';
import type { EditorState } from 'prosemirror-state';
import type { Node as PmNode } from 'prosemirror-model';
import type { StructuredContentMatch } from './types';

/**
 * Find all tables inside a structured content block by ID
 * @category Helper
 * @param {string} id Structured content block ID
 * @param {import('prosemirror-state').EditorState} state Editor state
 * @returns {Array<{ node: import('prosemirror-model').Node, pos: number }>} Tables with absolute positions
 * @example
 * const tables = editor.helpers.getStructuredContentTablesById('block-123', editor.state)
 * console.log(`Block contains ${tables.length} table(s)`)
 */
export function getStructuredContentTablesById(id: string, state: EditorState): StructuredContentMatch[] {
  if (!id || !state) return [];

  const blocks = getStructuredContentTagsById(id, state).filter(
    ({ node }) => node.type.name === 'structuredContentBlock',
  );

  if (!blocks.length) return [];

  const { pos: blockPos, node: blockNode } = blocks[0];

  const tablesInBlock: StructuredContentMatch[] = [];
  blockNode.descendants((child: PmNode, relPos: number) => {
    if (child.type.name === 'table') {
      const absPos = blockPos + 1 + relPos;
      tablesInBlock.push({ node: child, pos: absPos });
    }
  });

  return tablesInBlock;
}
