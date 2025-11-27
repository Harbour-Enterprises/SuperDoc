import { generateDocxRandomId } from './generateDocxRandomId';

type ListType = 'bulletList' | 'orderedList' | string;

export function generateDocxListAttributes(listType: ListType) {
  // Our default blank doc definition has the following list types:
  const listTypesMap: Record<'bulletList' | 'orderedList', number> = {
    bulletList: 1,
    orderedList: 2,
  };

  return {
    attributes: {
      parentAttributes: {
        'w14:paraId': generateDocxRandomId(),
        'w14:textId': generateDocxRandomId(),
        'w:rsidR': generateDocxRandomId(),
        'w:rsidRDefault': generateDocxRandomId(),
        'w:rsidP': generateDocxRandomId(),
        paragraphProperties: {
          type: 'element',
          name: 'w:pPr',
          elements: [
            {
              type: 'element',
              name: 'w:pStyle',
              attributes: {
                'w:val': 'ListParagraph',
              },
            },
            {
              type: 'element',
              name: 'w:numPr',
              elements: [
                {
                  type: 'element',
                  name: 'w:ilvl',
                  attributes: {
                    'w:val': '0',
                  },
                },
                {
                  type: 'element',
                  name: 'w:numId',
                  attributes: {
                    'w:val': listTypesMap[listType as 'bulletList' | 'orderedList'] || 0,
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };
}
