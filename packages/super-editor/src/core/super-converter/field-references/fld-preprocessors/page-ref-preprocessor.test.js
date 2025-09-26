// @ts-check
import { describe, it, expect } from 'vitest';
import { preProcessPageRefInstruction } from './page-ref-preprocessor.js';

describe('preProcessPageRefInstruction', () => {
  const mockDocx = {};

  const mockNodesToCombine = [
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'begin' } }] },
    { name: 'w:r', elements: [{ name: 'w:instrText', elements: [{ type: 'text', text: 'PAGEREF _Toc123456789 h' }] }] },
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'separate' } }] },
    { name: 'w:r', elements: [{ name: 'w:t', elements: [{ type: 'text', text: '1' }] }] },
    { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'end' } }] },
  ];

  it('should process a page reference instruction', () => {
    const instruction = 'PAGEREF _Toc123456789 h';
    const result = preProcessPageRefInstruction(mockNodesToCombine, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:pageReference',
        type: 'element',
        attributes: {
          instruction: 'PAGEREF _Toc123456789 h',
        },
        elements: [{ name: 'w:t', elements: [{ type: 'text', text: '1' }] }],
      },
    ]);
  });

  it('should handle no text nodes', () => {
    const instruction = 'PAGEREF _Toc123456789 h';
    const nodesWithoutText = [
      { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'begin' } }] },
      {
        name: 'w:r',
        elements: [{ name: 'w:instrText', elements: [{ type: 'text', text: 'PAGEREF _Toc123456789 h' }] }],
      },
      { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'separate' } }] },
      { name: 'w:r', elements: [{ name: 'w:fldChar', attributes: { 'w:fldCharType': 'end' } }] },
    ];
    const result = preProcessPageRefInstruction(nodesWithoutText, instruction, mockDocx);
    expect(result).toEqual([
      {
        name: 'sd:pageReference',
        type: 'element',
        attributes: {
          instruction: 'PAGEREF _Toc123456789 h',
        },
        elements: [],
      },
    ]);
  });
});
