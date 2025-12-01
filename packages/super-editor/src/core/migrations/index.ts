import { migration_after_0_4_14 } from './migration_after_0_4_14.js';
import type { Editor } from '../Editor.js';

const DOCUMENT_MIGRATIONS = {
  initial: migration_after_0_4_14,
};

export const getNecessaryMigrations = (version: string): ((editor: Editor) => boolean)[] | undefined => {
  if (version === 'initial' || version === '0.4.14') return Object.values(DOCUMENT_MIGRATIONS);
};
