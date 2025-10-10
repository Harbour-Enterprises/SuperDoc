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
       autocompleteApiUrl: "https://magellanbackend.atlas.ir-scc-fusion-dev.awscloud.abbvienet.com/api/v1/autocomplete/",
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
    <div style={{ width: '100%' }}>
      <div id="superdoc-toolbar" />
      <div ref={containerRef} id="superdoc" style={{ width: '100%', height: '600px' }} />
    </div>
  );
}
