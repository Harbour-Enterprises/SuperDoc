/**
 * Update the Ydoc document data with the latest Docx XML.
 *
 * @param {Editor} editor The editor instance
 * @returns {Promise<void>}
 */
export const updateYdocDocxData = async (editor, ydoc) => {
  try {
    ydoc = ydoc || editor?.options?.ydoc;
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
    if (!newXml || typeof newXml !== 'object') return;

    let hasChanges = false;

    Object.keys(newXml).forEach((key) => {
      const fileIndex = docx.findIndex((item) => item.name === key);
      const existingContent = fileIndex > -1 ? docx[fileIndex].content : null;

      // Skip if content hasn't changed
      if (existingContent === newXml[key]) {
        return;
      }

      hasChanges = true;
      if (fileIndex > -1) {
        docx.splice(fileIndex, 1);
      }
      docx.push({
        name: key,
        content: newXml[key],
      });
    });

    // Only transact if there were actual changes OR this is initial setup
    if (hasChanges || !docxValue) {
      ydoc.transact(
        () => {
          metaMap.set('docx', docx);
        },
        { event: 'docx-update', user: editor.options.user },
      );
    }
  } catch (error) {
    console.warn('[collaboration] Failed to update Ydoc docx data', error);
  }
};
