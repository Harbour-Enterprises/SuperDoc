import { getColStyleDeclaration } from './getColStyleDeclaration.js';

export const createColGroup = (node, cellMinWidth, overrideCol, overrideValue) => {
  let totalWidth = 0;
  let fixedWidth = true;
  
  const cols = [];
  const row = node.firstChild;

  if (!row) return {};

  for (let i = 0, col = 0; i < row.childCount; i++) {
    const { colspan, colwidth } = row.child(i).attrs;

    for (let j = 0; j < colspan; j++, col++) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j];
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      const [prop, value] = getColStyleDeclaration(cellMinWidth, hasWidth);
      cols.push(['col', { style: `${prop}: ${value}` }]);
    }
  }

  const tableWidth = fixedWidth ? `${totalWidth}px` : '';
  const tableMinWidth = fixedWidth ? '' : `${totalWidth}px`;
  const colgroup = ['colgroup', {}, ...cols];

  return { 
    colgroup, 
    tableWidth, 
    tableMinWidth, 
  };
};
