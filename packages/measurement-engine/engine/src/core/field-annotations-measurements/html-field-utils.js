export function isHtmlFieldNode(node) {
  if (!node) return false;
  const name = node?.type?.name;
  if (name === 'fieldAnnotation') {
    const fieldType = node?.attrs?.type ?? null;
    return fieldType === 'html' || fieldType === 'structuredContent' || fieldType === 'structuredContentBlock';
  }
  if (name === 'structuredContent' || name === 'structuredContentBlock') {
    return true;
  }
  return false;
}

export function extractHtmlFieldMetadata(node) {
  if (!node) {
    return {
      type: null,
      fieldId: null,
      alias: null,
    };
  }

  const name = node?.type?.name ?? null;
  const typeAttr = node?.attrs?.type ?? null;
  const fieldId = node?.attrs?.fieldId ?? node?.attrs?.id ?? null;
  const alias = node?.attrs?.alias ?? null;

  let resolvedType = typeAttr;
  if (!resolvedType) {
    if (name === 'structuredContent' || name === 'structuredContentBlock') {
      resolvedType = 'structuredContent';
    } else if (name === 'fieldAnnotation') {
      resolvedType = 'html';
    }
  }

  return {
    type: resolvedType ?? null,
    fieldId: fieldId ?? null,
    alias: alias ?? null,
  };
}
