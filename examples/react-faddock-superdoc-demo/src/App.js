import React from 'react';
import FaddockSuperdocWrapper from './FaddockSuperdocWrapper';
import 'faddock-superdoc/style.css';

function App() {
  return (
    <div className="App">
      <h1>FaddockSuperdoc Demo (npm link test)</h1>
      <FaddockSuperdocWrapper documents={[{ id: 'demo-doc', type: 'docx', data: null }]} />
      <div>
        <p>
          To use your linked package, edit <code>src/App.js</code> and import and render your editor!
        </p>
      </div>
    </div>
  );
}

export default App;
