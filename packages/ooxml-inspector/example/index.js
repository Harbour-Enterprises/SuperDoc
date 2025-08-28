import { childrenOf } from '@superdoc-dev/ooxml-inspector';

const children = childrenOf('w:p');
console.debug('Children of w:p', children);
