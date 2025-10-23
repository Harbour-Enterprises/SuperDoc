import { Tab, TabGroup, TabList, TabPanel } from '@abbvie-unity/react';
import React, { useState } from 'react';
import Page from 'layouts/PageLayout';
import CardsExample from './CardsExample';
import FaddockSuperdocWrapper from './FaddockSuperdocWrapper';

const PageOne = () => {
  const [highlightedText, setHighlightedText] = useState('');

  const handleAddToChat = (text: string) => {
    setHighlightedText(text);
    console.log('AddToChat received:', text);
  };

  return (
    <div className="h-full w-full flex-1 overflow-hidden">
      <FaddockSuperdocWrapper
        onAddToChat={handleAddToChat}
        documents={[
          {
            id: 'demo-doc',
            type: 'docx',
            data: null,
          },
        ]}
      />
    </div>
  );
};

export default PageOne;
