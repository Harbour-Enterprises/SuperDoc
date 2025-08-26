import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuperConverter } from './SuperConverter.js';
import { v4 as uuidv4 } from 'uuid';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

describe('SuperConverter Custom Properties', () => {
  let mockDocx;
  let mockCustomXml;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a basic custom.xml structure
    mockCustomXml = {
      name: 'docProps/custom.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
        </Properties>`,
    };

    mockDocx = [mockCustomXml];
  });

  describe('getStoredCustomProperty', () => {
    it('returns null when custom.xml is missing', () => {
      const result = SuperConverter.getStoredCustomProperty([], 'TestProperty');
      expect(result).toBeNull();
    });

    it('returns null when property does not exist', () => {
      const result = SuperConverter.getStoredCustomProperty(mockDocx, 'NonExistent');
      expect(result).toBeNull();
    });

    it('returns property value when it exists', () => {
      mockCustomXml.content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
          <property name="TestProp" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
            <vt:lpwstr>TestValue</vt:lpwstr>
          </property>
        </Properties>`;

      const result = SuperConverter.getStoredCustomProperty(mockDocx, 'TestProp');
      expect(result).toBe('TestValue');
    });

    it('handles parsing errors gracefully', () => {
      mockCustomXml.content = 'invalid xml';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = SuperConverter.getStoredCustomProperty(mockDocx, 'TestProp');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('setStoredCustomProperty', () => {
    it('creates custom.xml if missing', () => {
      const docx = {};
      SuperConverter.setStoredCustomProperty(docx, 'NewProp', 'NewValue');

      expect(docx['docProps/custom.xml']).toBeDefined();
      expect(docx['docProps/custom.xml'].elements).toBeDefined();
    });

    it('adds new property with correct structure', () => {
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

      const result = SuperConverter.setStoredCustomProperty(docx, 'TestProp', 'TestValue');

      expect(result).toBe('TestValue');
      const props = docx['docProps/custom.xml'].elements[0].elements;
      expect(props).toHaveLength(1);
      expect(props[0].attributes.name).toBe('TestProp');
      expect(props[0].elements[0].elements[0].text).toBe('TestValue');
    });

    it('updates existing property when preserveExisting is false', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [
                {
                  type: 'element',
                  name: 'property',
                  attributes: { name: 'ExistingProp', pid: 2 },
                  elements: [
                    {
                      name: 'vt:lpwstr',
                      elements: [{ text: 'OldValue' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = SuperConverter.setStoredCustomProperty(docx, 'ExistingProp', 'NewValue', false);
      expect(result).toBe('NewValue');

      const prop = docx['docProps/custom.xml'].elements[0].elements[0];
      expect(prop.elements[0].elements[0].text).toBe('NewValue');
    });

    it('preserves existing property when preserveExisting is true', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [
                {
                  type: 'element',
                  name: 'property',
                  attributes: { name: 'ExistingProp', pid: 2 },
                  elements: [
                    {
                      name: 'vt:lpwstr',
                      elements: [{ text: 'OldValue' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = SuperConverter.setStoredCustomProperty(docx, 'ExistingProp', 'NewValue', true);
      expect(result).toBe('OldValue');

      const prop = docx['docProps/custom.xml'].elements[0].elements[0];
      expect(prop.elements[0].elements[0].text).toBe('OldValue');
    });

    it('handles function values correctly', () => {
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

      const valueFunc = () => 'GeneratedValue';
      const result = SuperConverter.setStoredCustomProperty(docx, 'TestProp', valueFunc);

      expect(result).toBe('GeneratedValue');
    });

    it('assigns sequential pids for multiple properties', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [
                {
                  attributes: { pid: 2 },
                },
              ],
            },
          ],
        },
      };

      SuperConverter.setStoredCustomProperty(docx, 'Prop1', 'Value1');
      const props = docx['docProps/custom.xml'].elements[0].elements;
      expect(props[props.length - 1].attributes.pid).toBe(3);
    });
  });

  describe('SuperDoc ID methods', () => {
    it('getStoredSuperdocId retrieves stored ID', () => {
      mockCustomXml.content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
          <property name="SuperDocId" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
            <vt:lpwstr>doc-id-123</vt:lpwstr>
          </property>
        </Properties>`;

      const result = SuperConverter.getStoredSuperdocId(mockDocx);
      expect(result).toBe('doc-id-123');
    });

    it('setStoredSuperdocId generates UUID when id is null', () => {
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

      const result = SuperConverter.setStoredSuperdocId(docx, null);
      expect(result).toBe('test-uuid-1234');
      expect(uuidv4).toHaveBeenCalled();
    });

    it('setStoredSuperdocId uses provided ID', () => {
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

      const result = SuperConverter.setStoredSuperdocId(docx, 'custom-id');
      expect(result).toBe('custom-id');
      expect(uuidv4).not.toHaveBeenCalled();
    });

    it('setStoredSuperdocId preserves existing ID', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [
                {
                  type: 'element',
                  name: 'property',
                  attributes: { name: 'SuperDocId', pid: 2 },
                  elements: [
                    {
                      name: 'vt:lpwstr',
                      elements: [{ text: 'existing-id' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = SuperConverter.setStoredSuperdocId(docx, 'new-id');
      expect(result).toBe('existing-id');
    });
  });

  describe('SuperDoc Version methods', () => {
    it('getStoredSuperdocVersion retrieves version', () => {
      mockCustomXml.content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
          <property name="SuperdocVersion" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
            <vt:lpwstr>1.2.3</vt:lpwstr>
          </property>
        </Properties>`;

      const result = SuperConverter.getStoredSuperdocVersion(mockDocx);
      expect(result).toBe('1.2.3');
    });

    it('setStoredSuperdocVersion always updates version', () => {
      const docx = {
        'docProps/custom.xml': {
          elements: [
            {
              name: 'Properties',
              elements: [
                {
                  type: 'element',
                  name: 'property',
                  attributes: { name: 'SuperdocVersion', pid: 2 },
                  elements: [
                    {
                      name: 'vt:lpwstr',
                      elements: [{ text: '1.0.0' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = SuperConverter.setStoredSuperdocVersion(docx, '2.0.0');
      expect(result).toBe('2.0.0');

      const prop = docx['docProps/custom.xml'].elements[0].elements[0];
      expect(prop.elements[0].elements[0].text).toBe('2.0.0');
    });
  });

  describe('SuperConverter instance methods', () => {
    it('getSuperdocId returns stored ID', () => {
      const converter = new SuperConverter();
      converter.superdocId = 'test-id';

      expect(converter.getSuperdocId()).toBe('test-id');
    });

    it('getSuperdocId returns null when not set', () => {
      const converter = new SuperConverter();

      expect(converter.getSuperdocId()).toBeNull();
    });

    it('getSuperdocVersion retrieves version from docx', () => {
      const converter = new SuperConverter();
      converter.docx = mockDocx;

      mockCustomXml.content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties">
          <property name="SuperdocVersion" fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2">
            <vt:lpwstr>3.0.0</vt:lpwstr>
          </property>
        </Properties>`;

      expect(converter.getSuperdocVersion()).toBe('3.0.0');
    });

    it('getSuperdocVersion returns null when docx not available', () => {
      const converter = new SuperConverter();

      expect(converter.getSuperdocVersion()).toBeNull();
    });
  });
});
