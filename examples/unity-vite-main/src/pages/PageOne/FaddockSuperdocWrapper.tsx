import React, { useRef, useEffect } from 'react';
import { SuperDoc } from 'faddock-superdoc';
import 'faddock-superdoc/style.css';

/**
 * React wrapper for FaddockSuperdoc ES6 class.
 * Usage: <FaddockSuperdocWrapper documents={[...]} otherProps={...} />
 */
type Document = {
  id: string;
  type: string;
  data: unknown;
};

export default function FaddockSuperdocWrapper({
  documents = [],
  ...rest
}: {
  documents?: Document[];
  [key: string]: unknown;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const superDocInstance = useRef<SuperDoc | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance on prop change or unmount
    if (
      superDocInstance.current &&
      typeof superDocInstance.current.destroy === 'function'
    ) {
      superDocInstance.current.destroy();
    }

    superDocInstance.current = new SuperDoc({
      selector: '#superdoc',
      toolbar: '#superdoc-toolbar',
      document: null,
      // autocompleteApiUrl: 'http://localhost:58414/api/v1/autocomplete/',
      autocompleteApiUrl:
        'https://magellanbackend.atlas.ir-scc-fusion-dev.awscloud.abbvienet.com/api/v1/autocomplete',
      documentMode: 'editing',
      pagination: true,
      rulers: true,
      ...rest, // allow other props through
    });

    // Clean up on unmount
    return () => {
      if (
        superDocInstance.current &&
        typeof superDocInstance.current.destroy === 'function'
      ) {
        superDocInstance.current.destroy();
      }
    };
  }, [documents, rest]);

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      <div id="superdoc-toolbar" style={{ width: '100%' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          flex: 1,
        }}
      >
        <div
          ref={containerRef}
          id="superdoc"
          className="faddock-superdoc-center"
          style={{
            width: '100%',
            maxWidth: 900,
            height: '600px',
            margin: '0 auto',
            display: 'block',
            transformOrigin: 'center',
          }}
        />
      </div>
    </div>
  );
}
