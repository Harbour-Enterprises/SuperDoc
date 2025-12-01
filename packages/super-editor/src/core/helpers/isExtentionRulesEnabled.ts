import type { Extension } from '../Extension.js';

type EnabledExtension = string | { name: string };

export function isExtensionRulesEnabled(
  extension: Extension | { name: string },
  enabled: boolean | EnabledExtension[],
): boolean {
  if (Array.isArray(enabled)) {
    return enabled.some((enabledExtension) => {
      const name = typeof enabledExtension === 'string' ? enabledExtension : enabledExtension.name;

      return name === extension.name;
    });
  }

  return enabled;
}
