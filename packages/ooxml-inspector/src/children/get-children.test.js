import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

vi.mock('./index.js', () => ({
  allowedChildren: vi.fn(),
  hasElement: vi.fn(),
  getSchema: vi.fn(),
}));

import { allowedChildren, hasElement, getSchema } from './index.js';
import { getChildren } from './get-children.js';

describe('getChildren CLI helper', () => {
  let logSpy, errorSpy, exitSpy;

  beforeEach(() => {
    // fresh mocks per test
    vi.clearAllMocks();
    // capture console
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // prevent the real process.exit from killing the test run
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('exits with usage when no element is provided', async () => {
    // Make exit actually stop execution
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('__EXIT__');
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mocks to ensure we don't accidentally continue
    const { allowedChildren } = await import('./index.js');

    expect(() => getChildren(undefined)).toThrow('__EXIT__');

    expect(errorSpy).toHaveBeenCalledWith('Error: Element name required');
    expect(logSpy).toHaveBeenCalledWith('Usage: node bin/ooxml children <element>');
    expect(allowedChildren).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('prints allowed children and total when children exist', () => {
    allowedChildren.mockReturnValue(['w:r', 'w:p']);
    getChildren('w:body');

    expect(logSpy).toHaveBeenCalledWith('Allowed children for w:body:');
    expect(logSpy).toHaveBeenCalledWith('  - w:r');
    expect(logSpy).toHaveBeenCalledWith('  - w:p');
    expect(logSpy).toHaveBeenCalledWith('\nTotal: 2 allowed children');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('prints leaf/simple-content message when element exists but has no children', () => {
    allowedChildren.mockReturnValue([]);
    hasElement.mockReturnValue(true);

    getChildren('w:t');

    expect(logSpy).toHaveBeenCalledWith('w:t has no children (leaf element or simple content)');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('prints "not found" and up to 5 suggestions for same prefix when element is unknown', () => {
    allowedChildren.mockReturnValue([]);
    hasElement.mockReturnValue(false);
    // Elements order matters for slice(0, 5)
    getSchema.mockReturnValue({
      elements: {
        'w:p': [],
        'w:para': [],
        'w:r': [],
        'a:blip': [],
        'w:tbl': [],
        'w:tr': [],
        'w:tc': [],
      },
    });

    getChildren('w:oops');

    expect(logSpy).toHaveBeenCalledWith('Element w:oops not found in schema');
    // "Did you mean one of these?" header should appear
    expect(logSpy).toHaveBeenCalledWith('\nDid you mean one of these?');

    // collect all console.log calls and count suggestion lines
    const suggestionLines = logSpy.mock.calls.map((args) => args.join(' ')).filter((line) => line.startsWith('  - '));

    // Only the first 5 "w:" keys should be listed
    expect(suggestionLines).toEqual(['  - w:p', '  - w:para', '  - w:r', '  - w:tbl', '  - w:tr']);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('handles "No schema JSON found" by printing guidance (no throw)', () => {
    allowedChildren.mockImplementation(() => {
      throw new Error('No schema JSON found at dist/schema.transitional.json');
    });

    expect(() => getChildren('w:p')).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith('Error: Schema not found. Run generator first:');
    expect(logSpy).toHaveBeenCalledWith('  node bin/ooxml');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('rethrows unexpected errors', () => {
    allowedChildren.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => getChildren('w:p')).toThrow(/boom/);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
