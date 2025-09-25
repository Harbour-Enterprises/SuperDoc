import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach } from 'vitest';
import DocxZipper from './DocxZipper';
import JSZip from 'jszip';

async function readFileAsBuffer(filePath) {
  const resolvedPath = path.resolve(__dirname, filePath);
  return new Promise((resolve, reject) => {
    fs.readFile(resolvedPath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        // Convert file content to a Buffer
        const buffer = Buffer.from(data);
        resolve(buffer);
      }
    });
  });
}

describe('DocxZipper - file extraction', () => {
  let zipper;
  beforeEach(() => {
    zipper = new DocxZipper();
  });

  it('It can unzip a docx', async () => {
    const fileContent = await readFileAsBuffer('../tests/data/Hello docx world.docx');
    const fileObject = Buffer.from(fileContent);
    const unzippedXml = await zipper.unzip(fileObject);
    expect(unzippedXml).toHaveProperty('files');
  });

  it('It can extract xml files', async () => {
    const fileContent = await readFileAsBuffer('../tests/data/Hello docx world.docx');
    const fileObject = Buffer.from(fileContent);
    const unzippedXml = await zipper.getDocxData(fileObject);
    expect(unzippedXml).toBeInstanceOf(Array);

    unzippedXml.forEach((file) => {
      expect(file).toHaveProperty('name');
      expect(file).toHaveProperty('content');
      expect(file.content).toMatch(/<\?xml/);
    });

    // Make sure we have document.xml
    const documentXml = unzippedXml.find((file) => file.name === 'word/document.xml');
    expect(documentXml).toBeTruthy();
  });
});

// Helper to build a UTF-16LE Buffer with BOM
function utf16leWithBOM(str) {
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.from(str, 'utf16le');
  return Buffer.concat([bom, body]);
}

describe('DocxZipper - UTF-16 XML handling', () => {
  let zipper;
  beforeEach(() => {
    zipper = new DocxZipper();
  });

  it('decodes a UTF-16LE customXml part correctly (was failing before fix)', async () => {
    const zip = new JSZip();

    // Minimal [Content_Types].xml to look like a docx
    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`;
    zip.file('[Content_Types].xml', contentTypes);

    // A basic UTF-8 document.xml so there's at least one normal XML entry
    const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body>
      </w:document>`;
    zip.file('word/document.xml', documentXml);

    // The problematic UTF-16LE customXml item
    const customXmlUtf16 = `<?xml version="1.0" encoding="utf-16"?>
<properties xmlns="http://www.imanage.com/work/xmlschema">
  <documentid>TELEKOM!4176814.1</documentid>
  <senderid>A675398</senderid>
  <senderemail>GUDRUN.JORDAN@TELEKOM.DE</senderemail>
  <lastmodified>2023-07-06T15:09:00.0000000+02:00</lastmodified>
  <database>TELEKOM</database>
</properties>`;
    zip.file('customXml/item2.xml', utf16leWithBOM(customXmlUtf16));

    // Generate the zip as a Node buffer and feed it to the zipper
    const buf = await zip.generateAsync({ type: 'nodebuffer' });
    const files = await zipper.getDocxData(buf /* isNode not needed for XML */);

    // Find the customXml item
    const item2 = files.find((f) => f.name === 'customXml/item2.xml');
    expect(item2).toBeTruthy();

    // ✅ With the fix, content is a clean JS string:
    expect(item2.content).toContain('<?xml'); // prolog present
    expect(item2.content).toContain('<properties'); // real tag (no NULs interleaved)
    expect(item2.content).not.toMatch(/\u0000/); // no embedded NULs
    expect(item2.content.toLowerCase()).toContain('encoding="utf-16"');
  });
});

describe('DocxZipper - updateContentTypes', () => {
  it('adds header/footer overrides for newly added parts', async () => {
    const zipper = new DocxZipper();
    const zip = new JSZip();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`;
    zip.file('[Content_Types].xml', contentTypes);
    zip.file(
      'word/document.xml',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
    );
    zip.file('word/header1.xml', '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>');
    zip.file('word/footer1.xml', '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>');

    await zipper.updateContentTypes(zip, {}, false, ['word/header1.xml', 'word/footer1.xml']);

    const updatedContentTypes = await zip.file('[Content_Types].xml').async('string');
    expect(updatedContentTypes).toContain('/word/header1.xml');
    expect(updatedContentTypes).toContain('/word/footer1.xml');
  });

  it('adds overrides when header targets exist only in updated relationships', async () => {
    const zipper = new DocxZipper();
    const zip = new JSZip();

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`;
    zip.file('[Content_Types].xml', contentTypes);
    zip.file(
      'word/document.xml',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
    );

    const updatedDocs = {
      'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
        </Relationships>`,
    };

    await zipper.updateContentTypes(zip, {}, false, updatedDocs);

    const updatedContentTypes = await zip.file('[Content_Types].xml').async('string');
    expect(updatedContentTypes).toContain('/word/header1.xml');
    expect(updatedContentTypes).toContain('/word/footer1.xml');
  });
});
