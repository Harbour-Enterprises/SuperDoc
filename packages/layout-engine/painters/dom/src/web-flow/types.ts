import type { FlowBlock, LayoutSourceIdentity } from '@superdoc/contracts';

/** Opaque adapter-issued identity. The painter never derives this value from DOM or block ids. */
export type WebFlowStableDomKey = string;

export interface WebFlowPaintItem {
  readonly stableDomKey: WebFlowStableDomKey;
  readonly renderFingerprint: string;
  readonly block: FlowBlock;
  readonly layoutEpoch?: number;
  readonly layoutIdentities?: readonly LayoutSourceIdentity[];
  readonly editable?: boolean;
  readonly showFormattingMarks?: boolean;
}

export type WebFlowPaintCommand =
  | {
      readonly kind: 'replace-all';
      readonly epoch: number;
      readonly items: readonly WebFlowPaintItem[];
    }
  | {
      readonly kind: 'splice';
      readonly expectedBaseEpoch: number;
      readonly epoch: number;
      readonly storyKey: string;
      readonly expectedRemovedKeys: readonly WebFlowStableDomKey[];
      readonly expectedLeftKey: WebFlowStableDomKey | null;
      readonly expectedRightKey: WebFlowStableDomKey | null;
      readonly items: readonly WebFlowPaintItem[];
      /** Identity-only updates for retained nodes downstream of a structural splice. */
      readonly retainedRebases?: readonly WebFlowPaintItem[];
    };

export interface WebFlowPaintWorkSummary {
  readonly kind: WebFlowPaintCommand['kind'];
  readonly retainedNodes: number;
  readonly createdNodes: number;
  readonly removedNodes: number;
  readonly rebasedNodes: number;
  readonly touchedItems: number;
}

export interface WebFlowDomBinding {
  readonly key: WebFlowStableDomKey;
  readonly renderFingerprint: string;
  readonly blockId: string;
  readonly node: HTMLElement;
}

export interface WebFlowPaintSnapshot {
  readonly epoch: number | null;
  readonly version: number;
  readonly bindings: readonly WebFlowDomBinding[];
}

export interface WebFlowAppliedPaint {
  readonly work: WebFlowPaintWorkSummary;
  /** Bindings directly owned by this command; localized splices never scan the retained root. */
  readonly touchedBindings: readonly WebFlowDomBinding[];
  /** Bindings whose DOM node or retained identity changed in this command. */
  readonly changedBindings: readonly WebFlowDomBinding[];
}

export interface WebFlowPaintTransaction {
  readonly command: WebFlowPaintCommand;
  /** Installs the candidate synchronously. The caller must then finalize or roll it back. */
  apply(): WebFlowAppliedPaint;
  /** Publishes the applied state and releases the rollback journal. */
  finalize(): WebFlowAppliedPaint;
  /** Restores the exact pre-apply DOM and retained state. */
  rollback(): void;
}

export interface WebFlowPainterHandle {
  prepare(command: WebFlowPaintCommand): WebFlowPaintTransaction;
  snapshot(): WebFlowPaintSnapshot;
  /** Rebuilds the last committed derived DOM after an externally owned mutation. */
  restoreCommittedDomAfterUnownedMutation(): WebFlowPaintSnapshot;
  dispose(): void;
}

export interface WebFlowPainterOptions {
  readonly resolvePhysical?: (
    cssFontFamily: string,
    face: { weight: '400' | '700'; style: 'normal' | 'italic' },
  ) => string;
  /** Fires synchronously when the mutation observer first detects unowned DOM. */
  readonly onUnownedMutation?: (kind: 'text' | 'dom') => void;
}
