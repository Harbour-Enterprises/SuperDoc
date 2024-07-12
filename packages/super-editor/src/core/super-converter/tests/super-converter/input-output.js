import { describe, it, expect, beforeEach } from 'vitest';
import { SuperConverter } from '../../SuperConverter.js';
import { Editor } from '../../../Editor.js';
import * as extensions from '@extensions/index.js';

export function runInputOutputTests() {

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * This test uses a known XML input, uses Editor.js to parse the Schema, and then uses
   * Editor.js' exportDocx method to convert the schema back to a docx document. 
   */
  describe('Editor.js and SuperConverter input/output conversion', async () => {
    it('exports the expected output after importing xml, passing through the ProseMirror Schema and exported again', async () => {
      const input = `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex">
          <w:body>
            <w:p w14:paraId="44621174" w14:textId="6D5C378D" w:rsidR="003C58BC" w:rsidRDefault="00746728">
              <w:r>
                <w:t xml:space="preserve">First </w:t>
                <w:t>p</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="44621174" w14:textId="6D5C378D" w:rsidR="003C58BC" w:rsidRDefault="00746728">
              <w:r>
                <w:t>Second p</w:t>
              </w:r>
            </w:p>
            <w:sectPr w:rsidR="00746728">
              <w:pgSz w:w="12240" w:h="15840" />
              <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" />
              <w:cols w:space="720" />
              <w:docGrid w:linePitch="360" />
            </w:sectPr>
          </w:body>
        </w:document>
      `

      const converter = new SuperConverter({ xml: input, debug: true });

      // Declaration check
      const expectedDeclaration = { attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' } };
      expect(converter.declaration).toEqual(expectedDeclaration);

      const initialJSON = { ...converter.initialJSON };
      const containerDiv = document.createElement('div');
      const schema = converter.getSchema();
      const editor = new Editor({
          element: containerDiv,
          content: schema,
          extensions: Object.values(extensions),
          isTest: true,
          converter,
        }
      );

      // Delay to wait for the editor to be ready
      await delay(250);
      const doc = editor.getJSON();
      const output = converter.outputToJson(doc);
      
      expect(initialJSON.declaration).toEqual(output.declaration);

      // Check the doc element. Names and attributes should match.
      const inputDocElement = initialJSON.elements[0];
      const outputDocElement = output.elements[0];
      expect(inputDocElement.name).toEqual(outputDocElement.name);
      expect(inputDocElement.attributes).toEqual(outputDocElement.attributes);
      // console.debug('inputDocElement', inputDocElement.elements);
      // console.debug('outputDocElement', outputDocElement.elements);
      expect(inputDocElement.elements.length).toEqual(outputDocElement.elements.length);

      // Expect the section properties are correctly restored
      expect(inputDocElement.elements[2]).toEqual(outputDocElement.elements[2]);

      // Check the body element. Names and attributes should match.
      // Elements length should match
      const inputBody = inputDocElement.elements[0];
      const outputBody = outputDocElement.elements[0];
      // console.debug('inputBody', inputBody);
      // console.debug('outputBody', outputBody);
      expect(inputBody.name).toEqual(outputBody.name);
      expect(inputBody.attributes).toEqual(outputBody.attributes); 
      expect(inputBody.elements.length).toEqual(outputBody.elements.length);

      const inputBodyElements = inputBody.elements;
      const outputBodyElements = outputBody.elements;
      
      // Check the first element in the result. Expects to find the original paragraph.
      expect(inputBodyElements[0].name).toEqual('w:p');
      expect(inputBodyElements[0].name).toEqual(outputBodyElements[0].name);
      expect(inputBodyElements[0].attributes).toEqual(outputBodyElements[0].attributes);
      expect(inputBodyElements[0].elements.length).toEqual(outputBodyElements[0].elements.length);

      // Check that the run was restored
      const inputFirstRun = inputBodyElements[0].elements[0];
      const outputFirstRun = outputBodyElements[0].elements[0];
      // console.debug('inputFirstRun', inputFirstRun.elements[0]);
      // console.debug('outputFirstRun', outputFirstRun.elements[0]);
      expect(inputFirstRun.name).toEqual('w:r');
      expect(inputFirstRun.name).toEqual(outputFirstRun.name);
      expect(inputFirstRun.attributes).toEqual(outputFirstRun.attributes);
      expect(inputFirstRun.elements.length).toEqual(outputFirstRun.elements.length);
      expect(inputFirstRun.elements[0]).toEqual(outputFirstRun.elements[0]);
      expect(inputFirstRun.elements[1]).toEqual(outputFirstRun.elements[1]);

      // The last element expects to find the sectPr
      expect(inputBodyElements[2].name).toEqual('w:sectPr');
      expect(inputBodyElements[2].name).toEqual(outputBodyElements[2].name);
      expect(inputBodyElements[2].attributes).toEqual(outputBodyElements[2].attributes);
      expect(inputBodyElements[2].elements.length).toEqual(outputBodyElements[2].elements.length);

      // Check the second paragraph
      const inputSecondParagraph = inputBodyElements[1];
      const outputSecondParagraph = outputBodyElements[1];
      // console.debug('inputSecondParagraph', inputSecondParagraph);
      // console.debug('outputSecondParagraph', outputSecondParagraph);
      expect(inputSecondParagraph.name).toEqual('w:p');
      expect(inputSecondParagraph.name).toEqual(outputSecondParagraph.name);
      expect(inputSecondParagraph.attributes).toEqual(outputSecondParagraph.attributes);
      expect(inputSecondParagraph.elements.length).toEqual(outputSecondParagraph.elements.length);
      expect(inputSecondParagraph).toEqual(outputSecondParagraph);

      // Does the entire input JSON equal the entire output JSON?
      // console.debug('INITIAL JSON', JSON.stringify(initialJSON, null, 2));
      // console.debug('OUTPUT JSON', JSON.stringify(output, null, 2));
      expect(initialJSON).toEqual(output);

      // Does the original XML equal the exported XML?
      const XML = converter.schemaToXml(output);
      expect(XML).toEqual(removeExcessWhitespace(input));
    });

    it('can import/output the expected xml with marks', async () => {
      const input = `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex">
          <w:body>
            <w:p w14:paraId="44621174" w14:textId="6D5C378D" w:rsidR="003C58BC" w:rsidRDefault="00746728">
              <w:r>
                <w:t xml:space="preserve">This is a basic docx document with </w:t>
              </w:r>
              <w:r>
                <w:rPr>
                  <w:b />
                  <w:bCs />
                </w:rPr>
                <w:t>bold</w:t>
              </w:r>
            </w:p>
            <w:sectPr w:rsidR="00746728">
              <w:pgSz w:w="12240" w:h="15840" />
              <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" />
              <w:cols w:space="720" />
              <w:docGrid w:linePitch="360" />
            </w:sectPr>
          </w:body>
        </w:document>
      `

      const converter = new SuperConverter({ xml: input, debug: true });

      // Declaration check
      const expectedDeclaration = { attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' } };
      expect(converter.declaration).toEqual(expectedDeclaration);

      const initialJSON = { ...converter.initialJSON };
      const containerDiv = document.createElement('div');
      const schema = converter.getSchema();
      const editor = new Editor({
          element: containerDiv,
          content: schema,
          extensions: Object.values(extensions),
          isTest: true,
          converter,
      });

      // Delay to wait for the editor to be ready
      await delay(250);
      const doc = editor.getJSON();
      const output = converter.outputToJson(doc);
      const inputDocElement = initialJSON.elements[0];
      const outputDocElement = output.elements[0];

      // 
      const inputBody = inputDocElement.elements[0];
      const outputBody = outputDocElement.elements[0];
      const inputParagraph = inputBody.elements[0];
      const outputParagraph = outputBody.elements[0];

      // Check the bold element
      const inputBoldRun = inputParagraph.elements[1];
      const outputBoldRun = outputParagraph.elements[1];
      // console.debug('inputBoldRun', inputBoldRun.elements[0].elements);
      // console.debug('outputBoldRun', outputBoldRun.elements[0].elements);

      expect(inputBoldRun.name).toEqual(outputBoldRun.name);
      expect(inputBoldRun.attributes).toEqual(outputBoldRun.attributes);
      expect(inputBoldRun.elements.length).toEqual(outputBoldRun.elements.length);
      expect(inputBoldRun).toEqual(outputBoldRun);

      // Does the entire input JSON equal the entire output JSON?
      expect(initialJSON).toEqual(output);

      // Does the original XML equal the exported XML?
      const XML = converter.schemaToXml(output);
      // console.debug('XML', XML);
      expect(XML).toEqual(removeExcessWhitespace(input));
    });

    it('can import/output with expected list', async () => {
      const numberingXml = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas">
        <w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0">
          <w:nsid w:val="26C228FA" />
          <w:multiLevelType w:val="hybridMultilevel" />
          <w:tmpl w:val="61961D9E" />
          <w:lvl w:ilvl="0" w:tplc="04090001">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="720" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="1" w:tplc="04090003">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="o" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="1440" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="2" w:tplc="04090005">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="2160" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="2880" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="o" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="3600" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="4320" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="5040" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="o" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="5760" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default" />
            </w:rPr>
          </w:lvl>
          <w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1">
            <w:start w:val="1" />
            <w:numFmt w:val="bullet" />
            <w:lvlText w:val="" />
            <w:lvlJc w:val="left" />
            <w:pPr>
              <w:ind w:left="6480" w:hanging="360" />
            </w:pPr>
            <w:rPr>
              <w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default" />
            </w:rPr>
          </w:lvl>
        </w:abstractNum>
        <w:num w:numId="1" w16cid:durableId="775100301">
          <w:abstractNumId w:val="0" />
        </w:num>
      </w:numbering>
`
      const input = `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document>
          <w:body>
            <w:p w14:paraId="3476A9BD" w14:textId="4D3C51EE" w:rsidR="003C58BC" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="0" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: A</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="37CDE856" w14:textId="04A6D3BD" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="1" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: B</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="66C45FD5" w14:textId="50DEB0D0" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="0" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: C</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="3709ED12" w14:textId="0A320344" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="1" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: D</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="04F6CB86" w14:textId="72446E43" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="2" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L3: E</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="2B93B5C3" w14:textId="5C163631" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="1" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: F</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="6DFE5906" w14:textId="3CA15E8A" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph" />
                <w:numPr>
                  <w:ilvl w:val="0" />
                  <w:numId w:val="1" />
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: G</w:t>
              </w:r>
            </w:p>
            <w:sectPr w:rsidR="00B12030">
              <w:pgSz w:w="12240" w:h="15840" />
              <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720"
                w:footer="720" w:gutter="0" />
              <w:cols w:space="720" />
              <w:docGrid w:linePitch="360" />
            </w:sectPr>
          </w:body>
        </w:document>
      `;

      const converter = new SuperConverter({ xml: input, debug: true });
      const numbering = converter.parseXmlToJson(numberingXml);
      converter.convertedXml['word/numbering.xml'] = numbering;

      // Declaration check
      const expectedDeclaration = { attributes: { version: '1.0', encoding: 'UTF-8', standalone: 'yes' } };
      expect(converter.declaration).toEqual(expectedDeclaration);

      const initialJSON = { ...converter.initialJSON };
      const containerDiv = document.createElement('div');
      const schema = converter.getSchema();
      const editor = new Editor({
          element: containerDiv,
          content: schema,
          extensions: Object.values(extensions),
          isTest: true,
          converter,
      });

      // Delay to wait for the editor to be ready
      await delay(250);
      const doc = editor.getJSON();
      const output = converter.outputToJson(doc);

      const inputBody = initialJSON.elements[0].elements[0];
      const outputBody = output.elements[0].elements[0];
      // console.debug('inputBody', inputBody);
      // console.debug('outputBody', outputBody);

      const inputFirstListElement = inputBody.elements[0];
      const outputFirstListElement = outputBody.elements[0];
      // console.debug('inputFirstListElement', inputFirstListElement);
      // console.debug('outputFirstListElement', outputFirstListElement);

      const inputFirstListRunItem = inputFirstListElement.elements[1];
      const outputFirstListRunItem = outputFirstListElement.elements[1];
      // console.debug('inputFirstListRunItem', inputFirstListRunItem);
      // console.debug('outputFirstListRunItem', outputFirstListRunItem);
      expect(inputFirstListRunItem.name).toEqual('w:r');
      expect(inputFirstListRunItem.name).toEqual(outputFirstListRunItem.name);
      expect(inputFirstListRunItem.attributes).toEqual(outputFirstListRunItem.attributes);
      expect(inputFirstListRunItem.elements.length).toEqual(outputFirstListRunItem.elements.length);
      
      const inputfirstRunElement = inputFirstListRunItem.elements[0];
      const outputFirstRunElement = outputFirstListRunItem.elements[0];
      // console.debug('inputfirstRunElement', inputfirstRunElement);
      // console.debug('outputFirstRunElement', outputFirstRunElement);
      expect(inputfirstRunElement.name).toEqual('w:t');
      expect(inputfirstRunElement.name).toEqual(outputFirstRunElement.name);
      expect(inputfirstRunElement.attributes).toEqual(outputFirstRunElement.attributes);
      expect(inputfirstRunElement.elements.length).toEqual(outputFirstRunElement.elements.length);
      expect(inputfirstRunElement).toEqual(outputFirstRunElement);

      // The second item is a nested list
      const inputFirstNestedList = inputBody.elements[1];
      const outputFirstNestedList = outputBody.elements[1];
      console.debug('inputFirstNestedList', inputFirstNestedList.elements[1].elements[0].elements);
      console.debug('outputFirstNestedList', outputFirstNestedList.elements[1].elements[0].elements);
      // expect(inputFirstNestedList.attributes).toEqual(outputFirstNestedList.attributes);
      // expect(inputFirstNestedList).toEqual(outputFirstNestedList);

      // Full check of JSON
      // expect(initialJSON).toEqual(output);

    });
  });
}; 

/**
 * Used to remove excess whitespace around the test XML strings
 * 
 * @param {string} xmlString 
 * @returns 
 */
function removeExcessWhitespace(xmlString) {
  xmlString = xmlString.trim();
  xmlString = xmlString.replace(/>\s+</g, '><');
  return xmlString;
}