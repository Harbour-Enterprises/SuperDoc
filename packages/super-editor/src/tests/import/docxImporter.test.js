import { addDefaultStylesIfMissing, DEFAULT_LINKED_STYLES } from '@core/super-converter/v2/importer/docxImporter';

describe('addDefaultStylesIfMissing', () => {
  it.each(Object.keys(DEFAULT_LINKED_STYLES))('adds %s as a default style', (styleId) => {
    const styles = {
      declaration: {
        attributes: {
          version: '1.0',
          encoding: 'UTF-8',
          standalone: 'yes',
        },
      },
      elements: [
        {
          type: 'element',
          name: 'w:styles',
          attributes: {
            'xmlns:mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
            'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
            'xmlns:w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
            'xmlns:w16cex': 'http://schemas.microsoft.com/office/word/2018/wordml/cex',
            'xmlns:w16cid': 'http://schemas.microsoft.com/office/word/2016/wordml/cid',
            'xmlns:w16': 'http://schemas.microsoft.com/office/word/2018/wordml',
            'xmlns:w16du': 'http://schemas.microsoft.com/office/word/2023/wordml/word16du',
            'xmlns:w16sdtdh': 'http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash',
            'xmlns:w16sdtfl': 'http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock',
            'xmlns:w16se': 'http://schemas.microsoft.com/office/word/2015/wordml/symex',
            'mc:Ignorable': 'w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du',
          },
          elements: [
            {
              type: 'element',
              name: 'w:docDefaults',
              elements: [
                {
                  type: 'element',
                  name: 'w:rPrDefault',
                  elements: [
                    {
                      type: 'element',
                      name: 'w:rPr',
                      elements: [
                        {
                          type: 'element',
                          name: 'w:rFonts',
                          attributes: {
                            'w:ascii': 'Arial',
                            'w:eastAsiaTheme': 'minorHAnsi',
                            'w:hAnsi': 'Arial',
                            'w:cs': 'Times New Roman (Body CS)',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w:kern',
                          attributes: {
                            'w:val': '2',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w:sz',
                          attributes: {
                            'w:val': '24',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w:szCs',
                          attributes: {
                            'w:val': '24',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w:lang',
                          attributes: {
                            'w:val': 'en-US',
                            'w:eastAsia': 'en-US',
                            'w:bidi': 'ar-SA',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w14:ligatures',
                          attributes: {
                            'w14:val': 'standardContextual',
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'element',
                  name: 'w:pPrDefault',
                },
              ],
            },
            {
              type: 'element',
              name: 'w:latentStyles',
              attributes: {
                'w:defLockedState': '0',
                'w:defUIPriority': '99',
                'w:defSemiHidden': '0',
                'w:defUnhideWhenUsed': '0',
                'w:defQFormat': '0',
                'w:count': '376',
              },
              elements: [
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Normal',
                    'w:uiPriority': '0',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 1',
                    'w:uiPriority': '9',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 2',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 3',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 4',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 5',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 6',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 7',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 8',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'heading 9',
                    'w:semiHidden': '1',
                    'w:uiPriority': '9',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 6',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 7',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 8',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index 9',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 1',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 2',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 3',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 4',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 5',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 6',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 7',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 8',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toc 9',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Normal Indent',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'footnote text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'annotation text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'header',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'footer',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'index heading',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'caption',
                    'w:semiHidden': '1',
                    'w:uiPriority': '35',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'table of figures',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'envelope address',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'envelope return',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'footnote reference',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'annotation reference',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'line number',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'page number',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'endnote reference',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'endnote text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'table of authorities',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'macro',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'toa heading',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Bullet',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Number',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Bullet 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Bullet 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Bullet 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Bullet 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Number 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Number 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Number 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Number 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Title',
                    'w:uiPriority': '10',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Closing',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Signature',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Default Paragraph Font',
                    'w:semiHidden': '1',
                    'w:uiPriority': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text Indent',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Continue',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Continue 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Continue 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Continue 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Continue 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Message Header',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Subtitle',
                    'w:uiPriority': '11',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Salutation',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Date',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text First Indent',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text First Indent 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Note Heading',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text Indent 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Body Text Indent 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Block Text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Hyperlink',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'FollowedHyperlink',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Strong',
                    'w:uiPriority': '22',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Emphasis',
                    'w:uiPriority': '20',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Document Map',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'E-mail Signature',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Top of Form',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Bottom of Form',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Normal (Web)',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Acronym',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Address',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Cite',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Code',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Definition',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Keyboard',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Preformatted',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Sample',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Typewriter',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'HTML Variable',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Normal Table',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'annotation subject',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'No List',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Outline List 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Outline List 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Outline List 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Simple 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Simple 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Simple 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Classic 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Classic 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Classic 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Classic 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Colorful 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Colorful 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Colorful 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Columns 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Columns 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Columns 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Columns 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Columns 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 6',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 7',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid 8',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 4',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 5',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 6',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 7',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table List 8',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table 3D effects 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table 3D effects 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table 3D effects 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Contemporary',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Elegant',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Professional',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Subtle 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Subtle 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Web 1',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Web 2',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Web 3',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Balloon Text',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Grid',
                    'w:uiPriority': '39',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Table Theme',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Placeholder Text',
                    'w:semiHidden': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'No Spacing',
                    'w:uiPriority': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 1',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 1',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 1',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 1',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 1',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 1',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Revision',
                    'w:semiHidden': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Paragraph',
                    'w:uiPriority': '34',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Quote',
                    'w:uiPriority': '29',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Intense Quote',
                    'w:uiPriority': '30',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 1',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 1',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 1',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 1',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 1',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 1',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 1',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 1',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 2',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 2',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 2',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 2',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 2',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 2',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 2',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 2',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 2',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 2',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 2',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 2',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 2',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 2',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 3',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 3',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 3',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 3',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 3',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 3',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 3',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 3',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 3',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 3',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 3',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 3',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 3',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 3',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 4',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 4',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 4',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 4',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 4',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 4',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 4',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 4',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 4',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 4',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 4',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 4',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 4',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 4',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 5',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 5',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 5',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 5',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 5',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 5',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 5',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 5',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 5',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 5',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 5',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 5',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 5',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 5',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Shading Accent 6',
                    'w:uiPriority': '60',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light List Accent 6',
                    'w:uiPriority': '61',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Light Grid Accent 6',
                    'w:uiPriority': '62',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 1 Accent 6',
                    'w:uiPriority': '63',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Shading 2 Accent 6',
                    'w:uiPriority': '64',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 1 Accent 6',
                    'w:uiPriority': '65',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium List 2 Accent 6',
                    'w:uiPriority': '66',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 1 Accent 6',
                    'w:uiPriority': '67',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 2 Accent 6',
                    'w:uiPriority': '68',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Medium Grid 3 Accent 6',
                    'w:uiPriority': '69',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Dark List Accent 6',
                    'w:uiPriority': '70',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Shading Accent 6',
                    'w:uiPriority': '71',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful List Accent 6',
                    'w:uiPriority': '72',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Colorful Grid Accent 6',
                    'w:uiPriority': '73',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Subtle Emphasis',
                    'w:uiPriority': '19',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Intense Emphasis',
                    'w:uiPriority': '21',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Subtle Reference',
                    'w:uiPriority': '31',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Intense Reference',
                    'w:uiPriority': '32',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Book Title',
                    'w:uiPriority': '33',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Bibliography',
                    'w:semiHidden': '1',
                    'w:uiPriority': '37',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'TOC Heading',
                    'w:semiHidden': '1',
                    'w:uiPriority': '39',
                    'w:unhideWhenUsed': '1',
                    'w:qFormat': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Table 1',
                    'w:uiPriority': '41',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Table 2',
                    'w:uiPriority': '42',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Table 3',
                    'w:uiPriority': '43',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Table 4',
                    'w:uiPriority': '44',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Plain Table 5',
                    'w:uiPriority': '45',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table Light',
                    'w:uiPriority': '40',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 1',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 1',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 1',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 1',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 1',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 1',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 1',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 2',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 2',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 2',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 2',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 2',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 2',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 2',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 3',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 3',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 3',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 3',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 3',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 3',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 3',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 4',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 4',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 4',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 4',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 4',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 4',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 4',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 5',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 5',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 5',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 5',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 5',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 5',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 5',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 1 Light Accent 6',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 2 Accent 6',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 3 Accent 6',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 4 Accent 6',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 5 Dark Accent 6',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 6 Colorful Accent 6',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Grid Table 7 Colorful Accent 6',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 1',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 1',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 1',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 1',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 1',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 1',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 1',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 2',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 2',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 2',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 2',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 2',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 2',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 2',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 3',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 3',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 3',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 3',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 3',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 3',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 3',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 4',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 4',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 4',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 4',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 4',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 4',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 4',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 5',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 5',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 5',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 5',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 5',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 5',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 5',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 1 Light Accent 6',
                    'w:uiPriority': '46',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 2 Accent 6',
                    'w:uiPriority': '47',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 3 Accent 6',
                    'w:uiPriority': '48',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 4 Accent 6',
                    'w:uiPriority': '49',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 5 Dark Accent 6',
                    'w:uiPriority': '50',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 6 Colorful Accent 6',
                    'w:uiPriority': '51',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'List Table 7 Colorful Accent 6',
                    'w:uiPriority': '52',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Mention',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Smart Hyperlink',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Hashtag',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Unresolved Mention',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
                {
                  type: 'element',
                  name: 'w:lsdException',
                  attributes: {
                    'w:name': 'Smart Link',
                    'w:semiHidden': '1',
                    'w:unhideWhenUsed': '1',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const result = addDefaultStylesIfMissing(styles);
    const foundStyle = result.elements[0].elements.find(element => element.attributes?.['w:styleId'] === styleId);
    expect(foundStyle).toEqual(DEFAULT_LINKED_STYLES[styleId]);
  });
});
