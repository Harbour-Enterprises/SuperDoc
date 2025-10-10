# React Demo: Faddock-Superdoc Editor

## Purpose
Demo React app to manually test the local faddock-superdoc npm package via `npm link`.

## How to Use

### 1. Build & Link faddock-superdoc
```bash
cd ../../packages/faddock-superdoc
npm run build
npm link
```

### 2. Link the Editor Inside the Demo
```bash
cd ../../examples/react-faddock-superdoc-demo
npm link faddock-superdoc
```

### 3. Start the React Demo
```bash
npm start
```

## Usage Example
Edit `src/App.js` to import and use your editor:
```jsx
import React from 'react';
import { SuperDoc } from 'faddock-superdoc'; // If you export it as SuperDoc
import 'faddock-superdoc/style.css'; // Editor styles (adjust path if needed)

function App() {
  return (
    <div>
      <h1>FaddockSuperdoc Editor Test</h1>
      <SuperDoc selector="#superdoc" documents={[{ id: 'demo-doc', type: 'docx', data: null }]} />
    </div>
  );
}

export default App;
```

---

- If you use a UMD global, do:
```jsx
const SuperDoc = window.SuperDoc;
//... and render accordingly
```
- If your package exports a web component, see the main package README for how to register and use it in React.

## Notes
- If you update the editor package code, rerun `npm run build` in the package, and restart the React app.
- Fix peer dependencies/errors as needed as you test.
