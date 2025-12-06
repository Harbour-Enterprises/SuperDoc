export function parseAttrs(node) {
  const numberingProperties = {};
  let indent, spacing;
  const { styleid: styleId, ...extraAttrs } = Array.from(node.attributes).reduce((acc, attr) => {
    if (attr.name === 'data-num-id') {
      numberingProperties.numId = parseInt(attr.value);
    } else if (attr.name === 'data-level') {
      numberingProperties.ilvl = parseInt(attr.value);
    } else if (attr.name === 'data-indent') {
      try {
        indent = JSON.parse(attr.value);
        // Ensure numeric values
        Object.keys(indent).forEach((key) => {
          indent[key] = Number(indent[key]);
        });
      } catch {
        // ignore invalid indent value
      }
    } else if (attr.name === 'data-spacing') {
      try {
        spacing = JSON.parse(attr.value);
        // Ensure numeric values
        Object.keys(spacing).forEach((key) => {
          spacing[key] = Number(spacing[key]);
        });
      } catch {
        // ignore invalid spacing value
      }
    } else {
      acc[attr.name] = attr.value;
    }
    return acc;
  }, {});

  let attrs = {
    paragraphProperties: {
      styleId: styleId || null,
    },
    extraAttrs,
  };

  if (indent && Object.keys(indent).length > 0) {
    attrs.paragraphProperties.indent = indent;
  }

  if (spacing && Object.keys(spacing).length > 0) {
    attrs.paragraphProperties.spacing = spacing;
  }

  if (Object.keys(numberingProperties).length > 0) {
    attrs.paragraphProperties.numberingProperties = numberingProperties;
  }

  return attrs;
}
