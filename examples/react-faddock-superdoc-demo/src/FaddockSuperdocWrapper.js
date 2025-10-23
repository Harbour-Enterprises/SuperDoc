import React, { useRef, useEffect } from 'react';
import { SuperDoc } from 'faddock-superdoc';
import 'faddock-superdoc/style.css';

/**
 * React wrapper for FaddockSuperdoc ES6 class.
 * Usage: <FaddockSuperdocWrapper documents={[...]} otherProps={...} />
 */
export default function FaddockSuperdocWrapper({ documents = [], ...rest }) {
  const containerRef = useRef(null);
  const superDocInstance = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance on prop change or unmount
    if (superDocInstance.current && typeof superDocInstance.current.destroy === 'function') {
      superDocInstance.current.destroy();
    }

     superDocInstance.current = new SuperDoc({
       selector: '#superdoc',
       toolbar: '#superdoc-toolbar',
       document: null,
       autocompleteApiUrl: "http://localhost:58414/api/v1/autocomplete/",
       documentMode: 'editing',
       pagination: true,
       rulers: true,
       onReady: (event) => {
         console.log('SuperDoc is ready', event);
       },
       onEditorCreate: (event) => {
         console.log('Editor is created', event);
       },
       ...rest // allow other props through
     });

    // Clean up on unmount
    return () => {
      if (superDocInstance.current && typeof superDocInstance.current.destroy === 'function') {
        superDocInstance.current.destroy();
      }
    };
  }, [documents, rest]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div id="superdoc-toolbar" style={{ width: '100%' }} />
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flex: 1 }}>
        <div
          ref={containerRef}
          id="superdoc"
          style={{ width: '100%', maxWidth: 900, height: '600px', margin: '0 auto' }}
        />
      </div>
    </div>
  );
}
