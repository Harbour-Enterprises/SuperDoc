> Disclaimer: This README.md is AI-generated ✨

# faddock-superdoc

A powerful, ES6 class-based document editor designed for seamless integration into React, vanilla JS, and modern web apps.

---

## Installation

```
npm -i faddock-superdoc
```

---

## Usage in React

### 1. Use the Provided Wrapper

Below is a recommended React component that wraps the ES6 SuperDoc class. It supports dynamic props and handles proper cleanup:

```jsx
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
      autocompleteApiUrl: 'http://localhost:58414/api/v1/autocomplete/',
      documentMode: 'editing',
      pagination: true,
      rulers: true,
      ...rest, // allow other props through
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
      <div id='superdoc-toolbar' style={{ width: '100%' }} />
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flex: 1 }}>
        <div
          ref={containerRef}
          id='superdoc'
          className='faddock-superdoc-center'
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
```

**Usage Example:**

```jsx
import FaddockSuperdocWrapper from './FaddockSuperdocWrapper';
import 'faddock-superdoc/style.css';

function App() {
  return <FaddockSuperdocWrapper documents={[{ id: 'demo-doc', type: 'docx', data: null }]} />;
}
```

#### Props Explained

- `documents`: Array of document objects (each with `id`, `type`, and optional `data`).
- Any additional props (e.g., API URLs, toolbar settings, modes) are passed straight to the SuperDoc class.
- Internal DOM element IDs (`#superdoc`, `#superdoc-toolbar`) can be customized as needed; must match in both JSX and SuperDoc config.

---

## Usage in Plain JS

You may also construct SuperDoc manually:

```js
import { SuperDoc } from 'faddock-superdoc';
import 'faddock-superdoc/style.css';

const superdoc = new SuperDoc({
  selector: '#superdoc',
  toolbar: '#superdoc-toolbar',
  documentMode: 'editing',
  pagination: true,
  rulers: true,
});
```

Make sure the selector references a valid DOM node.

---

## Key Config Options

- `selector` _(string)_: CSS selector for your editor root node.
- `toolbar` _(string)_: CSS selector for toolbar container.
- `document`: Document data object (optional).
- `documents`: Array of docs to initialize (optional).
- `autocompleteApiUrl`: API endpoint for document autocomplete (optional).
- `documentMode`: `'editing'` or `'viewing'`.
- `pagination`: Enable/disable multi-page view.
- `rulers`: Enable/disable document rulers/bar.

---

## Advanced Integration

- For advanced usage, pass any extra props from your React wrapper directly to the SuperDoc's constructor.
- Always call `.destroy()` on any `SuperDoc` instance before unmounting/leaving the page to clean up events and memory.
- Multiple toolbars/editors: Ensure unique IDs/selectors.

---

## Troubleshooting

- If you see missing styles, double check you imported `'faddock-superdoc/style.css'`.
- If mounting multiple instances, each one must use a distinct `selector` and `toolbar`.
- If you're using frameworks or bundlers, ensure CSS loader support for style imports.

---

## License

[MIT](./LICENSE)

---

For bug reports, feature requests, or contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).
