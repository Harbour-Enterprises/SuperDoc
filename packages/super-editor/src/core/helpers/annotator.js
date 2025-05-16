/**
 * Get the field attributes based on the field type and value
 * 
 * @param {Object} field The field node
 * @param {Object} value The value we want to annotate the field with
 * @returns 
 */
export const getFieldAttrs = (field, value) => {
  const { type } = field.attrs;
  const annotatorHandlers = {
    html: annotateHtml,
    text: annotateText,
    checkbox: annotateCheckbox,
    image: annotateImage,
  }

  const handler = annotatorHandlers[type];
  if (!handler) return {};

  // Run the handler to get the annotated field attributes
  return handler(value);
};

const annotateHtml = (value) => ({ rawHtml: value });
const annotateText = (value) => ({ displayLabel: value });
const annotateImage = (value) => ({ imageSrc: value });
const annotateCheckbox = (value) => ({ displayLabel: value });
