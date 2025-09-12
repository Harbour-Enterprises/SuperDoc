// @ts-check

/**
 * Creates the final translated run object
 * @param {any[]} contentNodes
 * @param {any} runProperties
 * @param {any} encodedAttrs
 * @returns {{ type: string, content: any[], attrs: any }}
 */
export function createTranslatedRun(contentNodes, runProperties, encodedAttrs) {
  const translated = {
    type: 'run',
    content: contentNodes,
    attrs: runProperties,
  };

  // Merge any additional encoded attributes
  if (encodedAttrs && Object.keys(encodedAttrs).length > 0) {
    translated.attrs = { ...translated.attrs, ...encodedAttrs };
  }

  return translated;
}
