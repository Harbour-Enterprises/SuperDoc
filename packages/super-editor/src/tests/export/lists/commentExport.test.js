// prettier-ignore
import {
  getExportedResult,
} from '../export-helpers/index';
import basicResolvedCommentData from '../data/comments/basic-resolved-comment';
import { getInitials, toIsoNoFractional } from '@converter/v2/exporter/commentsExporter';

describe('[basic-comment.docx] interrupted ordered list tests', async () => {
  const fileName = 'basic-comment.docx';
  const result = await getExportedResult(fileName, basicResolvedCommentData);
  const body = {};

  beforeEach(() => {
    Object.assign(body, result.elements?.find((el) => el.name === 'w:body'));
  });

  it('correctly exports first list item', () => {
    const content = body.elements[0].elements;
    const commentStart = content.findIndex((el) => el.name === 'w:commentRangeStart');
    const commentId = content[commentStart].attributes['w:id'];
    expect(commentStart).toBe(1);
    expect(commentId).toBe('0');

    const commentEnd = content.findIndex((el) => el.name === 'w:commentRangeEnd');
    const commentIdEnd = content[commentStart].attributes['w:id'];
    expect(commentEnd).toBe(3);
    expect(commentIdEnd).toBe('0');
  });
});

describe('test getInitials function', () => {
  it('can get initials from a name', () => {
    const name = 'Nick Bernal';
    const initials = getInitials(name);
    expect(initials).toBe('NB');
  });

  it('removes "(imported)" from the name', () => {
    const name = 'Nick Bernal (imported)';
    const initials = getInitials(name);
    expect(initials).toBe('NB');
  });

  it('removes leading and trailing whitespace', () => {
    const name = '  Nick Bernal  ';
    const initials = getInitials(name);
    expect(initials).toBe('NB');
  });

  it('handles empty strings', () => {
    const name = '';
    const initials = getInitials(name);
    expect(initials).toBe(null);
  });

  it('handles null values', () => {
    const name = null;
    const initials = getInitials(name);
    expect(initials).toBe(null);
  });

  it('can import single name', () => {
    const name = 'Nick';
    const initials = getInitials(name);
    expect(initials).toBe('N');
  });
});

describe('test toIsoNoFractional function', () => {
  it('can convert a date to ISO without fractional seconds', () => {
    const date = 1739389620000;
    const isoDate = toIsoNoFractional(date);
    expect(isoDate).toBe('2025-02-12T19:47:00Z');
  });

  it('can handle null values', () => {
    const date = null;
    const isoDate = toIsoNoFractional(date);
    expect(isoDate).toBeDefined();
  });

  it('can use Date.now()', () => {
    const date = Date.now();
    const isoDate = toIsoNoFractional(date);
    expect(isoDate).toBe(new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z'));
  });
});