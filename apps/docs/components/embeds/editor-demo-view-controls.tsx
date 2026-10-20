import { Expand, Minus, Plus, Shrink } from 'lucide-react';
import type { ZoomSlice } from 'superdoc/ui';

type EditorDemoViewControlsProps = {
  disabled: boolean;
  fitActive: boolean;
  isFullscreen: boolean;
  onFit(): void;
  onFullscreen(): void;
  onZoom(direction: -1 | 1): void;
  zoom: ZoomSlice;
};

export function EditorDemoViewControls({
  disabled,
  fitActive,
  isFullscreen,
  onFit,
  onFullscreen,
  onZoom,
  zoom,
}: EditorDemoViewControlsProps) {
  return (
    <div className='sd-editor-demo-toolbar-group sd-editor-demo-view-controls' role='group' aria-label='View'>
      <div className='sd-editor-demo-zoom-control'>
        <button type='button' aria-label='Zoom out' disabled={disabled || zoom.value <= 1} onClick={() => onZoom(-1)}>
          <Minus aria-hidden='true' />
        </button>
        <button
          className='sd-editor-demo-fit-button'
          type='button'
          aria-label='Fit document to width'
          aria-pressed={fitActive}
          disabled={disabled}
          onClick={onFit}
        >
          {fitActive ? 'Fit' : `${Math.round(zoom.value)}%`}
        </button>
        <button type='button' aria-label='Zoom in' disabled={disabled} onClick={() => onZoom(1)}>
          <Plus aria-hidden='true' />
        </button>
      </div>
      <button
        type='button'
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        disabled={disabled}
        onClick={onFullscreen}
      >
        {isFullscreen ? <Shrink aria-hidden='true' /> : <Expand aria-hidden='true' />}
      </button>
    </div>
  );
}
