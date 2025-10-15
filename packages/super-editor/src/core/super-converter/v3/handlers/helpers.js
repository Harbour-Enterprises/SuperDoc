import { processOutputMarks } from '@converter/exporter.js';
/**
 * Creates export element for trackFormat mark
 * @param {Array} marks SD node marks.
 * @returns {Object|undefined} Properties element for trackFormat change or undefined.
 */
export const createTrackStyleMark = (marks) => {
  const trackStyleMark = marks.find((mark) => mark.type === 'trackFormat');
  if (trackStyleMark) {
    return {
      type: 'element',
      name: 'w:rPrChange',
      attributes: {
        'w:id': trackStyleMark.attrs.id,
        'w:author': trackStyleMark.attrs.author,
        'w:authorEmail': trackStyleMark.attrs.authorEmail,
        'w:date': trackStyleMark.attrs.date,
      },
      elements: trackStyleMark.attrs.before.map((mark) => processOutputMarks([mark])).filter((r) => r !== undefined),
    };
  }
  return undefined;
};
