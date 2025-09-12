// @ts-check

/**
 * Extracts run properties from a run properties node
 * @param {any} rPrNode
 * @param {any} params
 * @param {{ handler: Function }} nodeListHandler
 * @returns {{ runProperties?: any[] } | {}}
 */
import { handleStyleChangeMarks, parseMarks } from '@converter/v2/importer/markImporter.js';

export function extractRunProperties(rPrNode, params, nodeListHandler) {
  const results =
    nodeListHandler.handler({
      ...params,
      nodes: [rPrNode],
    }) || [];

  // Find the run properties attribute entry
  const rprAttr = results.find((node) => node?.type === 'attr' && node?.sdNodeOrKeyName === 'runProperties');

  // Derive track-format marks from w:rPrChange if present
  let marks = [];
  try {
    if (rPrNode && Array.isArray(rPrNode.elements)) {
      const currentMarks = parseMarks(rPrNode) || [];
      marks = handleStyleChangeMarks(rPrNode, currentMarks) || [];
    }
  } catch {
    marks = [];
  }

  const base = rprAttr?.attributes && Array.isArray(rprAttr.attributes) ? { runProperties: rprAttr.attributes } : {};

  if (marks && marks.length) return { ...base, marks };
  return base;
}
