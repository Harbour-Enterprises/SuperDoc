import type { Transaction } from 'prosemirror-state';
import type { Editor } from '../Editor.js';
import type { DefaultEventMap } from '../EventEmitter.js';

/**
 * Payload for fonts-resolved events
 */
export interface FontsResolvedPayload {
  documentFonts: string[];
  unsupportedFonts: string[];
}

/**
 * Event map for the Editor class
 */
export interface EditorEventMap extends DefaultEventMap {
  /** Called before editor creation */
  beforeCreate: [];

  /** Called after editor creation */
  create: [{ editor: Editor }];

  /** Called when editor content updates */
  update: [{ editor: Editor; transaction: Transaction }];

  /** Called when selection updates */
  selectionUpdate: [{ editor: Editor; transaction: Transaction }];

  /** Called when a transaction is processed */
  transaction: [{ editor: Editor; transaction: Transaction; duration?: number }];

  /** Called when editor gets focus */
  focus: [{ editor: Editor; event: FocusEvent; transaction: Transaction }];

  /** Called when editor loses focus */
  blur: [{ editor: Editor; event: FocusEvent; transaction: Transaction }];

  /** Called when editor is destroyed */
  destroy: [];

  /** Called when there's a content error */
  contentError: [{ error: Error }];

  /** Called when tracked changes update */
  trackedChangesUpdate: [any];

  /** Called when comments update */
  commentsUpdate: [any];

  /** Called when comments are loaded */
  commentsLoaded: [{ editor: Editor; replacedFile?: boolean; comments: any[] }];

  /** Called when a comment is clicked */
  commentClick: [any];

  /** Called when comment locations update */
  'comment-positions': [any];

  /** Called when document is locked */
  locked: [any];

  /** Called when collaboration is ready */
  collaborationReady: [{ editor: Editor; ydoc: any }];

  /** Called when pagination updates */
  paginationUpdate: [any];

  /** Called when an exception occurs */
  exception: [{ error: Error; editor: Editor }];

  /** Called when list definitions change */
  'list-definitions-change': [any];

  /** Called when all fonts used in the document are determined */
  'fonts-resolved': [FontsResolvedPayload[]];
}
