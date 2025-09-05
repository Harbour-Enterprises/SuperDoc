import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

vi.mock('./lookup.js', () => ({
  childrenOf: vi.fn(),
  allTags: vi.fn(),
  namespaces: vi.fn(),
}));
vi.mock('./index.js', () => ({
  getAttributes: vi.fn(),
}));

import { childrenOf, allTags, namespaces } from './lookup.js';
import { getAttributes } from './index.js';
import { runChildrenCLI } from './cli.js';

// Helper to make process.exit stop execution but assert exit code
class ExitError extends Error {
  constructor(code) {
    super(`__EXIT__:${code}`);
    this.code = code;
  }
}

describe('runChildrenCLI', () => {
  let logSpy, errSpy, exitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitError(code);
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('children: exits with usage when missing qname', () => {
    expect(() => runChildrenCLI(['children'])).toThrow(ExitError);
    expect(errSpy).toHaveBeenCalledWith('Usage: ooxml children <prefix:local>');
    // exit code 2
    try {
      runChildrenCLI(['children']);
    } catch (e) {
      expect(e).toBeInstanceOf(ExitError);
      expect(e.code).toBe(2);
    }
    expect(childrenOf).not.toHaveBeenCalled();
  });

  it('children: prints JSON children array for provided qname', () => {
    childrenOf.mockReturnValue(['w:r', 'w:p']);
    runChildrenCLI(['children', 'w:body']);
    expect(childrenOf).toHaveBeenCalledWith('w:body');
    // first arg to a JSON.stringify log is the stringified array (pretty-printed)
    const out = logSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(out).toContain('"w:r"');
    expect(out).toContain('"w:p"');
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('tags: no args → JSON with count & tags, then "Total tags (filtered):" line', () => {
    allTags.mockReturnValue(['w:p', 'w:r', 'a:blip']);
    runChildrenCLI(['tags']);
    expect(allTags).toHaveBeenCalledWith({ prefix: null, hasChildren: null });
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls[0]).toMatch(/"count":\s*3/);
    expect(calls[0]).toMatch(/"tags":\s*\[/);
    expect(calls[1]).toBe('Total tags (filtered): 3');
  });

  it('tags: with prefix and --parents → filters via hasChildren=true', () => {
    allTags.mockReturnValue(['w:p', 'w:r']);
    runChildrenCLI(['tags', 'w', '--parents']);
    expect(allTags).toHaveBeenCalledWith({ prefix: 'w', hasChildren: true });
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls[0]).toMatch(/"count":\s*2/);
    expect(calls[1]).toBe('Total tags (filtered): 2');
  });

  it('tags: --plain outputs newline-joined list + Total tags', () => {
    allTags.mockReturnValue(['w:p', 'w:r', 'w:tbl']);
    runChildrenCLI(['tags', '--plain']);
    // plain should not JSON.stringify the payload; just join with \n
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls[0]).toBe('w:p\nw:r\nw:tbl');
    expect(calls[1]).toBe('Total tags (filtered): 3');
  });

  it('tags: prefix + --plain + --parents parses flags after prefix', () => {
    allTags.mockReturnValue(['w:p']);
    runChildrenCLI(['tags', 'w', '--plain', '--parents']);
    expect(allTags).toHaveBeenCalledWith({ prefix: 'w', hasChildren: true });
    const calls = logSpy.mock.calls.map((c) => c[0]);
    expect(calls[0]).toBe('w:p');
    expect(calls[1]).toBe('Total tags (filtered): 1');
  });

  it('namespaces: prints JSON of namespaces()', () => {
    namespaces.mockReturnValue({ w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main' });
    runChildrenCLI(['namespaces']);
    const first = logSpy.mock.calls[0][0];
    expect(first).toContain('"w"');
    expect(first).toContain('wordprocessingml');
  });

  it('attrs: no qname → usage() and exit 2', () => {
    expect(() => runChildrenCLI(['attrs'])).toThrow(ExitError);
    expect(errSpy.mock.calls.map((c) => c[0]).join('\n')).toMatch(/Usage:/);
    try {
      runChildrenCLI(['attrs']);
    } catch (e) {
      expect(e).toBeInstanceOf(ExitError);
      expect(e.code).toBe(2);
    }
    expect(getAttributes).not.toHaveBeenCalled();
  });

  it('attrs: unknown element (null) → notFound and exit 2', () => {
    getAttributes.mockReturnValue(null);
    expect(() => runChildrenCLI(['attrs', 'w:oops'])).toThrow(ExitError);
    expect(errSpy).toHaveBeenCalledWith('Unknown element: w:oops');
    try {
      runChildrenCLI(['attrs', 'w:oops']);
    } catch (e) {
      expect(e).toBeInstanceOf(ExitError);
      expect(e.code).toBe(2);
    }
  });

  it('attrs: empty object → prints "(no attributes)"', () => {
    getAttributes.mockReturnValue({});
    runChildrenCLI(['attrs', 'w:t']);
    expect(logSpy).toHaveBeenCalledWith('(no attributes)');
  });

  it('attrs: prints spec lines including use/type/default/fixed/ref when present', () => {
    getAttributes.mockReturnValue({
      'w:val': { use: 'optional', type: 'ST_String' },
      'w:color': { type: 'ST_HexColor', default: 'auto' },
      'w:foo': { fixed: 'bar', ref: 'w:bar' },
      'w:bare': {},
    });
    runChildrenCLI(['attrs', 'w:u']);

    const lines = logSpy.mock.calls.map((c) => c[0]);

    expect(lines).toContain('w:val  use=optional type=ST_String');
    expect(lines).toContain('w:color  type=ST_HexColor default=auto');
    expect(lines).toContain('w:foo  fixed=bar ref=w:bar');
    expect(lines).toContain('w:bare');
  });

  it('default: prints top-level usage and exits 2 on unknown subcommand', () => {
    expect(() => runChildrenCLI(['wat', 'arg1'])).toThrow(ExitError);
    const err = errSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(err).toMatch(/Usage:\n\s+ooxml children <qname>/);
    try {
      runChildrenCLI(['wat']);
    } catch (e) {
      expect(e).toBeInstanceOf(ExitError);
      expect(e.code).toBe(2);
    }
  });
});
