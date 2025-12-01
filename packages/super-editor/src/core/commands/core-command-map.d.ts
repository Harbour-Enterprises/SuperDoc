import type * as CoreCommandExports from './index.js';
import type { CommandProps } from '@core/types/ChainedCommands.js';

type ExtractCommandSignature<F> = F extends (...args: infer A) => (props: CommandProps) => infer R
  ? (...args: A) => R
  : (...args: unknown[]) => unknown;

type CoreCommandNames = {
  [K in keyof typeof CoreCommandExports]: (typeof CoreCommandExports)[K] extends (...args: unknown[]) => unknown
    ? K
    : never;
}[keyof typeof CoreCommandExports];

type CoreCommandSignatures = {
  [K in CoreCommandNames]: ExtractCommandSignature<(typeof CoreCommandExports)[K]>;
};

declare module '@core/types/ChainedCommands.js' {
  interface CoreCommandMap extends CoreCommandSignatures {}
}
