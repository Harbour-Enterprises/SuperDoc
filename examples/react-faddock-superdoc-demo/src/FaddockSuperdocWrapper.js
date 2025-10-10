import React, { useRef, useEffect } from 'react';
import { FaddockSuperdoc } from 'faddock-superdoc';
import 'faddock-superdoc/style.css';

/**
 * React wrapper for FaddockSuperdoc ES6 class.
 * Usage: <FaddockSuperdocWrapper documents={[...]} otherProps={...} />
 */
export default function FaddockSuperdocWrapper({ documents = [], ...rest }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Instantiate Superdoc, mounting to this div
    const instance = new FaddockSuperdoc({
      selector: containerRef.current,
      documents,
      ...rest,
    });
    // Optionally, store the instance if needed

    // Cleanup pattern (if destroy method exists, implement here)
    return () => {
      if (typeof instance.destroy === 'function') {
        instance.destroy();
      }
    };
  }, [documents, rest]);

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />;
}
