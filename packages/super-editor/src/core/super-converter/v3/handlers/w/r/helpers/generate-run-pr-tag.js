// @ts-check

/**
 * Generate the w:rPr XML tag from SuperDoc attrs
 * @param {Object} props The run properties
 * @returns {Object | null} The generated w:rPr XML tag if it has elements, or null
 */
export const generateRunPrTag = (props = {}) => {
  const elements = [];

  // Support both legacy object-bag and array-of-attr-entries
  if (Array.isArray(props)) {
    props.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const xmlName = entry.xmlName || entry.name; // be lenient
      const attributes = entry.attributes || {};
      if (!xmlName) return;
      elements.push({ name: xmlName, attributes });
    });
  } else {
    Object.keys(props || {}).forEach((key) => {
      const { xmlName, attributes } = props[key] || {};
      if (!xmlName) return;
      elements.push({ name: xmlName, attributes });
    });
  }

  if (!elements.length) return null;

  const generatedTag = {
    name: 'w:rPr',
    elements,
  };

  return generatedTag;
};
