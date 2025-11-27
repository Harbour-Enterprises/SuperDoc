// @ts-check
import { findParentNodeClosestToPos } from '@core/helpers/findParentNodeClosestToPos.js';
import { isCellSelection } from './isCellSelection.js';
import type { Editor } from '@core/Editor.js';
import type { Command } from '@core/types/ChainedCommands.js';
import type { Node as PmNode } from 'prosemirror-model';

export const deleteTableWhenSelected: Command = ({ editor }: { editor: Editor }) => {
  const { selection } = editor.state;

  if (!isCellSelection(selection)) return false;

  let cellCount = 0;
  const table = findParentNodeClosestToPos(selection.ranges[0].$from, (node: PmNode) => {
    return node.type.name === 'table';
  });

  table?.node.descendants((node: PmNode) => {
    if (node.type.name === 'table') return false;
    if (['tableCell', 'tableHeader'].includes(node.type.name)) {
      cellCount += 1;
    }
  });

  const allCellsSelected = cellCount === selection.ranges.length;

  if (!allCellsSelected) {
    return false;
  }

  editor.commands.deleteTable();

  return true;
};
