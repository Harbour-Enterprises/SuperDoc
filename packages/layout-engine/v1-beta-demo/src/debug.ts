import { Editor } from '@harbour-enterprises/super-editor';

type OverlayCallback = (enabled: boolean) => void;
const overlayListeners = new Set<OverlayCallback>();
let headerFooterOverlayEnabled = false;
let listenersInitialized = false;

export function attachDebugging(editor: InstanceType<typeof Editor>) {
  editor.on('contentError', (payload) => console.error('[Editor] contentError', payload));

  if (!listenersInitialized) {
    window.addEventListener('keydown', (event) => {
      if (event.altKey && event.shiftKey && event.code === 'KeyH') {
        headerFooterOverlayEnabled = !headerFooterOverlayEnabled;
        overlayListeners.forEach((listener) => listener(headerFooterOverlayEnabled));
        // Overlay toggle status removed
      }
    });
    listenersInitialized = true;
  }
}

export const onHeaderFooterOverlayToggle = (callback: OverlayCallback) => {
  overlayListeners.add(callback);
  return () => overlayListeners.delete(callback);
};

export const isHeaderFooterOverlayEnabled = () => headerFooterOverlayEnabled;
