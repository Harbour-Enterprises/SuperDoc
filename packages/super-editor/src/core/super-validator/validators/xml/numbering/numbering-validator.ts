import type { Editor } from '@core/Editor.js';
import type { ValidatorLogger, ValidationResult } from '../../../types.js';

interface XmlElement {
  type?: string;
  name?: string;
  attributes?: Record<string, unknown>;
  elements?: XmlElement[];
}

export function createNumberingValidator({
  editor,
  logger,
}: {
  editor: Editor;
  logger: ValidatorLogger;
}): () => ValidationResult {
  return () => {
    const results: string[] = [];
    let modified = false;

    const convertedXml = editor?.converter?.convertedXml;
    const path = 'word/numbering.xml';
    const numbering = convertedXml?.[path];

    if (!numbering || !numbering.elements?.length || !numbering.elements[0].elements?.length) {
      results.push(`${path} is not a valid xml`);
      return { results, modified };
    }

    const removed: string[] = [];
    const elements = numbering.elements[0];
    pruneInvalidNumNodes(elements, removed);

    if (removed.length) {
      modified = true;
      results.push(`Removed invalid <w:num> by numId:` + removed.join(', '));
      logger?.debug?.(`Removed invalid <w:num> by numId: ${removed.join(', ')}`);
    } else {
      results.push('No <w:num> entries with null/invalid numId found.');
    }
    return { results, modified };
  };
}

/**
 * Recursively walks an xml tree and removes <w:num> with bad numId.
 * Mutates the tree in place.
 */
function pruneInvalidNumNodes(node: XmlElement, removed: string[]): void {
  if (!node || !Array.isArray(node.elements)) return;

  const next: XmlElement[] = [];
  for (const el of node.elements) {
    if (el?.type === 'element') {
      if (el.name === 'w:num') {
        const attrs = el.attributes || {};
        const raw = attrs['w:numId'];
        const v = raw == null ? null : String(raw).trim();
        const isInvalid = v == null || v === '' || /^null$/i.test(v) || !/^\d+$/.test(v);

        if (isInvalid) {
          removed.push(v ?? 'missing node');
          continue;
        }
      }
      if (Array.isArray(el.elements) && el.elements.length) {
        pruneInvalidNumNodes(el, removed);
      }
    }
    next.push(el);
  }

  node.elements = next;
}
