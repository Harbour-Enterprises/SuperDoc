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

type FaddockSuperdocWrapperProps = {
  documents?: Document[];
  onAddToChat?: (selectedText: string, documentText: string) => void;
  [key: string]: unknown;
};

export default function FaddockSuperdocWrapper({
  documents = [],
  onAddToChat,
  ...rest
}: FaddockSuperdocWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const superDocInstance = useRef<SuperDoc | null>(null);

  // Mount the editor ONCE on mount
  useEffect(() => {
    if (!containerRef.current) return;

    superDocInstance.current = new SuperDoc({
      selector: '#superdoc',
      toolbar: '#superdoc-toolbar',
      document: null,
      autocompleteApiUrl: 'http://localhost:8080/api/v1/autocomplete',
      documentMode: 'editing',
      pagination: true,
      rulers: true,
      onAddToChat,
      ...rest,
    });

    // Clean up on unmount ONLY
    return () => {
      if (
        superDocInstance.current &&
        typeof superDocInstance.current.destroy === 'function'
      ) {
        superDocInstance.current.destroy();
      }
      superDocInstance.current = null;
    };
    // empty dependency array: mount once
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '75vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div id="superdoc-toolbar" style={{ width: '100%' }} />
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          flex: 1,
          overflowY: 'auto',
          paddingTop: '10px',
        }}
      >
        <div
          ref={containerRef}
          id="superdoc"
          className="faddock-superdoc-center"
          style={{
            width: '100%',
            maxWidth: 900,
          }}
        />
      </div>
    </div>
  );
}
