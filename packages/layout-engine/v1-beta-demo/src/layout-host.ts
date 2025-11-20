import { Editor } from '@harbour-enterprises/super-editor';

type RerenderCallback = () => void | Promise<void>;

type LayoutEditingHostOptions = {
  editor: InstanceType<typeof Editor>;
  onRerender: RerenderCallback;
  onSelectionChange?: (payload: { editor: InstanceType<typeof Editor> }) => void;
};

export class LayoutEditingHost {
  private readonly editor: InstanceType<typeof Editor>;
  private readonly onRerender: RerenderCallback;
  private readonly onSelectionChange?: (payload: { editor: InstanceType<typeof Editor> }) => void;
  private isRendering = false;
  private needsRerender = false;
  private disposed = false;

  constructor(options: LayoutEditingHostOptions) {
    this.editor = options.editor;
    this.onRerender = options.onRerender;
    this.onSelectionChange = options.onSelectionChange;

    this.handleTransaction = this.handleTransaction.bind(this);
    this.handleSelectionUpdate = this.handleSelectionUpdate.bind(this);
  }

  start(): void {
    this.editor.on('transaction', this.handleTransaction);
    if (this.onSelectionChange) {
      this.editor.on('selectionUpdate', this.handleSelectionUpdate);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.editor.off('transaction', this.handleTransaction);
    if (this.onSelectionChange) {
      this.editor.off('selectionUpdate', this.handleSelectionUpdate);
    }
  }

  private handleSelectionUpdate(payload: { editor: InstanceType<typeof Editor> }): void {
    if (!this.onSelectionChange) return;
    this.onSelectionChange(payload);
  }

  private handleTransaction(): void {
    // Route through the external scheduler (debounced in main.ts)
    // Avoid running rerender immediately here to prevent mixed-state applies
    try {
      void this.onRerender();
    } catch (error) {
      console.error('[LayoutEditingHost] Failed to schedule rerender after transaction', error);
    }
  }
}
