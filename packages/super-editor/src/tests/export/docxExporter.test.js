import { describe, it, expect } from 'vitest';
import { DocxExporter } from '@core/super-converter/exporter.js';

describe('DocxExporter', () => {
  it('escapes reserved characters within w:instrText nodes', () => {
    const converterStub = {
      declaration: {
        attributes: {
          version: '1.0',
          encoding: 'utf-8',
          standalone: 'yes',
        },
      },
    };

    const exporter = new DocxExporter(converterStub);

    const data = {
      name: 'w:document',
      attributes: {},
      elements: [
        {
          name: 'w:instrText',
          attributes: {
            'xml:space': 'preserve',
          },
          elements: [
            {
              type: 'text',
              text: ' DOCPROPERTY DOCXDOCID Format=<<NUM>>_<<VER>> ',
            },
          ],
        },
      ],
    };

    const xml = exporter.schemaToXml(data);

    expect(xml).toContain('Format=&lt;&lt;NUM&gt;&gt;_&lt;&lt;VER&gt;&gt;');
  });
});
