/**
 * Update the Ydoc document data with the latest Docx XML.
 * 
 * @param {Editor} editor The editor instance
 * @returns {Promise<void>}
 */
export const updateYdocDocxData = async (editor) => {
  if (!editor.options.ydoc) return;
  
  const metaMap = editor.options.ydoc.getMap('meta');
  const docx = [...metaMap.get('docx')];
  const newXml = await editor.exportDocx({ getUpdatedDocs: true });
  
  Object.keys(newXml).forEach(key => {
    const fileIndex = docx.findIndex(item => item.name === key);
    if (fileIndex > -1) {
      docx.splice(fileIndex, 1);
    }
    docx.push({
      name: key,
      content: newXml[key],
    });
  });

  editor.options.ydoc.transact(() => {
    metaMap.set('docx', docx);
  }, { event: 'docx-update', user: editor.options.user });
}
