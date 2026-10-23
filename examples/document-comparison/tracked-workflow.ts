import type { SuperDocDocument } from '@superdoc/sdk';

export type TrackedComparisonDocument = Pick<SuperDocDocument, 'save'> & {
  diff: Pick<SuperDocDocument['diff'], 'compare' | 'apply'>;
};
export type ComparisonSnapshot = Parameters<SuperDocDocument['diff']['compare']>[0]['targetSnapshot'];
export type TrackedComparisonReceipt = Awaited<ReturnType<SuperDocDocument['diff']['apply']>>;
export type DirectStyleConsent = { styleChangeMode: 'direct' };

export async function saveTrackedComparison(
  baseDoc: TrackedComparisonDocument,
  targetSnapshot: ComparisonSnapshot,
  outPath: string,
  consent?: DirectStyleConsent,
): Promise<TrackedComparisonReceipt> {
  const diff = await baseDoc.diff.compare({ targetSnapshot, ...consent });
  const eligibility = diff.applyEligibility?.tracked;
  if (eligibility?.status !== 'candidate') {
    throw new Error(`Tracked apply is blocked for this pair: ${JSON.stringify(eligibility?.blockers ?? [])}`);
  }

  const receipt = await baseDoc.diff.apply({ diff, changeMode: 'tracked', ...consent });
  const saved = await baseDoc.save({ out: outPath });
  if (!saved.saved) throw new Error('The comparison save did not confirm success.');
  return receipt;
}
