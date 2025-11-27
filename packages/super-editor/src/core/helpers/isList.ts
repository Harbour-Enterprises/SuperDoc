import { getExtensionConfigField } from './getExtensionConfigField.js';
import { callOrGet } from '../utilities/callOrGet.js';
import type { Extension } from '../Extension';
import type { Node } from '../Node';

type AnyExtension = Extension | Node;

/**
 * Check if node is a list.
 * @param name Node name.
 * @param extensions Array of extensions.
 */
export const isList = (name: string, extensions: AnyExtension[]): boolean => {
  const nodeExtensions = extensions.filter((e) => e.type === 'node');
  const extension = nodeExtensions.find((i) => i.name === name);
  if (!extension) return false;

  const context = {
    name: extension.name,
    options: extension.options,
    storage: extension.storage,
  };
  const groupField = getExtensionConfigField(extension, 'group', context);
  const group = callOrGet(groupField);

  if (typeof group !== 'string') return false;

  return (group as string).split(' ').includes('list');
};
