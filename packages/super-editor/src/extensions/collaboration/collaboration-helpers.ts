import type { Editor } from '@core/Editor.js';
import type * as Y from 'yjs';

/**
 * Update the Ydoc document data with the latest Docx XML.
 *
 * @param {Editor} editor The editor instance
 * @returns {Promise<void>}
 */
export const updateYdocDocxData = async (editor: Editor, ydoc?: Y.Doc): Promise<void> => {
  try {
    ydoc = ydoc || (editor?.options as { ydoc?: Y.Doc })?.ydoc;
    if (!ydoc) return;
    if (!editor || editor.isDestroyed) return;

    const metaMap = ydoc.getMap('meta');
    const docxValue = metaMap.get('docx');

    let docx: Array<{ name: string; content: unknown }> = [];
    if (Array.isArray(docxValue)) {
      docx = [...docxValue];
    } else if (docxValue && typeof (docxValue as { toArray?: () => unknown[] }).toArray === 'function') {
      docx = (docxValue as { toArray: () => Array<{ name: string; content: unknown }> }).toArray();
    } else if (docxValue && typeof (docxValue as Iterable<unknown>)[Symbol.iterator] === 'function') {
      docx = Array.from(docxValue as Iterable<{ name: string; content: unknown }>);
    }

    if (!docx.length && Array.isArray(editor.options.content)) {
      docx = [...(editor.options.content as Array<{ name: string; content: unknown }>)];
    }

    const newXml = (await editor.exportDocx({ getUpdatedDocs: true })) as Record<string, unknown> | null | undefined;
    if (!newXml || typeof newXml !== 'object') return;

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
      { event: 'docx-update', user: editor.options.user } as Y.Transaction['origin'],
    );
  } catch (error) {
    console.warn('[collaboration] Failed to update Ydoc docx data', error);
  }
};
