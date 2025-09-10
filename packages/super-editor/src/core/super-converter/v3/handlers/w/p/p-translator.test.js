import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock attribute handlers before importing the SUT so the config captures them
vi.mock('./attributes/index.js', () => ({
  w14ParaIdEncoder: vi.fn(() => 'ENC_PARAID'),
  w14ParaIdDecoder: vi.fn(() => 'DEC_PARAID'),
  w14TextIdEncoder: vi.fn(() => 'ENC_TEXTID'),
  w14TextIdDecoder: vi.fn(() => 'DEC_TEXTID'),
  wRsidREncoder: vi.fn(() => 'ENC_RSIDR'),
  wRsidRDecoder: vi.fn(() => 'DEC_RSIDR'),
  wRsidRDefaultEncoder: vi.fn(() => 'ENC_RSIDRDEF'),
  wRsidRDefaultDecoder: vi.fn(() => 'DEC_RSIDRDEF'),
  wRsidPEncoder: vi.fn(() => 'ENC_RSIDP'),
  wRsidPDecoder: vi.fn(() => 'DEC_RSIDP'),
  wRsidRPrEncoder: vi.fn(() => 'ENC_RSIDRPR'),
  wRsidRPrDecoder: vi.fn(() => 'DEC_RSIDRPR'),
  wRsidDelEncoder: vi.fn(() => 'ENC_RSIDDEL'),
  wRsidDelDecoder: vi.fn(() => 'DEC_RSIDDEL'),
}));

// Mock legacy paragraph handler used by encode
vi.mock('./helpers/legacy-handle-paragraph-node.js', () => ({
  handleParagraphNode: vi.fn(() => ({
    type: 'paragraph',
    attrs: { fromLegacy: true },
    content: [],
  })),
}));

// Mock exporter decode function used by decode
vi.mock('../../../../exporter.js', () => ({
  translateParagraphNode: vi.fn(() => ({
    name: 'w:p',
    elements: [],
    attributes: { existing: 'keep' },
  })),
}));

// Import after mocks
import { translator, config } from './p-translator.js';
import { NodeTranslator } from '@translator';
import { handleParagraphNode } from './helpers/legacy-handle-paragraph-node.js';
import { translateParagraphNode } from '../../../../exporter.js';
import * as attrFns from './attributes/index.js';

describe('w/p p-translator', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes correct config', () => {
    expect(config.xmlName).toBe('w:p');
    expect(config.sdNodeOrKeyName).toBe('paragraph');
    expect(config.type).toBe(NodeTranslator.translatorTypes.NODE);
    expect(config.attributes).toHaveLength(7);
  });

  it('encode() delegates to legacy handler and merges encoded attributes', () => {
    const params = {
      nodes: [{ name: 'w:p', attributes: { 'w14:paraId': 'X' } }],
      docx: {},
      nodeListHandler: { handlerEntities: [] },
    };

    const result = translator.encode(params);
    expect(handleParagraphNode).toHaveBeenCalled();
    expect(result.type).toBe('paragraph');
    expect(result.attrs.fromLegacy).toBe(true);
    // Encoded attrs from mocked attribute encoders
    expect(result.attrs).toMatchObject({
      paraId: 'ENC_PARAID',
      textId: 'ENC_TEXTID',
      rsidR: 'ENC_RSIDR',
      rsidRDefault: 'ENC_RSIDRDEF',
      rsidP: 'ENC_RSIDP',
      rsidRPr: 'ENC_RSIDRPR',
      rsidDel: 'ENC_RSIDDEL',
    });
  });

  it('decode() delegates to exporter and merges decoded attributes', () => {
    const params = {
      node: { type: 'paragraph', attrs: { any: 'thing' } },
      children: [],
    };
    const result = translator.decode(params);
    expect(translateParagraphNode).toHaveBeenCalled();
    expect(result.name).toBe('w:p');
    // existing attribute remains
    expect(result.attributes.existing).toBe('keep');
    // Decoded attrs from mocked attribute decoders; keys are xml names
    expect(result.attributes).toMatchObject({
      'w14:paraId': 'DEC_PARAID',
      'w14:textId': 'DEC_TEXTID',
      'w:rsidR': 'DEC_RSIDR',
      'w:rsidRDefault': 'DEC_RSIDRDEF',
      'w:rsidP': 'DEC_RSIDP',
      'w:rsidRPr': 'DEC_RSIDRPR',
      'w:rsidDel': 'DEC_RSIDDEL',
    });
  });

  it('attribute encoders/decoders are wired in the translator', () => {
    // Trigger encode/decode to ensure functions are invoked
    translator.encode({ nodes: [{ name: 'w:p', attributes: {} }] });
    translator.decode({ node: { type: 'paragraph', attrs: {} }, children: [] });
    // All functions should have been called at least once
    expect(attrFns.w14ParaIdEncoder).toHaveBeenCalled();
    expect(attrFns.w14TextIdEncoder).toHaveBeenCalled();
    expect(attrFns.wRsidREncoder).toHaveBeenCalled();
    expect(attrFns.wRsidRDefaultEncoder).toHaveBeenCalled();
    expect(attrFns.wRsidPEncoder).toHaveBeenCalled();
    expect(attrFns.wRsidRPrEncoder).toHaveBeenCalled();
    expect(attrFns.wRsidDelEncoder).toHaveBeenCalled();

    expect(attrFns.w14ParaIdDecoder).toHaveBeenCalled();
    expect(attrFns.w14TextIdDecoder).toHaveBeenCalled();
    expect(attrFns.wRsidRDecoder).toHaveBeenCalled();
    expect(attrFns.wRsidRDefaultDecoder).toHaveBeenCalled();
    expect(attrFns.wRsidPDecoder).toHaveBeenCalled();
    expect(attrFns.wRsidRPrDecoder).toHaveBeenCalled();
    expect(attrFns.wRsidDelDecoder).toHaveBeenCalled();
  });
});
