import { BorderSpec } from '@superdoc/contracts';

export function getBorderWidth(border: BorderSpec | null | undefined): number {
  if (!border || border.style === 'none') {
    return 0;
  }

  // TODO: Is there a reason the default is different from the default border weight in defaultTableCellAttrs.borders?
  // (This is the same default value used in applyBorder() in painters/dom/src/table/border-utils.ts)
  return border.width ?? 1;
}
