/**
 * Bidirectional Text (BiDi) Utilities
 *
 * Functions for handling RTL text and indent mirroring.
 */

import type { ParagraphIndent } from '@superdoc/contracts';

const MIN_BIDI_CLAMP_INDENT_PX = 1;
export const DEFAULT_BIDI_INDENT_PX = 24;

/**
 * Mirror paragraph indent for RTL text.
 * Swaps left/right indents and inverts firstLine/hanging.
 */
export const mirrorIndentForRtl = (indent: ParagraphIndent): ParagraphIndent => {
  const mirrored: ParagraphIndent = {};
  let mutated = false;

  if (indent.right != null) {
    mirrored.left = indent.right;
    mutated = true;
  }
  if (indent.left != null) {
    mirrored.right = indent.left;
    mutated = true;
  }
  if (indent.firstLine != null) {
    mirrored.firstLine = -indent.firstLine;
    mutated = true;
  }
  if (indent.hanging != null) {
    mirrored.hanging = -indent.hanging;
    mutated = true;
  }

  return mutated ? mirrored : indent;
};

/**
 * Ensure BiDi paragraphs have minimum horizontal indent for proper rendering.
 * Clamps very small indents and adds synthetic defaults if needed.
 */
export const ensureBidiIndentPx = (indent: ParagraphIndent): ParagraphIndent & { __bidiFallback?: string } => {
  const adjusted: ParagraphIndent & { __bidiFallback?: string } = { ...indent };

  const clamp = (value: number | undefined): number | undefined => {
    if (value == null) return value;
    const abs = Math.abs(value);
    if (abs > 0 && abs < MIN_BIDI_CLAMP_INDENT_PX) {
      adjusted.__bidiFallback = adjusted.__bidiFallback ?? 'clamped';
      return (Math.sign(value) || 1) * MIN_BIDI_CLAMP_INDENT_PX;
    }
    return value;
  };

  adjusted.left = clamp(adjusted.left);
  adjusted.right = clamp(adjusted.right);

  const hasHorizontalIndent =
    (typeof adjusted.left === 'number' && adjusted.left !== 0) ||
    (typeof adjusted.right === 'number' && adjusted.right !== 0);

  if (!hasHorizontalIndent) {
    adjusted.left = DEFAULT_BIDI_INDENT_PX;
    adjusted.right = DEFAULT_BIDI_INDENT_PX;
    adjusted.__bidiFallback = 'synthetic';
  }

  return adjusted;
};
