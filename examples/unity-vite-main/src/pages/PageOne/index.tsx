import { Tab, TabGroup, TabList, TabPanel } from '@abbvie-unity/react';
import Page from 'layouts/PageLayout';
import CardsExample from './CardsExample';
import FaddockSuperdocWrapper from './FaddockSuperdocWrapper';
const PageOne = () => {
  return (
    <div className="h-full w-full flex-1 overflow-hidden">
      <FaddockSuperdocWrapper
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
