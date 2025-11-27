import type * as CoreCommandExports from './index.js';
import type { CommandProps } from '@core/types/ChainedCommands.js';

type ExtractCommandSignature<F> = F extends (...args: infer A) => (props: CommandProps) => infer R
  ? (...args: A) => R
  : (...args: unknown[]) => unknown;

type CoreCommandNames =
  | 'first'
  | 'command'
  | 'insertTabChar'
  | 'insertTabNode'
  | 'setMeta'
  | 'splitBlock'
  | 'liftEmptyBlock'
  | 'createParagraphNear'
  | 'newlineInCode'
  | 'exitCode'
  | 'setMark'
  | 'unsetMark'
  | 'unsetAllMarks'
  | 'toggleMark'
  | 'toggleMarkCascade'
  | 'clearNodes'
  | 'setNode'
  | 'toggleNode'
  | 'selectAll'
  | 'deleteSelection'
  | 'updateAttributes'
  | 'resetAttributes'
  | 'joinUp'
  | 'joinDown'
  | 'joinBackward'
  | 'joinForward'
  | 'selectNodeBackward'
  | 'selectNodeForward'
  | 'selectTextblockStart'
  | 'selectTextblockEnd'
  | 'insertContent'
  | 'insertContentAt'
  | 'undoInputRule'
  | 'toggleList'
  | 'increaseListIndent'
  | 'decreaseListIndent'
  | 'changeListLevel'
  | 'removeNumberingProperties'
  | 'restoreSelection'
  | 'setTextSelection'
  | 'getSelectionMarks';

type CoreCommandSignatures = {
  [K in CoreCommandNames]: ExtractCommandSignature<(typeof CoreCommandExports)[K]>;
};

declare module '@core/types/ChainedCommands.js' {
  interface CoreCommandMap extends CoreCommandSignatures {}
}
