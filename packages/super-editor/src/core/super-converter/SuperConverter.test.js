import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperConverter } from './SuperConverter.js';
import { v4 as uuidv4 } from 'uuid';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

function hasTemporaryId(converter) {
  // Has temporary ID if no GUID but has hash (or could generate one)
  return !converter.documentGuid && !!(converter.documentHash || converter.fileSource);
}

describe('SuperConverter Document GUID', () => {
  let mockDocx;
  let mockCustomXml;
  let mockSettingsXml;

  beforeEach(() => {
    vi.clearAllMocks();

    // These need to match the actual file structure expected by SuperConverter
    mockCustomXml = {
      name: 'docProps/custom.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
        </Properties>`,
    };

    mockSettingsXml = {
      name: 'word/settings.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        </w:settings>`,
    };

    // Add a minimal document.xml to prevent parsing errors
    const mockDocumentXml = {
      name: 'word/document.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body><w:p><w:r><w:t>Test</w:t></w:r></w:p></w:body>
        </w:document>`,
    };

    mockDocx = [mockCustomXml, mockSettingsXml, mockDocumentXml];
  });

  describe('Document Identifier Resolution', () => {
    it('prioritizes Microsoft docId from settings.xml', () => {
      mockSettingsXml.content = `<?xml version="1.0" encoding="UTF-8"?>
        <w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
                    xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
          <w15:docId w15:val="{MICROSOFT-GUID-123}"/>
        </w:settings>`;

      const converter = new SuperConverter({ docx: mockDocx });
      expect(converter.getDocumentGuid()).toBe('MICROSOFT-GUID-123');
      expect(hasTemporaryId(converter)).toBe(false);
    });

    it('uses custom DocumentGuid when no Microsoft GUID exists', () => {
      // Override just the custom.xml with the GUID
      const customDocx = [...mockDocx];
      customDocx[0] = {
        name: 'docProps/custom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
          <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
            <property name="DocumentGuid" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
              <vt:lpwstr xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">CUSTOM-GUID-456</vt:lpwstr>
            </property>
          </Properties>`,
      };

      const converter = new SuperConverter({ docx: customDocx });
      expect(converter.getDocumentGuid()).toBe('CUSTOM-GUID-456');
      expect(hasTemporaryId(converter)).toBe(false);
    });

    it('generates hash for unmodified document without GUID', async () => {
      const fileSource = Buffer.from('test file content');
      const converter = new SuperConverter({
        docx: mockDocx,
        fileSource,
      });

      // getDocumentIdentifier is now async
      const identifier = await converter.getDocumentIdentifier();
      expect(identifier).toMatch(/^HASH-/);
      expect(hasTemporaryId(converter)).toBe(true);
      expect(converter.getDocumentGuid()).toBeNull();
    });
  });

  describe('GUID Promotion', () => {
    it('promotes hash to GUID when document is modified', async () => {
      const fileSource = Buffer.from('test file content');
      const converter = new SuperConverter({
        docx: mockDocx,
        fileSource,
      });

      // Generate hash first (async)
      await converter.getDocumentIdentifier();

      // Now check if has temporary ID
      expect(hasTemporaryId(converter)).toBe(true);

      // Promote to GUID
      const guid = converter.promoteToGuid();
      expect(guid).toBe('test-uuid-1234');
      expect(converter.getDocumentGuid()).toBe('test-uuid-1234');
      expect(hasTemporaryId(converter)).toBe(false);
      expect(converter.documentModified).toBe(true);
    });

    it('does not re-promote if already has GUID', () => {
      // Override just the custom.xml with the GUID
      const customDocx = [...mockDocx];
      customDocx[0] = {
        name: 'docProps/custom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
          <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
            <property name="DocumentGuid" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
              <vt:lpwstr xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">EXISTING-GUID</vt:lpwstr>
            </property>
          </Properties>`,
      };

      const converter = new SuperConverter({ docx: customDocx });
      const guid = converter.promoteToGuid();
      expect(guid).toBe('EXISTING-GUID');
      expect(uuidv4).not.toHaveBeenCalled();
    });
  });

  describe('Static Methods', () => {
    it('getDocumentGuid checks both sources', () => {
      // Test Microsoft GUID
      const docxWithMsGuid = [
        {
          name: 'word/settings.xml',
          content:
            '<w:settings xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"><w15:docId w15:val="{MS-GUID}"/></w:settings>',
        },
      ];
      expect(SuperConverter.extractDocumentGuid(docxWithMsGuid)).toBe('MS-GUID');

      // Test when no GUID exists
      const guid = SuperConverter.extractDocumentGuid(mockDocx);
      expect(guid).toBeNull();
    });
  });

  describe('Version Methods', () => {
    it('stores and retrieves version', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [],
            },
          ],
        },
      };

      // Set version
      SuperConverter.setStoredSuperdocVersion(docx, '1.2.3');
      const prop = docx['docProps/custom.xml'].elements[0].elements[0];
      expect(prop.elements[0].elements[0].text).toBe('1.2.3');

      // Get version
      const version = SuperConverter.getStoredSuperdocVersion([
        {
          name: 'docProps/custom.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
          <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
            <property name="SuperdocVersion" pid="2">
              <vt:lpwstr>1.2.3</vt:lpwstr>
            </property>
          </Properties>`,
        },
      ]);
      expect(version).toBe('1.2.3');
    });
  });

  describe('Custom Properties', () => {
    it('stores a custom property', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [],
            },
          ],
        },
      };

      SuperConverter.setStoredCustomProperty(docx, 'MyCustomProp', 'MyValue');
      const prop = docx['docProps/custom.xml'].elements[0].elements[0];
      expect(prop.attributes.name).toBe('MyCustomProp');
      expect(prop.elements[0].elements[0].text).toBe('MyValue');
    });

    it('retrieves a custom property', () => {
      const docx = {
        name: 'docProps/custom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
          <property name="MyCustomProp" pid="2">
            <vt:lpwstr>MyValue</vt:lpwstr>
          </property>
        </Properties>`,
      };
      const value = SuperConverter.getStoredCustomProperty([docx], 'MyCustomProp');
      expect(value).toBe('MyValue');
    });

    it('returns null if custom property does not exist', () => {
      const value = SuperConverter.getStoredCustomProperty(
        [
          {
            name: 'docProps/custom.xml',
            content: `<?xml version="1.0" encoding="UTF-8"?>
            <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
            </Properties>`,
          },
        ],
        'NonExistentProp',
      );
      expect(value).toBeNull();
    });
  });

  describe('Backward Compatibility', () => {
    it('deprecated methods show warnings', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      SuperConverter.updateDocumentVersion(mockDocx, '1.0.0');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'updateDocumentVersion is deprecated, use setStoredSuperdocVersion instead',
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Fonts', () => {
    const mockFontTableWithFonts = {
      name: 'word/fontTable.xml',
      content: `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:fonts xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
          xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
          xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
          xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
          xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
          xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
          xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"
          xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
          xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock"
          xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du">
          <w:font w:name="Aptos">
              <w:panose1 w:val="020B0004020202020204"/>
              <w:charset w:val="00"/>
              <w:family w:val="swiss"/>
              <w:pitch w:val="variable"/>
              <w:sig w:usb0="20000287" w:usb1="00000003" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/>
          </w:font>
          <w:font w:name="Times New Roman">
              <w:panose1 w:val="02020603050405020304"/>
              <w:charset w:val="01"/>
              <w:family w:val="roman"/>
              <w:pitch w:val="variable"/>
              <w:sig w:usb0="E0002EFF" w:usb1="C000785B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/>
          </w:font>
          <w:font w:name="Aptos Display">
              <w:panose1 w:val="020B0004020202020204"/>
              <w:charset w:val="00"/>
              <w:family w:val="swiss"/>
              <w:pitch w:val="variable"/>
              <w:sig w:usb0="20000287" w:usb1="00000003" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/>
          </w:font>
        </w:fonts>`,
    };

    const mockFontTableWithoutWFonts = {
      name: 'word/fontTable.xml',
      content: `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    };

    const mockFontTableWithoutWFont = {
      name: 'word/fontTable.xml',
      content: `
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:fonts xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
          xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
          xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
          xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex"
          xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid"
          xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml"
          xmlns:w16du="http://schemas.microsoft.com/office/word/2023/wordml/word16du"
          xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash"
          xmlns:w16sdtfl="http://schemas.microsoft.com/office/word/2024/wordml/sdtformatlock"
          xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh w16sdtfl w16du">
        </w:fonts>`,
    };

    describe('getDocumentFonts', () => {
      it('should return fonts used in the document', () => {
        const converter = new SuperConverter({ docx: [...mockDocx, mockFontTableWithFonts] });
        const fonts = converter.getDocumentFonts();
        const expected = ['Aptos', 'Aptos Display', 'Times New Roman'];

        expect(fonts.sort()).toEqual(expected.sort());
      });

      it('should return empty fonts if fontTable is not available', () => {
        const converter = new SuperConverter({ docx: mockDocx });
        const fonts = converter.getDocumentFonts();

        expect(fonts).toEqual([]);
      });

      it('should return empty fonts if w:fonts is not present', () => {
        const converter = new SuperConverter({ docx: [...mockDocx, mockFontTableWithoutWFonts] });
        const fonts = converter.getDocumentFonts();

        expect(fonts).toEqual([]);
      });

      it('should return empty fonts if no w:font at all', () => {
        const converter = new SuperConverter({ docx: [...mockDocx, mockFontTableWithoutWFont] });
        const fonts = converter.getDocumentFonts();

        expect(fonts).toEqual([]);
      });
    });
  });
});
