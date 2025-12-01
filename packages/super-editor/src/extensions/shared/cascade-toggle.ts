import type { CommandProps } from '@core/types/ChainedCommands.js';

/**
 * Utility helpers for cascade-aware mark toggles.
 */
interface CascadeToggleOptions {
  markName: string;
  setCommand?: string;
  unsetCommand?: string;
  toggleCommand?: string;
  negationAttrs?: Record<string, unknown>;
  isNegation?: (attrs: Record<string, unknown>) => boolean;
  extendEmptyMarkRange?: boolean;
}

export function createCascadeToggleCommands({
  markName,
  setCommand,
  unsetCommand,
  toggleCommand,
  negationAttrs,
  isNegation,
  extendEmptyMarkRange,
}: CascadeToggleOptions) {
  if (!markName) throw new Error('createCascadeToggleCommands requires a markName');

  const capitalized = markName.charAt(0).toUpperCase() + markName.slice(1);
  const setName = setCommand ?? `set${capitalized}`;
  const unsetName = unsetCommand ?? `unset${capitalized}`;
  const toggleName = toggleCommand ?? `toggle${capitalized}`;

  const cascadeOptions: {
    negationAttrs?: Record<string, unknown>;
    isNegation?: (attrs: Record<string, unknown>) => boolean;
    extendEmptyMarkRange?: boolean;
  } = {};
  if (negationAttrs) cascadeOptions.negationAttrs = negationAttrs;
  if (typeof isNegation === 'function') cascadeOptions.isNegation = isNegation;
  if (extendEmptyMarkRange !== undefined) cascadeOptions.extendEmptyMarkRange = extendEmptyMarkRange;

  return {
    [setName]:
      () =>
      ({ commands }: CommandProps) =>
        commands.setMark(markName),

    [unsetName]:
      () =>
      ({ commands }: CommandProps) =>
        commands.unsetMark(markName),

    [toggleName]:
      () =>
      ({ commands }: CommandProps) =>
        commands.toggleMarkCascade(markName, cascadeOptions),
  };
}
