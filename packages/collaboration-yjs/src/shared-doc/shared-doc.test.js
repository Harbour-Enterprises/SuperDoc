import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestInstances = [];
const httpRequestMock = vi.fn(() => {
  const events = new Map();
  const req = {
    on: vi.fn((event, handler) => {
      events.set(event, handler);
      return req;
    }),
    write: vi.fn(),
    end: vi.fn(),
    abort: vi.fn(),
    trigger(event, ...args) {
      const handler = events.get(event);
      if (handler) {
        handler(...args);
      }
    },
  };

  requestInstances.push({ req, events });
  return req;
});

const createDebouncerMock = vi.fn((wait, maxWait) => {
  const debounced = vi.fn((cb) => cb());
  debounced.wait = wait;
  debounced.maxWait = maxWait;
  return debounced;
});

const parseIntMock = vi.fn((value) => Number.parseInt(value, 10));

const createEncoderMock = vi.fn(() => ({ chunks: [] }));
const writeVarUintMock = vi.fn((encoder, value) => {
  encoder.chunks.push({ type: 'varUint', value });
});
const writeVarUint8ArrayMock = vi.fn((encoder, value) => {
  encoder.chunks.push({ type: 'varUint8Array', value });
});
const toUint8ArrayMock = vi.fn((encoder) => encoder.chunks);
const encodingLengthMock = vi.fn((encoder) => encoder.chunks.length);

const createDecoderMock = vi.fn((message) => ({
  data: Array.from(message),
  index: 0,
}));
const readVarUintMock = vi.fn((decoder) => decoder.data[decoder.index++]);
const readVarUint8ArrayMock = vi.fn((decoder) => decoder.data[decoder.index++]);

let readSyncBehavior = 'write';
const writeUpdateMock = vi.fn((encoder, update) => {
  encoder.chunks.push({ type: 'update', value: update });
});
const writeSyncStep1Mock = vi.fn((encoder, _doc) => {
  encoder.chunks.push({ type: 'syncStep1' });
});
const writeSyncStep2Mock = vi.fn((encoder, _doc) => {
  encoder.chunks.push({ type: 'syncStep2' });
});
const readSyncMessageMock = vi.fn((decoder, encoder, _doc, _conn) => {
  if (readSyncBehavior === 'throw') {
    throw new Error('sync failure');
  }
  if (readSyncBehavior === 'write') {
    encoder.chunks.push({ type: 'syncResponse' });
  }
});

class FakeDoc {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)?.add(handler);
  }

  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }

  emit(event, args) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach((handler) => {
        handler(...(Array.isArray(args) ? args : [args]));
      });
    }
  }

  getArray(name) {
    return { toJSON: () => [`array:${name}`] };
  }

  getMap(name) {
    return { toJSON: () => ({ map: name }) };
  }

  getText(name) {
    return { toJSON: () => `text:${name}` };
  }

  getXmlFragment(name) {
    return { toJSON: () => ({ fragment: name }) };
  }

  getXmlElement(name) {
    return { toJSON: () => ({ element: name }) };
  }
}

class FakeAwareness {
  constructor() {
    this.localState = null;
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)?.add(handler);
  }

  emit(event, payload, conn) {
    this._listeners.get(event)?.forEach((handler) => handler(payload, conn));
  }

  setLocalState(state) {
    this.localState = state;
  }
}

const encodeAwarenessUpdateMock = vi.fn(() => new Uint8Array([5]));
const removeAwarenessStatesMock = vi.fn();
const applyAwarenessUpdateMock = vi.fn();

vi.mock('http', () => ({
  default: {
    request: httpRequestMock,
  },
}));

vi.mock('lib0/eventloop', () => ({
  createDebouncer: createDebouncerMock,
}));

vi.mock('lib0/number', () => ({
  parseInt: parseIntMock,
}));

vi.mock('lib0/encoding', () => ({
  createEncoder: createEncoderMock,
  writeVarUint: writeVarUintMock,
  writeVarUint8Array: writeVarUint8ArrayMock,
  toUint8Array: toUint8ArrayMock,
  length: encodingLengthMock,
}));

vi.mock('lib0/decoding', () => ({
  createDecoder: createDecoderMock,
  readVarUint: readVarUintMock,
  readVarUint8Array: readVarUint8ArrayMock,
}));

vi.mock('yjs', () => ({
  Doc: FakeDoc,
}));

vi.mock('y-protocols/awareness', () => ({
  Awareness: FakeAwareness,
  encodeAwarenessUpdate: encodeAwarenessUpdateMock,
  removeAwarenessStates: removeAwarenessStatesMock,
  applyAwarenessUpdate: applyAwarenessUpdateMock,
}));

vi.mock('y-protocols/sync', () => ({
  writeUpdate: writeUpdateMock,
  readSyncMessage: readSyncMessageMock,
  writeSyncStep1: writeSyncStep1Mock,
  writeSyncStep2: writeSyncStep2Mock,
}));

const createSocket = () => {
  const listeners = new Map();
  return {
    readyState: 1,
    send: vi.fn((_message, _opts, cb) => cb && cb(null)),
    close: vi.fn(),
    on: vi.fn((event, handler) => {
      listeners.set(event, handler);
    }),
    listeners,
    trigger(event, ...args) {
      listeners.get(event)?.(...args);
    },
  };
};

const lastRequest = () => requestInstances.at(-1)?.req;

let callbackHandlerMock;
let debouncerStub;
let isCallbackEnabled = false;

const mockSharedDocIndex = () => {
  callbackHandlerMock = vi.fn();
  debouncerStub = vi.fn((cb) => cb());
  vi.doMock('../shared-doc/index.js', () => ({
    messageSync: 0,
    messageAwareness: 1,
    wsReadyStateConnecting: 0,
    wsReadyStateOpen: 1,
    callbackHandler: callbackHandlerMock,
    isCallbackSet: isCallbackEnabled,
    debouncer: debouncerStub,
  }));
};

const loadSharedDocModule = async () => {
  mockSharedDocIndex();
  const mod = await import('../shared-doc/shared-doc.js');
  return mod;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
  requestInstances.length = 0;
  isCallbackEnabled = false;
  readSyncBehavior = 'write';
});

afterEach(() => {
  vi.unmock('../shared-doc/index.js');
});

describe('shared-doc constants and utils', () => {
  it('exposes constants and shared exports', async () => {
    const mod = await import('../shared-doc/index.js');
    expect(mod.messageSync).toBe(0);
    expect(mod.messageAwareness).toBe(1);
    expect(typeof mod.setupConnection).toBe('function');
  });

  it('creates debouncer with parsed env values', async () => {
    vi.stubEnv('CALLBACK_DEBOUNCE_WAIT', '1500');
    vi.stubEnv('CALLBACK_DEBOUNCE_MAXWAIT', '4000');

    const utils = await import('../shared-doc/utils.js');
    const { debouncer } = utils;

    expect(createDebouncerMock).toHaveBeenCalledWith(1500, 4000);
    let triggered = false;
    debouncer(() => {
      triggered = true;
    });
    expect(triggered).toBe(true);
  });
});

describe('callback handler', () => {
  it('reports callback as unset and does not perform requests', async () => {
    const { isCallbackSet, callbackHandler } = await import('../shared-doc/callback.js');

    expect(isCallbackSet).toBe(false);
    callbackHandler({
      name: 'room',
      getArray: () => ({ toJSON: () => [] }),
    });
    expect(httpRequestMock).not.toHaveBeenCalled();
  });

  it('sends callback payload and handles timeout and errors', async () => {
    vi.stubEnv('CALLBACK_URL', 'http://localhost:8080/hooks');
    vi.stubEnv(
      'CALLBACK_OBJECTS',
      JSON.stringify({
        array: 'Array',
        map: 'Map',
        text: 'Text',
        fragment: 'XmlFragment',
        element: 'XmlElement',
      })
    );
    vi.stubEnv('CALLBACK_TIMEOUT', '8000');

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { isCallbackSet, callbackHandler } = await import('../shared-doc/callback.js');
    expect(isCallbackSet).toBe(true);

    const doc = {
      name: 'room-123',
      getArray: vi.fn(() => ({ toJSON: () => ['arr'] })),
      getMap: vi.fn(() => ({ toJSON: () => ({ map: true }) })),
      getText: vi.fn(() => ({ toJSON: () => 'text-data' })),
      getXmlFragment: vi.fn(() => ({ toJSON: () => ({ fragment: true }) })),
      getXmlElement: vi.fn(() => ({ toJSON: () => ({ element: true }) })),
    };

    callbackHandler(doc);

    expect(httpRequestMock).toHaveBeenCalledTimes(1);
    const req = lastRequest();
    expect(req).toBeDefined();
    expect(req.write).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(req.write.mock.calls[0][0]);
    expect(payload).toMatchObject({
      room: 'room-123',
      data: {
        array: { type: 'Array', content: ['arr'] },
        map: { type: 'Map', content: { map: true } },
        text: { type: 'Text', content: 'text-data' },
        fragment: { type: 'XmlFragment', content: { fragment: true } },
        element: { type: 'XmlElement', content: { element: true } },
      },
    });

    req.trigger('timeout');
    expect(consoleWarn).toHaveBeenCalledWith('Callback request timed out.');
    expect(req.abort).toHaveBeenCalledTimes(1);

    req.trigger('error', new Error('failed\nreason'));
    expect(consoleError).toHaveBeenCalledWith('Callback request error:', 'Error: failedreason');
    expect(req.abort).toHaveBeenCalledTimes(2);

    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('throws when a callback object type is unsupported', async () => {
    vi.stubEnv('CALLBACK_URL', 'http://localhost:8080/hooks');
    vi.stubEnv(
      'CALLBACK_OBJECTS',
      JSON.stringify({
        unsupported: 'Unknown',
      })
    );

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { callbackHandler } = await import('../shared-doc/callback.js');

    expect(() =>
      callbackHandler({
        name: 'room-456',
      })
    ).toThrowError(/toJSON is not a function/);
    expect(httpRequestMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('SharedSuperDoc', () => {
  it('initializes awareness handlers and broadcasts updates', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    await doc.whenInitialized;

    const conn = createSocket();
    doc.conns.set(conn, new Set());

    doc.awareness.emit(
      'update',
      {
        added: [1, 2],
        updated: [3],
        removed: [],
      },
      conn
    );
    expect(doc.conns.get(conn)).toEqual(new Set([1, 2]));
    expect(encodeAwarenessUpdateMock).toHaveBeenCalled();
    expect(conn.send).toHaveBeenCalledTimes(1);

    doc.awareness.emit(
      'update',
      {
        added: [],
        updated: [],
        removed: [2],
      },
      conn
    );
    expect(doc.conns.get(conn)).toEqual(new Set([1]));
    expect(conn.send).toHaveBeenCalledTimes(2);

    doc.awareness.emit(
      'update',
      {
        added: [],
        updated: [],
        removed: [],
      },
      null
    );
  });

  it('invokes callback debouncer when enabled', async () => {
    isCallbackEnabled = true;
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc } = sharedDocModule;

    const doc = new SharedSuperDoc('with-callback');
    const update = new Uint8Array([1]);

    doc.emit('update', [update, null, doc]);
    expect(debouncerStub).toHaveBeenCalledTimes(1);
    expect(callbackHandlerMock).toHaveBeenCalledWith(doc);
  });

  it('setupConnection registers handlers and sends initial sync', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    setupConnection(conn, doc);

    expect(doc.conns.has(conn)).toBe(true);
    expect(writeSyncStep1Mock).toHaveBeenCalledWith(expect.any(Object), doc);
    expect(conn.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(conn.send).toHaveBeenCalledTimes(1);
  });

  it('messageListener responds to sync messages with data', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    setupConnection(conn, doc);

    const messageHandler = conn.listeners.get('message');
    readSyncBehavior = 'write';
    messageHandler(new Uint8Array([0]));

    expect(readSyncMessageMock).toHaveBeenCalled();
    expect(conn.send).toHaveBeenCalledTimes(2);
  });

  it('messageListener responds with sync step 2 when no data', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    setupConnection(conn, doc);

    const messageHandler = conn.listeners.get('message');
    readSyncBehavior = 'empty';
    messageHandler(new Uint8Array([0]));

    expect(writeSyncStep2Mock).toHaveBeenCalled();
    expect(conn.send).toHaveBeenCalledTimes(2);
  });

  it('messageListener applies awareness updates', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    setupConnection(conn, doc);

    const messageHandler = conn.listeners.get('message');
    messageHandler(new Uint8Array([1, 42]));

    expect(applyAwarenessUpdateMock).toHaveBeenCalledWith(doc.awareness, 42, conn);
    expect(conn.send).toHaveBeenCalledTimes(1);
  });

  it('messageListener logs unknown message types', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    setupConnection(conn, doc);

    const messageHandler = conn.listeners.get('message');
    messageHandler(new Uint8Array([99]));

    expect(consoleWarn).toHaveBeenCalledWith('Unknown message type:', 99);
    consoleWarn.mockRestore();
  });

  it('messageListener captures errors and emits on doc', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, setupConnection } = sharedDocModule;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const doc = new SharedSuperDoc('demo');
    const errorListener = vi.fn();
    doc.on('error', errorListener);

    const conn = createSocket();
    setupConnection(conn, doc);

    const messageHandler = conn.listeners.get('message');
    readSyncBehavior = 'throw';
    messageHandler(new Uint8Array([0]));

    expect(consoleError).toHaveBeenCalledWith('Error in messageListener:', expect.any(Error));
    expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    consoleError.mockRestore();
  });

  it('broadcasts updates to all connections', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const connA = createSocket();
    const connB = createSocket();
    doc.conns.set(connA, new Set());
    doc.conns.set(connB, new Set());

    const update = new Uint8Array([7, 8]);
    doc.emit('update', [update, null, doc]);

    expect(writeVarUintMock).toHaveBeenCalledWith(expect.any(Object), 0);
    expect(writeUpdateMock).toHaveBeenCalledWith(expect.any(Object), update);
    expect(connA.send).toHaveBeenCalledTimes(1);
    expect(connB.send).toHaveBeenCalledTimes(1);
  });

  it('send closes connections when invalid or failing', async () => {
    const sharedDocModule = await loadSharedDocModule();
    const { SharedSuperDoc, send } = sharedDocModule;

    const doc = new SharedSuperDoc('demo');
    const conn = createSocket();
    conn.readyState = 3;
    doc.conns.set(conn, new Set([1, 2]));

    send(doc, conn, new Uint8Array([1]));
    expect(conn.close).toHaveBeenCalledTimes(1);
    expect(removeAwarenessStatesMock).toHaveBeenCalledWith(doc.awareness, [1, 2], null);
    expect(doc.conns.has(conn)).toBe(false);

    const connWithError = createSocket();
    doc.conns.set(connWithError, new Set());
    connWithError.send.mockImplementation((_message, _opts, cb) => cb(new Error('fail')));
    send(doc, connWithError, new Uint8Array([2]));
    expect(connWithError.close).toHaveBeenCalledTimes(1);

    const connThrow = createSocket();
    doc.conns.set(connThrow, new Set());
    connThrow.send.mockImplementation(() => {
      throw new Error('boom');
    });
    send(doc, connThrow, new Uint8Array([3]));
    expect(connThrow.close).toHaveBeenCalledTimes(1);
  });
});
