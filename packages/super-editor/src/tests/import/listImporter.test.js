import { parseXmlToJson } from '@converter/v2/docxHelper.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';
import { handleListNode } from '@converter/v2/importer/listImporter.js';

describe('table live xml test', () => {
  it('parses simple bullet xml', () => {
    const exampleSingleBulletXml = `
            <w:p w14:paraId="4193DBDF" w14:textId="45C3B4F4" w:rsidR="003C58BC" w:rsidRDefault="004C5EF1" w:rsidP="004C5EF1">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="0"/>
                  <w:numId w:val="2"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>TEXTITEM</w:t>
              </w:r>
            </w:p>
        `;
    const numberingXml = `<w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="21185FC5"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="9E443180"/><w:lvl w:ilvl="0" w:tplc="0409000F"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="2160" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="0409000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="0409000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1" w15:restartNumberingAfterBreak="0"><w:nsid w:val="2C5752F6"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="DFDA535A"/><w:lvl w:ilvl="0" w:tplc="E6C6F4DC"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Aptos" w:cstheme="minorBidi" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2" w15:restartNumberingAfterBreak="0"><w:nsid w:val="5DA83F6B"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="4E3EF8DE"/><w:lvl w:ilvl="0" w:tplc="E6C6F4DC"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Aptos" w:cstheme="minorBidi" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="1360010110"><w:abstractNumId w:val="2"/></w:num><w:num w:numId="2" w16cid:durableId="2043050620"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="3" w16cid:durableId="2013727082"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
    const nodes = parseXmlToJson(exampleSingleBulletXml).elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };

    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('bulletList');
    expect(result.nodes[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].type).toBe('listItem');
    expect(result.nodes[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[0].type).toBe('paragraph');
    expect(result.nodes[0].content[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[0].content[0].type).toBe('text');
    expect(result.nodes[0].content[0].content[0].content[0].text).toBe('TEXTITEM');
  });

  it('parses simple numbered xml', () => {
    const exampleSingleNumberedXml = `
            <w:p w14:paraId="6E8C9275" w14:textId="7B0D8623" w:rsidR="00F07931" w:rsidRDefault="00F07931" w:rsidP="00F07931">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="0"/>
                  <w:numId w:val="3"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>numbered</w:t>
              </w:r>
            </w:p>
            `;
    const numberingXml = `<w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="21185FC5"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="9E443180"/><w:lvl w:ilvl="0" w:tplc="0409000F"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="2160" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="0409000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="0409000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="0409001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1" w15:restartNumberingAfterBreak="0"><w:nsid w:val="2C5752F6"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="DFDA535A"/><w:lvl w:ilvl="0" w:tplc="E6C6F4DC"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Aptos" w:cstheme="minorBidi" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2" w15:restartNumberingAfterBreak="0"><w:nsid w:val="5DA83F6B"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="4E3EF8DE"/><w:lvl w:ilvl="0" w:tplc="E6C6F4DC"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Aptos" w:eastAsiaTheme="minorHAnsi" w:hAnsi="Aptos" w:cstheme="minorBidi" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="1360010110"><w:abstractNumId w:val="2"/></w:num><w:num w:numId="2" w16cid:durableId="2043050620"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="3" w16cid:durableId="2013727082"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
    const nodes = parseXmlToJson(exampleSingleNumberedXml).elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };

    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('orderedList');
    expect(result.nodes[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].type).toBe('listItem');
    expect(result.nodes[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[0].type).toBe('paragraph');
    expect(result.nodes[0].content[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[0].content[0].type).toBe('text');
    expect(result.nodes[0].content[0].content[0].content[0].text).toBe('numbered');
  });

  it('parses multi nested list xml', () => {
    const exampleMultiNestedListXml = `<w:body>
            <w:p w14:paraId="3476A9BD" w14:textId="4D3C51EE" w:rsidR="003C58BC" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="0"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: A</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="37CDE856" w14:textId="04A6D3BD" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="1"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: B</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="66C45FD5" w14:textId="50DEB0D0" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="0"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: C</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="3709ED12" w14:textId="0A320344" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="1"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: D</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="04F6CB86" w14:textId="72446E43" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="2"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L3: E</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="2B93B5C3" w14:textId="5C163631" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="1"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L2: F</w:t>
              </w:r>
            </w:p>
            <w:p w14:paraId="6DFE5906" w14:textId="3CA15E8A" w:rsidR="00B12030" w:rsidRDefault="00B12030" w:rsidP="00B12030">
              <w:pPr>
                <w:pStyle w:val="ListParagraph"/>
                <w:numPr>
                  <w:ilvl w:val="0"/>
                  <w:numId w:val="1"/>
                </w:numPr>
              </w:pPr>
              <w:r>
                <w:t>L1: G</w:t>
              </w:r>
            </w:p>
        </w:body>`;
    const numberingXml = `<w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="26C228FA"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="61961D9E"/><w:lvl w:ilvl="0" w:tplc="04090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04090003"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="04090005"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="04090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="04090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="04090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="775100301"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
    const nodes = parseXmlToJson(exampleMultiNestedListXml).elements[0].elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };

    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].type).toBe('bulletList');
    expect(result.nodes[0].content.length).toBe(3);
    expect(result.nodes[0].content[0].type).toBe('listItem');
    expect(result.nodes[0].content[0].content.length).toBe(2);
    expect(result.nodes[0].content[0].content[0].type).toBe('paragraph');
    expect(result.nodes[0].content[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[0].content[0].type).toBe('text');
    expect(result.nodes[0].content[0].content[0].content[0].text).toBe('L1: A');
    expect(result.nodes[0].content[0].content[1].type).toBe('bulletList');
    expect(result.nodes[0].content[0].content[1].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[1].content[0].type).toBe('listItem');
    expect(result.nodes[0].content[0].content[1].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[1].content[0].content[0].type).toBe('paragraph');
    expect(result.nodes[0].content[0].content[1].content[0].content[0].content.length).toBe(1);
    expect(result.nodes[0].content[0].content[1].content[0].content[0].content[0].type).toBe('text');
    expect(result.nodes[0].content[0].content[1].content[0].content[0].content[0].text).toBe('L2: B');
  });
});

describe('custom nested list tests', () => {
  it('correctly parses list with same ilvl and differnent numid', () => {
    const xml = `
        <w:body>
          <w:p w14:paraId="3947758C" w14:textId="5E21BE66" w:rsidR="00F20DE4" w:rsidRDefault="007B64C8"
            w:rsidP="00F20DE4">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="1" />
              </w:numPr>
              <w:ind w:right="-120" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:t>Root item</w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="057544FE" w14:textId="088A07B0" w:rsidR="00F20DE4" w:rsidRDefault="007B64C8"
            w:rsidP="00F20DE4">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="2" />
              </w:numPr>
              <w:ind w:right="-120" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:proofErr w:type="spellStart" />
            <w:r>
              <w:t>Sublist</w:t>
            </w:r>
            <w:proofErr w:type="spellEnd" />
          </w:p>
          <w:p w14:paraId="7EE48289" w14:textId="77777777" w:rsidR="00F20DE4" w:rsidRDefault="00F20DE4"
            w:rsidP="00F20DE4">
            <w:pPr>
              <w:pBdr>
                <w:top w:val="nil" />
                <w:left w:val="nil" />
                <w:bottom w:val="nil" />
                <w:right w:val="nil" />
                <w:between w:val="nil" />
              </w:pBdr>
              <w:ind w:right="-120" />
              <w:jc w:val="both" />
            </w:pPr>
          </w:p>
          <w:p w14:paraId="1F70BFCD" w14:textId="7B327D38" w:rsidR="00F20DE4" w:rsidRDefault="007B64C8"
            w:rsidP="00F20DE4">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="1" />
              </w:numPr>
              <w:ind w:right="-120" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:t>Root item 2</w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="437AE2E1" w14:textId="53CF061A" w:rsidR="00F20DE4" w:rsidRDefault="007B64C8"
            w:rsidP="00F20DE4">
            <w:pPr>
              <w:widowControl />
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="2" />
              </w:numPr>
              <w:tabs>
                <w:tab w:val="left" w:pos="720" />
              </w:tabs>
              <w:ind w:right="-120" />
            </w:pPr>
            <w:proofErr w:type="spellStart" />
            <w:r>
              <w:t>Sublist</w:t>
            </w:r>
            <w:proofErr w:type="spellEnd" />
            <w:r>
              <w:t xml:space="preserve"> 2</w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="5C5EAF8C" w14:textId="77777777" w:rsidR="003C58BC" w:rsidRDefault="003C58BC" />
          <w:sectPr w:rsidR="003C58BC">
            <w:pgSz w:w="12240" w:h="15840" />
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720"
              w:footer="720" w:gutter="0" />
            <w:cols w:space="720" />
            <w:docGrid w:linePitch="360" />
          </w:sectPr>
        </w:body>
    `;

    const numberingXml = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="323717AD"/><w:multiLevelType w:val="multilevel"/><w:tmpl w:val="FBA2204A"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="3"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="4"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="5"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="7"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="8"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1" w15:restartNumberingAfterBreak="0"><w:nsid w:val="401C399F"/><w:multiLevelType w:val="multilevel"/><w:tmpl w:val="7228CE10"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="180"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="3"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="4"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="5"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="6"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="7"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="8"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="1651446409"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2" w16cid:durableId="329525215"><w:abstractNumId w:val="1"/></w:num></w:numbering>
    `;

    const nodes = parseXmlToJson(xml).elements[0].elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };
    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });

    expect(result.nodes.length).toBe(1);
    const expectedResult = {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '007B64C8',
                textAlign: 'both',
                hasParentIndent: true,
                hasParentSpacing: false,
              },
              content: [
                {
                  type: 'text',
                  text: 'Root item',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [],
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '007B64C8',
                        textAlign: 'both',
                        hasParentIndent: true,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Sublist',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                    {
                      type: 'paragraph',
                      content: [],
                      attrs: {
                        'w14:paraId': '7EE48289',
                        'w14:textId': '77777777',
                        'w:rsidR': '00F20DE4',
                        'w:rsidRDefault': '00F20DE4',
                        'w:rsidP': '00F20DE4',
                        textAlign: 'both',
                        paragraphProperties: {
                          type: 'element',
                          name: 'w:pPr',
                          elements: [
                            {
                              type: 'element',
                              name: 'w:pBdr',
                              elements: [
                                {
                                  type: 'element',
                                  name: 'w:top',
                                  attributes: {
                                    'w:val': 'nil',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:left',
                                  attributes: {
                                    'w:val': 'nil',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:bottom',
                                  attributes: {
                                    'w:val': 'nil',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:right',
                                  attributes: {
                                    'w:val': 'nil',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:between',
                                  attributes: {
                                    'w:val': 'nil',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'element',
                              name: 'w:ind',
                              attributes: {
                                'w:right': '-120',
                              },
                            },
                            {
                              type: 'element',
                              name: 'w:jc',
                              attributes: {
                                'w:val': 'both',
                              },
                            },
                          ],
                        }
                      },
                      marks: [],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '2160',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:val': 'none',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {
                        textAlign: 'both',
                      },
                    },
                    order: '1',
                    lvlText: '○',
                    lvlJc: 'both',
                    indent: { right: -8 },
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '057544FE',
                        'w14:textId': '088A07B0',
                        'w:rsidR': '00F20DE4',
                        'w:rsidRDefault': '007B64C8',
                        'w:rsidP': '00F20DE4',
                        textAlign: 'both',
                        paragraphProperties: {
                          type: 'element',
                          name: 'w:pPr',
                          elements: [
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
                                    'w:val': '2',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'element',
                              name: 'w:ind',
                              attributes: {
                                'w:right': '-120',
                              },
                            },
                            {
                              type: 'element',
                              name: 'w:jc',
                              attributes: {
                                'w:val': 'both',
                              },
                            },
                          ],
                        }
                      },
                    },
                    numId: '2',
                  },
                  marks: [],
                },
              ],
              attrs: {
                'list-style-type': 'lowerLetter',
                listId: '2',
                attributes: {
                  parentAttributes: {
                    'w14:paraId': '057544FE',
                    'w14:textId': '088A07B0',
                    'w:rsidR': '00F20DE4',
                    'w:rsidRDefault': '007B64C8',
                    'w:rsidP': '00F20DE4',
                    textAlign: 'both',
                    paragraphProperties: {
                      type: 'element',
                      name: 'w:pPr',
                      elements: [
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
                                'w:val': '2',
                              },
                            },
                          ],
                        },
                        {
                          type: 'element',
                          name: 'w:ind',
                          attributes: {
                            'w:right': '-120',
                          },
                        },
                        {
                          type: 'element',
                          name: 'w:jc',
                          attributes: {
                            'w:val': 'both',
                          },
                        },
                      ],
                    }
                  },
                },
              },
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            listRunProperties: {
              'w:val': 'none',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {
                textAlign: 'both',
              },
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: 'both',
            indent: { right: -8 },
            listLevel: [1],
            listNumberingType: 'decimal',
            spacing: {},
            attributes: {
              parentAttributes: {
                'w14:paraId': '3947758C',
                'w14:textId': '5E21BE66',
                'w:rsidR': '00F20DE4',
                'w:rsidRDefault': '007B64C8',
                'w:rsidP': '00F20DE4',
                textAlign: 'both',
                paragraphProperties: {
                  type: 'element',
                  name: 'w:pPr',
                  elements: [
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
                            'w:val': '1',
                          },
                        },
                      ],
                    },
                    {
                      type: 'element',
                      name: 'w:ind',
                      attributes: {
                        'w:right': '-120',
                      },
                    },
                    {
                      type: 'element',
                      name: 'w:jc',
                      attributes: {
                        'w:val': 'both',
                      },
                    },
                  ],
                }
              },
            },
            numId: '1',
          },
          marks: [],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '007B64C8',
                textAlign: 'both',
                hasParentIndent: true,
                hasParentSpacing: false,
              },
              content: [
                {
                  type: 'text',
                  text: 'Root item 2',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [],
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '007B64C8',
                        textAlign: null,
                        hasParentIndent: true,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Sublist 2',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '2160',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:val': 'none',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {},
                    },
                    order: '1',
                    lvlText: '○',
                    lvlJc: undefined,
                    indent: { right: -8 },
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '437AE2E1',
                        'w14:textId': '53CF061A',
                        'w:rsidR': '00F20DE4',
                        'w:rsidRDefault': '007B64C8',
                        'w:rsidP': '00F20DE4',
                        paragraphProperties: {
                          type: 'element',
                          name: 'w:pPr',
                          elements: [
                            {
                              type: 'element',
                              name: 'w:widowControl',
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
                                    'w:val': '2',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'element',
                              name: 'w:tabs',
                              elements: [
                                {
                                  type: 'element',
                                  name: 'w:tab',
                                  attributes: {
                                    'w:val': 'left',
                                    'w:pos': '720',
                                  },
                                },
                              ],
                            },
                            {
                              type: 'element',
                              name: 'w:ind',
                              attributes: {
                                'w:right': '-120',
                              },
                            },
                          ],
                        }
                      },
                    },
                    numId: '2',
                  },
                  marks: [],
                },
              ],
              attrs: {
                'list-style-type': 'bullet',
                listId: '2',
                attributes: {
                  parentAttributes: {
                    'w14:paraId': '437AE2E1',
                    'w14:textId': '53CF061A',
                    'w:rsidR': '00F20DE4',
                    'w:rsidRDefault': '007B64C8',
                    'w:rsidP': '00F20DE4',
                    paragraphProperties: {
                      type: 'element',
                      name: 'w:pPr',
                      elements: [
                        {
                          type: 'element',
                          name: 'w:widowControl',
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
                                'w:val': '2',
                              },
                            },
                          ],
                        },
                        {
                          type: 'element',
                          name: 'w:tabs',
                          elements: [
                            {
                              type: 'element',
                              name: 'w:tab',
                              attributes: {
                                'w:val': 'left',
                                'w:pos': '720',
                              },
                            },
                          ],
                        },
                        {
                          type: 'element',
                          name: 'w:ind',
                          attributes: {
                            'w:right': '-120',
                          },
                        },
                      ],
                    }
                  },
                },
              },
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            listRunProperties: {
              'w:val': 'none',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {
                textAlign: 'both',
              },
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: 'both',
            indent: { right: -8 },
            listLevel: [2],
            listNumberingType: 'decimal',
            spacing: {},
            attributes: {
              parentAttributes: {
                'w14:paraId': '1F70BFCD',
                'w14:textId': '7B327D38',
                'w:rsidR': '00F20DE4',
                'w:rsidRDefault': '007B64C8',
                'w:rsidP': '00F20DE4',
                textAlign: 'both',
                paragraphProperties: {
                  type: 'element',
                  name: 'w:pPr',
                  elements: [
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
                            'w:val': '1',
                          },
                        },
                      ],
                    },
                    {
                      type: 'element',
                      name: 'w:ind',
                      attributes: {
                        'w:right': '-120',
                      },
                    },
                    {
                      type: 'element',
                      name: 'w:jc',
                      attributes: {
                        'w:val': 'both',
                      },
                    },
                  ],
                }
              },
            },
            numId: '1',
          },
          marks: [],
        },
      ],
      attrs: {
        'list-style-type': 'bullet',
        listId: '1',
        attributes: {
          parentAttributes: {
            'w14:paraId': '3947758C',
            'w14:textId': '5E21BE66',
            'w:rsidR': '00F20DE4',
            'w:rsidRDefault': '007B64C8',
            'w:rsidP': '00F20DE4',
            textAlign: 'both',
            paragraphProperties: {
              type: 'element',
              name: 'w:pPr',
              elements: [
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
                        'w:val': '1',
                      },
                    },
                  ],
                },
                {
                  type: 'element',
                  name: 'w:ind',
                  attributes: {
                    'w:right': '-120',
                  },
                },
                {
                  type: 'element',
                  name: 'w:jc',
                  attributes: {
                    'w:val': 'both',
                  },
                },
              ],
            }
          },
        },
      },
    };
    expect(result.nodes[0]).toEqual(expectedResult);
  });

  it('custom list separating based on lastNested level', () => {
    const xml = `
        <w:body>
    <w:p w14:paraId="2D072E4D" w14:textId="6AA02906" w:rsidR="00D24516" w:rsidRPr="006B7646"
      w:rsidRDefault="009F090C" w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:lang w:val="en-US" />
        </w:rPr>
        <w:t>First list item</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="2F6FAED3" w14:textId="0C67EEB9" w:rsidR="006B7646" w:rsidRPr="009F090C"
      w:rsidRDefault="006B7646" w:rsidP="006B7646">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="1" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Sub item with bullet 1.1</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="45FC6897" w14:textId="70792836" w:rsidR="009F090C" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Second list item</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="2DBCC378" w14:textId="0DCC976A" w:rsidR="009F090C" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="1" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Sub item with bullet 2.1</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="77BFBBFC" w14:textId="29510437" w:rsidR="009F090C" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Third list item</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="4F17D13D" w14:textId="771EE79A" w:rsidR="009F090C" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="1" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Sub item 3.1</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="01D254E6" w14:textId="3DE0C78B" w:rsidR="006B7646" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="1" />
          <w:numId w:val="1" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Subitem 3.2</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="0611CD56" w14:textId="7C7F96E1" w:rsidR="009F090C" w:rsidRDefault="009F090C"
      w:rsidP="009F090C">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="3" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>New list item</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="514F47A0" w14:textId="65B9BCE5" w:rsidR="006072CA" w:rsidRDefault="009F090C"
      w:rsidP="006072CA">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="3" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>New list item 2</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="3E613D82" w14:textId="77777777" w:rsidR="006072CA" w:rsidRDefault="006072CA"
      w:rsidP="006072CA" />
    <w:p w14:paraId="2FB06515" w14:textId="55DEAE4A" w:rsidR="006072CA" w:rsidRDefault="006072CA"
      w:rsidP="006072CA">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="4" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t>Thirs list 1</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="1900B4A7" w14:textId="21960427" w:rsidR="00EB5CDA" w:rsidRDefault="006072CA"
      w:rsidP="00EB5CDA">
      <w:pPr>
        <w:pStyle w:val="ListParagraph" />
        <w:numPr>
          <w:ilvl w:val="0" />
          <w:numId w:val="4" />
        </w:numPr>
      </w:pPr>
      <w:r>
        <w:t xml:space="preserve">Thirs list </w:t>
      </w:r>
      <w:r>
        <w:t>2</w:t>
      </w:r>
    </w:p>
    <w:p w14:paraId="19FC377D" w14:textId="48B3AABF" w:rsidR="00EB5CDA" w:rsidRDefault="00EB5CDA"
      w:rsidP="00EB5CDA" />
    <w:sectPr w:rsidR="00EB5CDA">
      <w:headerReference w:type="even" r:id="rId7" />
      <w:headerReference w:type="default" r:id="rId8" />
      <w:footerReference w:type="even" r:id="rId9" />
      <w:footerReference w:type="default" r:id="rId10" />
      <w:headerReference w:type="first" r:id="rId11" />
      <w:footerReference w:type="first" r:id="rId12" />
      <w:pgSz w:w="11906" w:h="16838" />
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708"
        w:footer="708" w:gutter="0" />
      <w:cols w:space="708" />
      <w:docGrid w:linePitch="360" />
    </w:sectPr>
  </w:body>
    `;

    const numberingXml = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="18CA3385"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="80F481F2"/><w:lvl w:ilvl="0" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1" w15:restartNumberingAfterBreak="0"><w:nsid w:val="3A797FE8"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="60E6DC90"/><w:lvl w:ilvl="0" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7920" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2" w15:restartNumberingAfterBreak="0"><w:nsid w:val="45B43D5D"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="D5803A5A"/><w:lvl w:ilvl="0" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7920" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="3" w15:restartNumberingAfterBreak="0"><w:nsid w:val="49BE416E"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="CC6E2BC6"/><w:lvl w:ilvl="0" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="08090001" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090003" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="08090005" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7920" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="4" w15:restartNumberingAfterBreak="0"><w:nsid w:val="4DAB50A8"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="FAF65F4C"/><w:lvl w:ilvl="0" w:tplc="0809000F"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0809001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="2160" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="0809000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="0809001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="0809000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="0809001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="5" w15:restartNumberingAfterBreak="0"><w:nsid w:val="52967CCE"/><w:multiLevelType w:val="multilevel"/><w:tmpl w:val="87FC5BEE"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="180"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="3"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="4"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="5"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="6"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="●"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="7"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="○"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl><w:lvl w:ilvl="8"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="■"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="7200" w:hanging="360"/></w:pPr><w:rPr><w:u w:val="none"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="6" w15:restartNumberingAfterBreak="0"><w:nsid w:val="54446DD8"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="B3D0D1FE"/><w:lvl w:ilvl="0" w:tplc="0809000F"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0809001B"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="2160" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="0809000F"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="08090019"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="0809001B"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="0809000F" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="08090019" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="0809001B" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="7" w15:restartNumberingAfterBreak="0"><w:nsid w:val="79AA3BB1"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="4D6C83DC"/><w:lvl w:ilvl="0" w:tplc="FFFFFFFF"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="08090001"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2340" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="4320" w:hanging="180"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="FFFFFFFF" w:tentative="1"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="right"/><w:pPr><w:ind w:left="6480" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="62340478"><w:abstractNumId w:val="6"/></w:num><w:num w:numId="2" w16cid:durableId="734864506"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="3" w16cid:durableId="1834485334"><w:abstractNumId w:val="4"/></w:num><w:num w:numId="4" w16cid:durableId="942373920"><w:abstractNumId w:val="7"/></w:num><w:num w:numId="5" w16cid:durableId="1762985658"><w:abstractNumId w:val="5"/></w:num><w:num w:numId="6" w16cid:durableId="1609195294"><w:abstractNumId w:val="3"/></w:num><w:num w:numId="7" w16cid:durableId="984316637"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="8" w16cid:durableId="1697384402"><w:abstractNumId w:val="2"/></w:num></w:numbering>
    `;

    const nodes = parseXmlToJson(xml).elements[0].elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };
    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });
    const expectedResult = {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '009F090C',
                styleId: 'ListParagraph',
                textAlign: null,
                hasParentIndent: false,
                hasParentSpacing: false,
              },
              content: [
                {
                  type: 'text',
                  text: 'First list item',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {},
                    },
                  ],
                  attributes: {},
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '006B7646',
                        styleId: 'ListParagraph',
                        textAlign: null,
                        hasParentIndent: false,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Sub item with bullet 1.1',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '1440',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:ascii': 'Symbol',
                      'w:hAnsi': 'Symbol',
                      'w:hint': 'default',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {},
                    },
                    order: '1',
                    lvlText: '',
                    lvlJc: undefined,
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '2F6FAED3',
                        'w14:textId': '0C67EEB9',
                        'w:rsidR': '006B7646',
                        'w:rsidRPr': '009F090C',
                        'w:rsidRDefault': '006B7646',
                        'w:rsidP': '006B7646',
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
                                    'w:val': '1',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:numId',
                                  attributes: {
                                    'w:val': '1',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    numId: '1',
                  },
                  marks: [],
                },
              ],
              attrs: {
                'list-style-type': 'bullet',
                listId: '1',
                attributes: {
                  parentAttributes: {
                    'w14:paraId': '2F6FAED3',
                    'w14:textId': '0C67EEB9',
                    'w:rsidR': '006B7646',
                    'w:rsidRPr': '009F090C',
                    'w:rsidRDefault': '006B7646',
                    'w:rsidP': '006B7646',
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
                                'w:val': '1',
                              },
                            },
                            {
                              type: 'element',
                              name: 'w:numId',
                              attributes: {
                                'w:val': '1',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {},
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: undefined,
            listLevel: [1],
            listNumberingType: 'decimal',
            spacing: {},
            attributes: {
              parentAttributes: {
                'w14:paraId': '2D072E4D',
                'w14:textId': '6AA02906',
                'w:rsidR': '00D24516',
                'w:rsidRPr': '006B7646',
                'w:rsidRDefault': '009F090C',
                'w:rsidP': '009F090C',
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
                            'w:val': '1',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            numId: '1',
          },
          marks: [],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '009F090C',
                styleId: 'ListParagraph',
                textAlign: null,
                hasParentIndent: false,
                hasParentSpacing: false,
              },
              content: [
                {
                  type: 'text',
                  text: 'Second list item',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [],
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '009F090C',
                        styleId: 'ListParagraph',
                        textAlign: null,
                        hasParentIndent: false,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Sub item with bullet 2.1',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '1440',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:ascii': 'Symbol',
                      'w:hAnsi': 'Symbol',
                      'w:hint': 'default',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {},
                    },
                    order: '1',
                    lvlText: '',
                    lvlJc: undefined,
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '2DBCC378',
                        'w14:textId': '0DCC976A',
                        'w:rsidR': '009F090C',
                        'w:rsidRDefault': '009F090C',
                        'w:rsidP': '009F090C',
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
                                    'w:val': '1',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:numId',
                                  attributes: {
                                    'w:val': '1',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    numId: '1',
                  },
                  marks: [],
                },
              ],
              attrs: {
                'list-style-type': 'bullet',
                listId: '1',
                attributes: {
                  parentAttributes: {
                    'w14:paraId': '2DBCC378',
                    'w14:textId': '0DCC976A',
                    'w:rsidR': '009F090C',
                    'w:rsidRDefault': '009F090C',
                    'w:rsidP': '009F090C',
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
                                'w:val': '1',
                              },
                            },
                            {
                              type: 'element',
                              name: 'w:numId',
                              attributes: {
                                'w:val': '1',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {},
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: undefined,
            listLevel: [2],
            listNumberingType: 'decimal',
            spacing: {},
            attributes: {
              parentAttributes: {
                'w14:paraId': '45FC6897',
                'w14:textId': '70792836',
                'w:rsidR': '009F090C',
                'w:rsidRDefault': '009F090C',
                'w:rsidP': '009F090C',
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
                            'w:val': '1',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            numId: '1',
          },
          marks: [],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '009F090C',
                styleId: 'ListParagraph',
                textAlign: null,
                hasParentIndent: false,
                hasParentSpacing: false,
              },
              content: [
                {
                  type: 'text',
                  text: 'Third list item',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [],
                },
              ],
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '009F090C',
                        styleId: 'ListParagraph',
                        textAlign: null,
                        hasParentIndent: false,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Sub item 3.1',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '1440',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:ascii': 'Symbol',
                      'w:hAnsi': 'Symbol',
                      'w:hint': 'default',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {},
                    },
                    order: '1',
                    lvlText: '',
                    lvlJc: undefined,
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '4F17D13D',
                        'w14:textId': '771EE79A',
                        'w:rsidR': '009F090C',
                        'w:rsidRDefault': '009F090C',
                        'w:rsidP': '009F090C',
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
                                    'w:val': '1',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:numId',
                                  attributes: {
                                    'w:val': '1',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    numId: '1',
                  },
                  marks: [],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      attrs: {
                        rsidRDefault: '009F090C',
                        textAlign: null,
                        styleId: 'ListParagraph',
                        hasParentIndent: false,
                        hasParentSpacing: false,
                      },
                      content: [
                        {
                          type: 'text',
                          text: 'Subitem 3.2',
                          attrs: {
                            type: 'element',
                            attributes: {},
                          },
                          marks: [],
                        },
                      ],
                    },
                  ],
                  attrs: {
                    listParagraphProperties: {
                      'w:left': '1440',
                      'w:hanging': '360',
                    },
                    listRunProperties: {
                      'w:ascii': 'Symbol',
                      'w:hAnsi': 'Symbol',
                      'w:hint': 'default',
                    },
                    textStyle: {
                      type: 'textStyle',
                      attrs: {},
                    },
                    order: '1',
                    lvlText: '',
                    lvlJc: undefined,
                    listLevel: [],
                    listNumberingType: 'bullet',
                    spacing: {},
                    attributes: {
                      parentAttributes: {
                        'w14:paraId': '01D254E6',
                        'w14:textId': '3DE0C78B',
                        'w:rsidR': '006B7646',
                        'w:rsidRDefault': '009F090C',
                        'w:rsidP': '009F090C',
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
                                    'w:val': '1',
                                  },
                                },
                                {
                                  type: 'element',
                                  name: 'w:numId',
                                  attributes: {
                                    'w:val': '1',
                                  },
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    numId: '1',
                  },
                  marks: [],
                },
              ],
              attrs: {
                'list-style-type': 'lowerLetter',
                listId: '1',
                attributes: {
                  parentAttributes: {
                    'w14:paraId': '4F17D13D',
                    'w14:textId': '771EE79A',
                    'w:rsidR': '009F090C',
                    'w:rsidRDefault': '009F090C',
                    'w:rsidP': '009F090C',
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
                                'w:val': '1',
                              },
                            },
                            {
                              type: 'element',
                              name: 'w:numId',
                              attributes: {
                                'w:val': '1',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {},
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: undefined,
            listLevel: [3],
            listNumberingType: 'decimal',
            spacing: {},
            attributes: {
              parentAttributes: {
                'w14:paraId': '77BFBBFC',
                'w14:textId': '29510437',
                'w:rsidR': '009F090C',
                'w:rsidRDefault': '009F090C',
                'w:rsidP': '009F090C',
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
                            'w:val': '1',
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            numId: '1',
          },
          marks: [],
        },
      ],
      attrs: {
        'list-style-type': 'decimal',
        listId: '1',
        attributes: {
          parentAttributes: {
            'w14:paraId': '2D072E4D',
            'w14:textId': '6AA02906',
            'w:rsidR': '00D24516',
            'w:rsidRPr': '006B7646',
            'w:rsidRDefault': '009F090C',
            'w:rsidP': '009F090C',
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
                        'w:val': '1',
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    expect(result.nodes).toEqual([expectedResult]);
  });

  it('correctly uses same-level-different-list rule to separate lists', () => {
    const xml = `
      <w:body>
          <w:p w14:paraId="2BEDC1A3" w14:textId="5CB1141A" w:rsidR="008023B5" w:rsidRDefault="00B266A8">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="2" />
              </w:numPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>Item 1.</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t> </w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="5B2A65ED" w14:textId="77777777" w:rsidR="008023B5" w:rsidRDefault="008023B5">
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
            </w:pPr>
          </w:p>
          <w:p w14:paraId="04951B87" w14:textId="4A428501" w:rsidR="008023B5" w:rsidRDefault="00B266A8">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="3" />
              </w:numPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:b />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>Item 2</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:b />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>.</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t> </w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="674DC921" w14:textId="14D6AFEF" w:rsidR="008023B5" w:rsidRDefault="00B266A8">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="1" />
                <w:numId w:val="3" />
              </w:numPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>Sublist a</w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="2E29F4F2" w14:textId="79F7C921" w:rsidR="008023B5" w:rsidRDefault="00B266A8">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="1" />
                <w:numId w:val="3" />
              </w:numPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>Sublist b</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t> </w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="1AA6A85B" w14:textId="77777777" w:rsidR="008023B5" w:rsidRDefault="008023B5">
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
            </w:pPr>
          </w:p>
          <w:p w14:paraId="069566A1" w14:textId="14264A19" w:rsidR="008023B5" w:rsidRDefault="00B266A8">
            <w:pPr>
              <w:numPr>
                <w:ilvl w:val="0" />
                <w:numId w:val="4" />
              </w:numPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
              <w:jc w:val="both" />
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:b />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>Item 3</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:b />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t>.</w:t>
            </w:r>
            <w:r w:rsidR="00E8411A">
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial" />
                <w:sz w:val="21" />
              </w:rPr>
              <w:t xml:space="preserve"> </w:t>
            </w:r>
          </w:p>
          <w:p w14:paraId="2C8EF17A" w14:textId="77777777" w:rsidR="008023B5" w:rsidRDefault="008023B5">
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
            </w:pPr>
          </w:p>
          <w:p w14:paraId="02612125" w14:textId="77777777" w:rsidR="008023B5" w:rsidRDefault="008023B5">
            <w:pPr>
              <w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto" />
            </w:pPr>
          </w:p>
          <w:sectPr w:rsidR="008023B5">
            <w:pgSz w:w="11906" w:h="16838" />
            <w:pgMar w:top="1134" w:right="907" w:bottom="1134" w:left="907" w:header="720" w:footer="720"
              w:gutter="0" />
            <w:cols w:space="720" />
          </w:sectPr>
        </w:body>
    `;

    const numberingXml = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:numbering xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:oel="http://schemas.microsoft.com/office/2019/extlst" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du" xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16du wp14"><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:nsid w:val="06995094"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="178A8316"/><w:lvl w:ilvl="0" w:tplc="623E6CF0"><w:start w:val="4"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="A420FB92"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="9A9AB01A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="6CBE4C3E"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="3ECC611C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="D02A81C4"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="BEA084E2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="52A04FFA"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="AAE6EE5A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1" w15:restartNumberingAfterBreak="0"><w:nsid w:val="08AB3155"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="6AF6EC8C"/><w:lvl w:ilvl="0" w:tplc="4BD6E966"><w:start w:val="9"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="86A04EC0"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="8C529842"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="C7849254"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="30FA6756"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="E08C1218"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="767273F0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="17ECF6E0"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="92345726"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2" w15:restartNumberingAfterBreak="0"><w:nsid w:val="0BAC7EE6"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="19D0B7BA"/><w:lvl w:ilvl="0" w:tplc="EAA6651A"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="04209D60"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="DAC2DD18"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="87402954"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="BEAEA5CE"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="604EF360"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="375C4518"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="0A388BBE"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="9F76F1AC"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="3" w15:restartNumberingAfterBreak="0"><w:nsid w:val="0F1E1F3D"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="4322EFA2"/><w:lvl w:ilvl="0" w:tplc="B9CA25F8"><w:start w:val="8"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="03F63A10"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="DD6E6ADA"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="C7BE6A3A"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="8D2C36BE"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="6C2434AC"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="F83A8320"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="C1961AE8"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="8C76EC6E"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="4" w15:restartNumberingAfterBreak="0"><w:nsid w:val="10984F93"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="0CF2053C"/><w:lvl w:ilvl="0" w:tplc="4126BBE4"><w:start w:val="6"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="9CA4EC5A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="D03C3AF6"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="6E124336"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="E228D458"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="CA2C7FFA"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="10EC76D2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="E4F899F6"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="F44E0E30"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="5" w15:restartNumberingAfterBreak="0"><w:nsid w:val="15CF5412"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="1ABE3A46"/><w:lvl w:ilvl="0" w:tplc="DBC22E90"><w:start w:val="5"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="BFA6FC7C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="DA2C897A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="85023656"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="EA729B40"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="5FC4570C"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="F0E89530"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="DD3E3CBA"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="1DB05C5C"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="6" w15:restartNumberingAfterBreak="0"><w:nsid w:val="1B2A5923"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="D004A912"/><w:lvl w:ilvl="0" w:tplc="C846E0DE"><w:start w:val="12"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="640E002C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="D04231B0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="7EB2F2F6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="74043A04"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="39C46734"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="AF1659E4"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="09BCD668"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="F7786632"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="7" w15:restartNumberingAfterBreak="0"><w:nsid w:val="2430014E"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="639605CC"/><w:lvl w:ilvl="0" w:tplc="C32ACE4C"><w:start w:val="13"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="F062A52C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0B3C3A54"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="11F8998E"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="4210DAC2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="F780B5B8"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="EF484CBC"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="378A3B62"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="A9DE1602"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="8" w15:restartNumberingAfterBreak="0"><w:nsid w:val="2B563C14"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="39365732"/><w:lvl w:ilvl="0" w:tplc="987E9EC0"><w:start w:val="3"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="AB72CEE6"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="D8549C66"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="5F0238B6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="23CA824A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="EB1C492C"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="931E760C"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="46745C46"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="4A64304C"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="9" w15:restartNumberingAfterBreak="0"><w:nsid w:val="3FEE5D1E"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="086EC15A"/><w:lvl w:ilvl="0" w:tplc="4E9894E8"><w:start w:val="10"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="3030E6A6"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="26C22844"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="27100F52"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="3D0E9866"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="E83A7A5E"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="037E38E6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="62CA4A7A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="93DA9748"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="10" w15:restartNumberingAfterBreak="0"><w:nsid w:val="42A14E35"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="FDFC6220"/><w:lvl w:ilvl="0" w:tplc="CE66ADF6"><w:start w:val="2"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="3DC0399C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="901856EC"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="33662670"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="D8D63EBE"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="5D46DBDC"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="361C4CC8"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="F6E8DF8A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="74FEA07A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="11" w15:restartNumberingAfterBreak="0"><w:nsid w:val="44D607F4"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="7A963946"/><w:lvl w:ilvl="0" w:tplc="94B2D6F2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="9FC4AA10"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="B88A31DA"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="D834CA5A"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="81A28BC8"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="061231BA"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="10E45154"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="85385B6A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="4EEAD7B2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="12" w15:restartNumberingAfterBreak="0"><w:nsid w:val="53187B56"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="AA66B98C"/><w:lvl w:ilvl="0" w:tplc="E384D126"><w:start w:val="14"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="56F8BD3A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="CD2237B0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="E8FE09EE"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="3EBC2634"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="FA60D75E"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="B1DA95E8"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="55284884"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="67DCE3D0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="13" w15:restartNumberingAfterBreak="0"><w:nsid w:val="538D04CE"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="16D0A02C"/><w:lvl w:ilvl="0" w:tplc="3634D478"><w:start w:val="18"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="B2201544"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="4FA04526"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="2F620CCE"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="B7887560"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="73BC7F8A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="6E0423A2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="67E63FAE"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="6352D8FC"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="14" w15:restartNumberingAfterBreak="0"><w:nsid w:val="551E1ABC"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="A5E81E2A"/><w:lvl w:ilvl="0" w:tplc="7FFED9B0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="1" w:tplc="DFE0269A"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="2" w:tplc="40C4FC74"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="3" w:tplc="7836168A"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:cs="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="4" w:tplc="09EAB094"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="5" w:tplc="CDA00392"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="6" w:tplc="6CEE5934"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:cs="Symbol" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="7" w:tplc="A67C89A2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/></w:rPr></w:lvl><w:lvl w:ilvl="8" w:tplc="9A60F3EE"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:cs="Wingdings" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="15" w15:restartNumberingAfterBreak="0"><w:nsid w:val="572A1BA9"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="A2E4B6B4"/><w:lvl w:ilvl="0" w:tplc="8F44C83A"><w:start w:val="7"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="D0525732"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="7A22FF84"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="05C8478E"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="8B18AB90"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="49FA5FC8"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="ED84A136"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="46BE78EC"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="95185D24"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="16" w15:restartNumberingAfterBreak="0"><w:nsid w:val="597F2DCE"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="FE28098C"/><w:lvl w:ilvl="0" w:tplc="7CB47B18"><w:start w:val="11"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="D5E42F8A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0A908666"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="736A2C16"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="B8E6CA74"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="46D6FAE2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="64E89C66"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="5E404D6E"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="E0EC3AD0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="17" w15:restartNumberingAfterBreak="0"><w:nsid w:val="599025AA"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="6A0E3156"/><w:lvl w:ilvl="0" w:tplc="15CC83C0"><w:start w:val="17"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="E4F4E274"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="001A2160"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="A64AF374"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="72BE801C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="222EC0C0"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="181655FA"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="DB64116E"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="1632C022"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="18" w15:restartNumberingAfterBreak="0"><w:nsid w:val="5B4116D5"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="28826040"/><w:lvl w:ilvl="0" w:tplc="155229BE"><w:start w:val="20"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="A6C43AD2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="EA2402C2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="27B22B76"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="9676A4D4"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="EFFE77C4"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="F86282E2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="AEEE64D6"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="D9844E0E"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="19" w15:restartNumberingAfterBreak="0"><w:nsid w:val="6191546C"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="FF5E7D40"/><w:lvl w:ilvl="0" w:tplc="9E6C44A2"><w:start w:val="15"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="4FAE5BB2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="0EBC849E"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="3EDCD700"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="D04A1DDC"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="D98A1316"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="A41A1826"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="F1C485A6"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="D2BCFE4A"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="20" w15:restartNumberingAfterBreak="0"><w:nsid w:val="6B237598"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="1BFCF7FE"/><w:lvl w:ilvl="0" w:tplc="67F6E028"><w:start w:val="21"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="076E4B40"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="641E4114"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="03D8D62C"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="16424A1A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="5D66A108"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="460EE5CE"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="8DDE171A"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="9DFAEEF2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="21" w15:restartNumberingAfterBreak="0"><w:nsid w:val="75005910"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="2BBE9DBC"/><w:lvl w:ilvl="0" w:tplc="C49871B0"><w:start w:val="19"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="DAC0B4CC"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="9FA06836"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="7D76B58C"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="41D26D90"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="9AA42E22"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="3C3E91C6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="ECFAF610"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="74346A74"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="22" w15:restartNumberingAfterBreak="0"><w:nsid w:val="7DD82A1A"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="DAFA473C"/><w:lvl w:ilvl="0" w:tplc="35820708"><w:start w:val="16"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1" w:tplc="3C1A45C8"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2" w:tplc="A0463BF4"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="3" w:tplc="4E1C0DC6"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%4."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2880" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="4" w:tplc="A9FEF22C"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%5."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="3600" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="5" w:tplc="17267338"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%6."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="4320" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="6" w:tplc="A3D24A3E"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%7."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5040" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="7" w:tplc="957AF372"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%8."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="5760" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="8" w:tplc="F9A01584"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%9."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="6480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1" w16cid:durableId="770903303"><w:abstractNumId w:val="14"/></w:num><w:num w:numId="2" w16cid:durableId="1835561247"><w:abstractNumId w:val="2"/></w:num><w:num w:numId="3" w16cid:durableId="1911504509"><w:abstractNumId w:val="10"/></w:num><w:num w:numId="4" w16cid:durableId="100302779"><w:abstractNumId w:val="8"/></w:num><w:num w:numId="5" w16cid:durableId="1941646448"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="6" w16cid:durableId="452133464"><w:abstractNumId w:val="5"/></w:num><w:num w:numId="7" w16cid:durableId="1172641049"><w:abstractNumId w:val="4"/></w:num><w:num w:numId="8" w16cid:durableId="1822236441"><w:abstractNumId w:val="15"/></w:num><w:num w:numId="9" w16cid:durableId="1430353820"><w:abstractNumId w:val="3"/></w:num><w:num w:numId="10" w16cid:durableId="782849580"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="11" w16cid:durableId="1330400444"><w:abstractNumId w:val="9"/></w:num><w:num w:numId="12" w16cid:durableId="2071297507"><w:abstractNumId w:val="16"/></w:num><w:num w:numId="13" w16cid:durableId="387386216"><w:abstractNumId w:val="6"/></w:num><w:num w:numId="14" w16cid:durableId="1631326694"><w:abstractNumId w:val="7"/></w:num><w:num w:numId="15" w16cid:durableId="392193306"><w:abstractNumId w:val="12"/></w:num><w:num w:numId="16" w16cid:durableId="1203665039"><w:abstractNumId w:val="19"/></w:num><w:num w:numId="17" w16cid:durableId="1011444408"><w:abstractNumId w:val="22"/></w:num><w:num w:numId="18" w16cid:durableId="855581725"><w:abstractNumId w:val="17"/></w:num><w:num w:numId="19" w16cid:durableId="307322644"><w:abstractNumId w:val="13"/></w:num><w:num w:numId="20" w16cid:durableId="1842430768"><w:abstractNumId w:val="21"/></w:num><w:num w:numId="21" w16cid:durableId="264458428"><w:abstractNumId w:val="18"/></w:num><w:num w:numId="22" w16cid:durableId="585071361"><w:abstractNumId w:val="20"/></w:num><w:num w:numId="23" w16cid:durableId="1697533903"><w:abstractNumId w:val="11"/></w:num></w:numbering>
    `;

    const nodes = parseXmlToJson(xml).elements[0].elements;
    const numbering = parseXmlToJson(numberingXml);
    const docx = {
      'word/numbering.xml': numbering,
    };
    const result = handleListNode({ nodes, docx, nodeListHandler: defaultNodeListHandler(), lists: {} });

    const expectedResult = {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              attrs: {
                rsidRDefault: '00B266A8',
                hasParentIndent: false,
                hasParentSpacing: true,
                textAlign: 'both'
              },
              content: [
                {
                  type: 'text',
                  text: 'Item 1.',
                  attrs: {
                    type: 'element',
                    attributes: {},
                  },
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        fontFamily: 'Arial',
                        fontSize: '10.5pt',
                      },
                    },
                  ],
                  attributes: {},
                },
              ],
            },
            {
              type: 'paragraph',
              content: [],
              attrs: {
                'w14:paraId': '5B2A65ED',
                'w14:textId': '77777777',
                'w:rsidR': '008023B5',
                'w:rsidRDefault': '008023B5',
                paragraphProperties: {
                  type: 'element',
                  name: 'w:pPr',
                  elements: [
                    {
                      type: 'element',
                      name: 'w:spacing',
                      attributes: {
                        'w:before': '0',
                        'w:after': '0',
                        'w:line': '276',
                        'w:lineRule': 'auto',
                      },
                    },
                  ],
                },
                lineHeight: '1.15',
              },
              marks: [],
            },
          ],
          attrs: {
            listParagraphProperties: {
              'w:left': '720',
              'w:hanging': '360',
            },
            textStyle: {
              type: 'textStyle',
              attrs: {
                lineHeight: '1.15',
                textAlign: 'both',
              },
            },
            order: '1',
            lvlText: '%1.',
            lvlJc: 'both',
            listLevel: [1],
            listNumberingType: 'decimal',
            spacing: {
              line: 1.15,
              lineRule: 'auto',
              lineSpaceAfter: 0,
              lineSpaceBefore: 0,
            },
            attributes: {
              parentAttributes: {
                'w14:paraId': '2BEDC1A3',
                'w14:textId': '5CB1141A',
                'w:rsidR': '008023B5',
                'w:rsidRDefault': '00B266A8',
                paragraphProperties: {
                  type: 'element',
                  name: 'w:pPr',
                  elements: [
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
                            'w:val': '2',
                          },
                        },
                      ],
                    },
                    {
                      type: 'element',
                      name: 'w:spacing',
                      attributes: {
                        'w:before': '0',
                        'w:after': '0',
                        'w:line': '276',
                        'w:lineRule': 'auto',
                      },
                    },
                    {
                      type: 'element',
                      name: 'w:jc',
                      attributes: {
                        'w:val': 'both',
                      },
                    },
                  ],
                },
                lineHeight: '1.15',
              },
            },
            numId: '2',
          },
          marks: [],
        },
      ],
      attrs: {
        'list-style-type': 'decimal',
        listId: '2',
        attributes: {
          parentAttributes: {
            'w14:paraId': '2BEDC1A3',
            'w14:textId': '5CB1141A',
            'w:rsidR': '008023B5',
            'w:rsidRDefault': '00B266A8',
            paragraphProperties: {
              type: 'element',
              name: 'w:pPr',
              elements: [
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
                        'w:val': '2',
                      },
                    },
                  ],
                },
                {
                  type: 'element',
                  name: 'w:spacing',
                  attributes: {
                    'w:before': '0',
                    'w:after': '0',
                    'w:line': '276',
                    'w:lineRule': 'auto',
                  },
                },
                {
                  type: 'element',
                  name: 'w:jc',
                  attributes: {
                    'w:val': 'both',
                  },
                },
              ],
            },
            lineHeight: '1.15',
          },
        },
      },
    };

    expect(result.nodes).toEqual([expectedResult]);
  });
});
