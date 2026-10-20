import {
  createParagraphLayoutSkipFacts,
  shouldSkipParagraphDuringLayout as canonicalShouldSkip,
  type FlowBlock,
  type ParagraphLayoutSkipFacts,
} from '@superdoc/contracts';
export { isReviewableSectionBoundaryMarkerBlock } from '@superdoc/contracts';

const invocations = new WeakMap<
  FlowBlock[],
  {
    refs: number;
    current: () => boolean;
    facts?: ParagraphLayoutSkipFacts;
  }
>();

/** Only synchronous or canonically immutable passes may share source facts. */
export function retainParagraphLayoutFacts(blocks: FlowBlock[], current: () => boolean): () => void {
  let owner = invocations.get(blocks);
  if (!owner) {
    owner = { refs: 0, current };
    invocations.set(blocks, owner);
  }
  owner.refs++;
  return () => {
    if (--owner.refs === 0 && invocations.get(blocks) === owner) invocations.delete(blocks);
  };
}

export function shouldSkipParagraphDuringLayout(blocks: FlowBlock[], index: number): boolean {
  const owner = invocations.get(blocks);
  if (!owner?.current()) return canonicalShouldSkip(blocks, index);
  owner.facts ??= createParagraphLayoutSkipFacts(blocks);
  return canonicalShouldSkip(blocks, index, owner.facts);
}
