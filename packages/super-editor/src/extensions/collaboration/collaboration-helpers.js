/**
 * Update the Ydoc document data with the latest Docx XML.
 *
 * @param {Editor} editor The editor instance
 * @returns {Promise<void>}
 */
export const updateYdocDocxData = async (editor, ydoc) => {
  ydoc = ydoc || editor.options.ydoc;
  if (!ydoc) return;
  if (!editor || editor.isDestroyed) return;

  const metaMap = ydoc.getMap('meta');
  const docxValue = metaMap.get('docx');

  let docx = [];
  if (Array.isArray(docxValue)) {
    docx = [...docxValue];
  } else if (docxValue && typeof docxValue.toArray === 'function') {
    docx = docxValue.toArray();
  } else if (docxValue && typeof docxValue[Symbol.iterator] === 'function') {
    docx = Array.from(docxValue);
  }

  if (!docx.length && Array.isArray(editor.options.content)) {
    docx = [...editor.options.content];
  }

  const newXml = await editor.exportDocx({ getUpdatedDocs: true });

  Object.keys(newXml).forEach((key) => {
    const fileIndex = docx.findIndex((item) => item.name === key);
    if (fileIndex > -1) {
      docx.splice(fileIndex, 1);
    }
    docx.push({
      name: key,
      content: newXml[key],
    });
  });

  ydoc.transact(
    () => {
      metaMap.set('docx', docx);
    },
    { event: 'docx-update', user: editor.options.user },
  );
};
