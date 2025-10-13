import React from 'react';
import FaddockSuperdocWrapper from './FaddockSuperdocWrapper';
import 'faddock-superdoc/style.css';

function App() {
  return (
    <div className="App">
      <FaddockSuperdocWrapper documents={[{ id: 'demo-doc', type: 'docx', data: null }]} />
    </div>
  );
}

export default App;
