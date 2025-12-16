import type { FormattingCommandAugmentations } from './formatting-commands.js';
import type { HistoryLinkTableCommandAugmentations } from './history-link-table-commands.js';
import type { SpecializedCommandAugmentations } from './specialized-commands.js';

/**
 * Unified command augmentation for all extensions.
 * Centralizing module augmentation helps keep `ExtensionCommandMap`
 * discoverable instead of spreading declarations across multiple files.
 */
export type ExtensionCommandAugmentations = FormattingCommandAugmentations &
  HistoryLinkTableCommandAugmentations &
  SpecializedCommandAugmentations;

declare module '@core/types/ChainedCommands.js' {
  interface ExtensionCommandMap extends ExtensionCommandAugmentations {}
}

declare module '@core/types/ChainedCommands' {
  interface ExtensionCommandMap extends ExtensionCommandAugmentations {}
}
