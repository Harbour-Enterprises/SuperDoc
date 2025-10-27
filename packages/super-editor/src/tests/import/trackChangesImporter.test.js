import { SuperConverter } from '@converter/SuperConverter.js';
import { handleTrackChangeNode, __testables__ } from '@converter/v2/importer/trackChangesImporter.js';
import { TrackDeleteMarkName, TrackInsertMarkName, TrackFormatMarkName } from '@extensions/track-changes/constants.js';
import { parseXmlToJson } from '@converter/v2/docxHelper.js';
import { defaultNodeListHandler } from '@converter/v2/importer/docxImporter.js';

const { unwrapTrackChangeNode } = __testables__;

describe('unwrapTrackChangeNode', () => {
  it('returns null when node is missing', () => {
    expect(unwrapTrackChangeNode()).toBeNull();
    expect(unwrapTrackChangeNode(null)).toBeNull();
  });

  it('returns track change node as-is', () => {
    const node = { name: 'w:ins' };
    expect(unwrapTrackChangeNode(node)).toBe(node);
  });

  it('returns first track change node found inside content controls', () => {
    const trackChangeNode = { name: 'w:del' };
    const contentControlNode = {
      name: 'w:sdt',
      elements: [
        {
          name: 'w:sdtContent',
          elements: [
            { name: 'w:p', elements: [] },
            {
              name: 'w:sdt',
              elements: [
                {
                  name: 'w:sdtContent',
                  elements: [trackChangeNode],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(unwrapTrackChangeNode(contentControlNode)).toBe(trackChangeNode);
  });

  it('returns null when there is no track change in content control', () => {
    const contentControlNode = {
      name: 'w:sdt',
      elements: [
        {
          name: 'w:sdtContent',
          elements: [{ name: 'w:p', elements: [] }],
        },
      ],
    };

    expect(unwrapTrackChangeNode(contentControlNode)).toBeNull();
  });
});

describe('TrackChangesImporter', () => {
  it('parses only track change nodes', () => {
    const names = Object.keys(SuperConverter.allowedElements).filter((name) => name !== 'w:del' && name !== 'w:ins');
    const nodesOfNodes = names.map((name) => [{ name }]);
    for (const nodes of nodesOfNodes) {
      const result = handleTrackChangeNode({ nodes });
      expect(result.nodes.length).toBe(0);
      expect(result.consumed).toBe(0);
    }
  });

  it('parses track change del node and their attributes', () => {
    const nodes = [
      {
        name: 'w:del',
        attributes: { 'w:id': '1', 'w:date': '2023-10-01', 'w:author': 'Author' },
        elements: [{ name: 'w:t', attributes: {}, elements: [{ text: 'This is a test text!' }] }],
      },
    ];
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler() });
    expect(result.nodes.length).toBe(1);
    expect(result.consumed).toBe(1);
    expect(result.nodes[0].marks[0].type).toBe(TrackDeleteMarkName);
    expect(result.nodes[0].marks[0].attrs).toEqual({
      id: '1',
      date: '2023-10-01',
      author: 'Author',
      importedAuthor: 'Author (imported)',
    });
  });

  it('parses track change ins node and their attributes', () => {
    const nodes = [
      {
        name: 'w:ins',
        attributes: { 'w:id': '1', 'w:date': '2023-10-01', 'w:author': 'Author' },
        elements: [{ name: 'w:t', attributes: {}, elements: [{ text: 'This is a test text!' }] }],
      },
    ];
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler() });
    expect(result.nodes.length).toBe(1);
    expect(result.consumed).toBe(1);
    expect(result.nodes[0].marks[0].type).toBe(TrackInsertMarkName);
    expect(result.nodes[0].marks[0].attrs).toEqual({
      id: '1',
      date: '2023-10-01',
      author: 'Author',
      importedAuthor: 'Author (imported)',
    });
  });

  it('unwraps track change insert nodes nested in content controls', () => {
    const sdtInsertXml = `<w:sdt>
        <w:sdtContent>
          <w:ins w:id="3" w:date="2024-09-05T10:44:00Z" w:author="Nested Author">
            <w:r>
              <w:t xml:space="preserve">nested insert </w:t>
            </w:r>
          </w:ins>
        </w:sdtContent>
      </w:sdt>`;
    const nodes = parseXmlToJson(sdtInsertXml).elements;
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler(), docx: {} });
    expect(result.nodes.length).toBe(1);
    expect(result.consumed).toBe(1);
    const mark = result.nodes[0].marks.find((item) => item.type === TrackInsertMarkName);
    expect(mark).toBeDefined();
    expect(mark.attrs).toEqual({
      id: '3',
      date: '2024-09-05T10:44:00Z',
      author: 'Nested Author',
      importedAuthor: 'Nested Author (imported)',
    });
    expect(result.nodes[0].content?.[0]?.text).toBe('nested insert ');
  });

  it('unwraps track change delete nodes nested in content controls', () => {
    const sdtDeleteXml = `<w:sdt>
        <w:sdtContent>
          <w:del w:id="4" w:date="2024-09-05T11:12:00Z" w:author="Nested Author">
            <w:r>
              <w:delText xml:space="preserve">nested delete </w:delText>
            </w:r>
          </w:del>
        </w:sdtContent>
      </w:sdt>`;
    const nodes = parseXmlToJson(sdtDeleteXml).elements;
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler(), docx: {} });
    expect(result.nodes.length).toBe(1);
    expect(result.consumed).toBe(1);
    const mark = result.nodes[0].marks.find((item) => item.type === TrackDeleteMarkName);
    expect(mark).toBeDefined();
    expect(mark.attrs).toEqual({
      id: '4',
      date: '2024-09-05T11:12:00Z',
      author: 'Nested Author',
      importedAuthor: 'Nested Author (imported)',
    });
    expect(result.nodes[0].content?.[0]?.text).toBe('nested delete ');
  });
});

describe('trackChanges live xml test', () => {
  const inserXml = `<w:ins w:id="0" w:author="torcsi@harbourcollaborators.com" w:date="2024-09-02T15:56:00Z">
        <w:r>
            <w:rPr>
                <w:lang w:val="en-US"/>
            </w:rPr>
            <w:t xml:space="preserve">short </w:t>
        </w:r>
    </w:ins>`;
  const deleteXml = `<w:del w:id="1" w:author="torcsi@harbourcollaborators.com" w:date="2024-09-02T15:56:00Z">
        <w:r w:rsidDel="00661ED0">
            <w:rPr>
                <w:lang w:val="en-US"/>
            </w:rPr>
            <w:delText xml:space="preserve">long </w:delText>
        </w:r>
    </w:del>`;
  const markChangeXml = `<w:p>
        <w:r w:rsidRPr="00A37CF0">
            <w:rPr>
              <w:b/>
              <w:bCs/>
              <w:lang w:val="en-US"/>
              <w:rPrChange w:id="2" w:author="torcsi@harbourcollaborators.com" w:date="2024-09-04T09:29:00Z">
                <w:rPr>
                  <w:lang w:val="en-US"/>
                </w:rPr>
              </w:rPrChange>
            </w:rPr>
            <w:t>that</w:t>
        </w:r>
    </w:p>`;

  it('parses insert xml', () => {
    const nodes = parseXmlToJson(inserXml).elements;
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler(), docx: {} });
    expect(result.nodes.length).toBe(1);
    const insertionMark = result.nodes[0].marks.find((mark) => mark.type === TrackInsertMarkName);
    expect(insertionMark).toBeDefined();
    expect(insertionMark.attrs).toEqual({
      id: '0',
      date: '2024-09-02T15:56:00Z',
      author: 'torcsi@harbourcollaborators.com',
      importedAuthor: 'torcsi@harbourcollaborators.com (imported)',
    });
    expect(result.nodes[0].content?.[0]?.text).toBe('short ');
  });
  it('parses delete xml', () => {
    const nodes = parseXmlToJson(deleteXml).elements;
    const result = handleTrackChangeNode({ nodes, nodeListHandler: defaultNodeListHandler(), docx: {} });
    expect(result.nodes.length).toBe(1);
    const deletionMark = result.nodes[0].marks.find((mark) => mark.type === TrackDeleteMarkName);
    expect(deletionMark).toBeDefined();
    expect(deletionMark.attrs).toEqual({
      id: '1',
      date: '2024-09-02T15:56:00Z',
      author: 'torcsi@harbourcollaborators.com',
      importedAuthor: 'torcsi@harbourcollaborators.com (imported)',
    });
    expect(result.nodes[0].content?.[0]?.text).toBe('long ');
  });
  it('parses mark change xml', () => {
    const nodes = parseXmlToJson(markChangeXml).elements;
    const handler = defaultNodeListHandler();
    const result = handler.handler({ nodes, docx: {} });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('paragraph');
    expect(result[0].content.length).toBe(1);
    const changeMark = result[0].content[0].marks.find((mark) => mark.type === TrackFormatMarkName);
    expect(changeMark).toBeDefined();
    expect(changeMark.attrs).toEqual({
      id: '2',
      date: '2024-09-04T09:29:00Z',
      author: 'torcsi@harbourcollaborators.com',
      before: [],
      after: [
        {
          type: 'bold',
          attrs: {
            value: true,
          },
        },
      ],
    });
  });
});
