import type { Transaction } from 'prosemirror-state';
import type { ValidatorLogger, ElementInfo } from '../../../../../types.js';
import type { Editor } from '@core/Editor.js';

/**
 * Ensure all link marks have a valid rId attribute.
 */
export function ensureValidLinkRID(
  links: ElementInfo[],
  editor: Editor,
  tr: Transaction,
  logger: ValidatorLogger,
): { modified: boolean; results: string[] } {
  let modified = false;
  const results: string[] = [];

  links.forEach(({ mark, from, to }) => {
    if (!mark || from === undefined || to === undefined) return;
    const { rId, href, anchor } = mark.attrs;

    if (!rId && href && !anchor) {
      let newId = editor.converter.docxHelpers.findRelationshipIdFromTarget(href, editor);
      if (newId) logger.debug('Reusing existing rId for link:', newId, 'from pos:', from, 'to pos:', to);

      // If we still don't have an rId, create a new relationship
      if (!newId) {
        newId = editor.converter.docxHelpers.insertNewRelationship(href, 'hyperlink', editor);
        logger.debug('Creating new rId for link from pos:', from, 'to pos:', to, 'with href:', href);
      }

      if (newId) {
        // Remove the old mark and add a new one with the rId
        const linkMarkType = editor.schema.marks.link;
        const newMark = linkMarkType.create({
          ...mark.attrs,
          rId: newId,
        });

        tr.removeMark(from, to, linkMarkType);
        tr.addMark(from, to, newMark);

        results.push(`Added missing rId to link from pos ${from} to ${to}`);
        modified = true;
      }
    }
  });

  return { modified, results };
}
