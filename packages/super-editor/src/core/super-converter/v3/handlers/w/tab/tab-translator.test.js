import { vi, beforeEach, describe, it, expect } from 'vitest';
import { config } from './index.js';
import { processOutputMarks, generateRunProps } from '../../../../exporter.js';

vi.mock('../../../../exporter.js', () => {
  const processOutputMarks = vi.fn((marks) => marks || []);
  const generateRunProps = vi.fn((processedMarks) => ({
    name: 'w:rPr',
    elements: [],
  }));
  return { processOutputMarks, generateRunProps };
});

describe('w:tab translator config', () => {
  describe('encode', () => {
    it('encodes to a SuperDoc tab by default', () => {
      const res = config.encode({}, undefined);
      // encode(_, encodedAttrs = {}) sets attrs: {} because {} is truthy
      expect(res).toEqual({ type: 'tab', attrs: {} });
    });

    it('passes through provided encodedAttrs as attrs', () => {
      const encoded = { tabType: 'left', pos: '720', leader: 'dot' };
      const res = config.encode({}, encoded);
      expect(res.type).toBe('tab');
      expect(res.attrs).toEqual(encoded);
    });

    it('adds empty attrs object when encodedAttrs is an empty object', () => {
      const res = config.encode({}, {});
      expect(res).toEqual({ type: 'tab', attrs: {} });
    });

    it('keeps falsy-but-valid values from encodedAttrs (0, "", false)', () => {
      const encoded = { tabType: 'left', pos: '', leader: false };
      const res = config.encode({}, encoded);
      expect(res.attrs).toEqual({ tabType: 'left', pos: '', leader: false });
    });
  });

  describe('decode', () => {
    it('wraps <w:tab> in a <w:r> run', () => {
      const res = config.decode({ node: { type: 'tab' } }, undefined);
      expect(res).toBeTruthy();
      expect(res.name).toBe('w:r');
      expect(Array.isArray(res.elements)).toBe(true);
      // decode(_, decodedAttrs = {}) sets attributes: {} because {} is truthy
      expect(res.elements[0]).toEqual({ name: 'w:tab', attributes: {}, elements: [] });
    });

    it('copies decodedAttrs to <w:tab>.attributes verbatim', () => {
      const decoded = { 'w:val': 'left', 'w:pos': '720', 'w:leader': 'dot', 'w:custom': 'foo' };
      const res = config.decode({ node: { type: 'tab' } }, decoded);
      expect(res.name).toBe('w:r');
      expect(res.elements[0]).toEqual({ name: 'w:tab', attributes: decoded, elements: [] });
    });

    it('returns undefined when params.node is missing', () => {
      const res = config.decode({}, { 'w:val': 'left' });
      expect(res).toBeUndefined();
    });
  });

  describe('decode — marks and run props', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('calls processOutputMarks with node.marks and adds run props before <w:tab>', () => {
      const fakeMarks = [{ type: 'bold' }, { type: 'italic' }];
      const processed = [{ type: 'bold' }];
      const rPrNode = { name: 'w:rPr', elements: [{ name: 'w:b' }] };

      processOutputMarks.mockReturnValue(processed);
      generateRunProps.mockReturnValue(rPrNode);

      const params = { node: { type: 'tab', marks: fakeMarks } };
      const res = config.decode(params, undefined);

      expect(processOutputMarks).toHaveBeenCalledTimes(1);
      expect(processOutputMarks).toHaveBeenCalledWith(fakeMarks);

      expect(generateRunProps).toHaveBeenCalledTimes(1);
      expect(generateRunProps).toHaveBeenCalledWith(processed);

      expect(res).toBeTruthy();
      expect(res.name).toBe('w:r');
      expect(Array.isArray(res.elements)).toBe(true);

      expect(res.elements[0]).toEqual(rPrNode); // run props first
      expect(res.elements[1]).toEqual({ name: 'w:tab', attributes: {}, elements: [] });
    });

    it('does not add run props when processOutputMarks returns an empty array', () => {
      processOutputMarks.mockReturnValue([]);

      const params = { node: { type: 'tab', marks: [{ type: 'bold' }] } };
      const res = config.decode(params, undefined);

      expect(processOutputMarks).toHaveBeenCalledTimes(1);
      expect(generateRunProps).not.toHaveBeenCalled();

      expect(res.name).toBe('w:r');
      expect(res.elements).toEqual([{ name: 'w:tab', attributes: {}, elements: [] }]);
    });

    it('still places run props before <w:tab> when decodedAttrs are present', () => {
      processOutputMarks.mockReturnValue([{ type: 'bold' }]);
      generateRunProps.mockReturnValue({ name: 'w:rPr', elements: [{ name: 'w:b' }] });

      const params = { node: { type: 'tab', marks: [{ type: 'bold' }] } };
      const decoded = { 'w:val': 'left', 'w:custom': 'foo' };
      const res = config.decode(params, decoded);

      expect(res.name).toBe('w:r');
      expect(res.elements[0]).toEqual({ name: 'w:rPr', elements: [{ name: 'w:b' }] });
      expect(res.elements[1]).toEqual({
        name: 'w:tab',
        attributes: { 'w:val': 'left', 'w:custom': 'foo' },
        elements: [],
      });
    });

    it('passes an empty array to processOutputMarks when node.marks is missing', () => {
      processOutputMarks.mockReturnValue([]);

      const res = config.decode({ node: { type: 'tab' } }, undefined);

      expect(processOutputMarks).toHaveBeenCalledTimes(1);
      expect(processOutputMarks).toHaveBeenCalledWith([]);
      expect(res.elements).toEqual([{ name: 'w:tab', attributes: {}, elements: [] }]);
    });
  });
});
