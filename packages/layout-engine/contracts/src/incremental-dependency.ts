/**
 * Stable dependency classes that an incremental page checkpoint may fence.
 *
 * This list is proof metadata, never a feature switch. Producers must name
 * every retained dependency that required the checkpoint; consumers reject
 * empty, duplicate, or unknown lists instead of trusting a generic boolean.
 */
export type PageCheckpointDependencyClass =
  | 'multiple-sections'
  | 'furniture-page-tokens'
  | 'body-page-number-tokens'
  | 'non-balanceable-multi-column-sections'
  | 'body-anchored-objects'
  | 'non-flowing-page-relative-body-anchors'
  | 'footnotes'
  | 'page-references'
  | 'cross-references'
  | 'keep-constraints'
  | 'tables'
  | 'furniture-anchored-objects';

export const PAGE_CHECKPOINT_DEPENDENCY_CLASSES = Object.freeze([
  'multiple-sections',
  'furniture-page-tokens',
  'body-page-number-tokens',
  'non-balanceable-multi-column-sections',
  'body-anchored-objects',
  'non-flowing-page-relative-body-anchors',
  'footnotes',
  'page-references',
  'cross-references',
  'keep-constraints',
  'tables',
  'furniture-anchored-objects',
] as const satisfies readonly PageCheckpointDependencyClass[]);

/**
 * Exact retained-generation proof for page/margin-relative body anchors that
 * cannot influence paragraph flow (`wrap=None`). The host builds this once
 * from a canonical layout generation; warm consumers validate the epoch,
 * inventory, identities, and page ownership before admitting bounded layout.
 */
export type NonFlowingPageRelativeAnchorDependencyProof = {
  version: 2;
  sourceLayoutEpoch: number;
  inventoryFingerprint: string;
  entries: readonly ({
    blockId: string;
    carrierParagraphId: string;
    sourcePageIndex: number;
    sectionIndex: number;
    geometryFingerprint: string;
    measureFingerprint: string;
    pageGeometryFingerprint: string;
  } & (
    | {
        blockKind: 'image';
        drawingKind?: never;
      }
    | {
        blockKind: 'drawing';
        drawingKind: 'image' | 'vectorShape' | 'textboxShape' | 'shapeGroup' | 'chart';
      }
  ))[];
};

export type IncrementalDependencyCertificateClass =
  | 'checkpoint-geometry'
  | 'section-numbering'
  | 'font-style-inputs'
  | 'notes'
  | 'furniture'
  | 'flowing-anchors'
  | 'non-flowing-page-anchors'
  | 'convergence'
  | 'source-topology';

export const INCREMENTAL_DEPENDENCY_CERTIFICATE_CLASSES = Object.freeze([
  'checkpoint-geometry',
  'section-numbering',
  'font-style-inputs',
  'notes',
  'furniture',
  'flowing-anchors',
  'non-flowing-page-anchors',
  'convergence',
  'source-topology',
] as const satisfies readonly IncrementalDependencyCertificateClass[]);

export interface IncrementalDependencyOwnerVersion {
  readonly sourceRevision: string;
  readonly renderInputEpoch: number;
  readonly fontEpoch: string;
  readonly styleEpoch: string;
  readonly packetFingerprint: string;
}

export interface PageCheckpointDependencyCertificate {
  readonly version: 1;
  readonly certificateId: string;
  readonly owner: IncrementalDependencyOwnerVersion;
  readonly storyKey: string;
  readonly partUri: string;
  readonly pageIndex: number;
  readonly blockId: string;
  readonly prefixFragmentCount: number;
  readonly dependencyClasses: readonly IncrementalDependencyCertificateClass[];
  readonly classFingerprints: Readonly<Partial<Record<IncrementalDependencyCertificateClass, string>>>;
  readonly upstreamConvergenceFingerprint: string;
  readonly downstreamConvergenceFingerprint: string;
  readonly fragmentTopologyFingerprint: string;
}

const DRAWING_KINDS = new Set(['image', 'vectorShape', 'textboxShape', 'shapeGroup', 'chart']);
const CERTIFICATE_CLASSES = new Set<string>(INCREMENTAL_DEPENDENCY_CERTIFICATE_CLASSES);

export function isValidIncrementalDependencyOwnerVersion(value: unknown): value is IncrementalDependencyOwnerVersion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const owner = value as Record<string, unknown>;
  return (
    typeof owner.sourceRevision === 'string' &&
    owner.sourceRevision.length > 0 &&
    Number.isInteger(owner.renderInputEpoch) &&
    (owner.renderInputEpoch as number) >= 0 &&
    typeof owner.fontEpoch === 'string' &&
    owner.fontEpoch.length > 0 &&
    typeof owner.styleEpoch === 'string' &&
    owner.styleEpoch.length > 0 &&
    typeof owner.packetFingerprint === 'string' &&
    owner.packetFingerprint.length > 0
  );
}

export function isValidPageCheckpointDependencyCertificate(
  value: unknown,
): value is PageCheckpointDependencyCertificate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const certificate = value as Record<string, unknown>;
  if (
    certificate.version !== 1 ||
    typeof certificate.certificateId !== 'string' ||
    certificate.certificateId.length === 0 ||
    !isValidIncrementalDependencyOwnerVersion(certificate.owner) ||
    typeof certificate.storyKey !== 'string' ||
    certificate.storyKey.length === 0 ||
    typeof certificate.partUri !== 'string' ||
    certificate.partUri.length === 0 ||
    !Number.isInteger(certificate.pageIndex) ||
    (certificate.pageIndex as number) < 0 ||
    typeof certificate.blockId !== 'string' ||
    certificate.blockId.length === 0 ||
    !Number.isInteger(certificate.prefixFragmentCount) ||
    (certificate.prefixFragmentCount as number) < 0 ||
    !Array.isArray(certificate.dependencyClasses) ||
    certificate.dependencyClasses.length === 0 ||
    !certificate.classFingerprints ||
    typeof certificate.classFingerprints !== 'object' ||
    Array.isArray(certificate.classFingerprints) ||
    typeof certificate.upstreamConvergenceFingerprint !== 'string' ||
    certificate.upstreamConvergenceFingerprint.length === 0 ||
    typeof certificate.downstreamConvergenceFingerprint !== 'string' ||
    certificate.downstreamConvergenceFingerprint.length === 0 ||
    typeof certificate.fragmentTopologyFingerprint !== 'string' ||
    certificate.fragmentTopologyFingerprint.length === 0
  ) {
    return false;
  }

  const classes = new Set<string>();
  const fingerprints = certificate.classFingerprints as Record<string, unknown>;
  for (const dependencyClass of certificate.dependencyClasses) {
    if (
      typeof dependencyClass !== 'string' ||
      !CERTIFICATE_CLASSES.has(dependencyClass) ||
      classes.has(dependencyClass) ||
      typeof fingerprints[dependencyClass] !== 'string' ||
      (fingerprints[dependencyClass] as string).length === 0
    ) {
      return false;
    }
    classes.add(dependencyClass);
  }
  return Object.keys(fingerprints).every((key) => classes.has(key));
}

export function isValidNonFlowingPageRelativeAnchorDependencyProof(
  value: unknown,
): value is NonFlowingPageRelativeAnchorDependencyProof {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proof = value as Record<string, unknown>;
  if (
    proof.version !== 2 ||
    !Number.isInteger(proof.sourceLayoutEpoch) ||
    (proof.sourceLayoutEpoch as number) < 0 ||
    typeof proof.inventoryFingerprint !== 'string' ||
    proof.inventoryFingerprint.length === 0 ||
    !Array.isArray(proof.entries) ||
    proof.entries.length === 0
  ) {
    return false;
  }

  const blockIds = new Set<string>();
  for (const entryValue of proof.entries) {
    if (!entryValue || typeof entryValue !== 'object' || Array.isArray(entryValue)) return false;
    const entry = entryValue as Record<string, unknown>;
    if (
      typeof entry.blockId !== 'string' ||
      entry.blockId.length === 0 ||
      blockIds.has(entry.blockId) ||
      typeof entry.carrierParagraphId !== 'string' ||
      entry.carrierParagraphId.length === 0 ||
      !Number.isInteger(entry.sourcePageIndex) ||
      (entry.sourcePageIndex as number) < 0 ||
      !Number.isInteger(entry.sectionIndex) ||
      (entry.sectionIndex as number) < 0 ||
      typeof entry.geometryFingerprint !== 'string' ||
      entry.geometryFingerprint.length === 0 ||
      typeof entry.measureFingerprint !== 'string' ||
      entry.measureFingerprint.length === 0 ||
      typeof entry.pageGeometryFingerprint !== 'string' ||
      entry.pageGeometryFingerprint.length === 0
    ) {
      return false;
    }
    if (
      entry.blockKind !== 'image' &&
      (entry.blockKind !== 'drawing' || typeof entry.drawingKind !== 'string' || !DRAWING_KINDS.has(entry.drawingKind))
    ) {
      return false;
    }
    if (entry.blockKind === 'image' && entry.drawingKind !== undefined) return false;
    blockIds.add(entry.blockId);
  }
  return true;
}

export function areValidPageCheckpointDependencyClasses(
  value: unknown,
): value is readonly PageCheckpointDependencyClass[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  const allowed = new Set<string>(PAGE_CHECKPOINT_DEPENDENCY_CLASSES);
  const observed = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || !allowed.has(item) || observed.has(item)) return false;
    observed.add(item);
  }
  return true;
}
