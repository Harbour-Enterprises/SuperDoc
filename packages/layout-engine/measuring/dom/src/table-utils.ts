import { BorderSpec } from '@superdoc/contracts';

export function getBorderWidth(border: BorderSpec | null | undefined): number {
  if (!border || border.style === 'none') {
    return 0;
  }

  return border.width ?? 1;
}
