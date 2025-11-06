import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../shared-doc/index.js', () => ({
  setupConnection: vi.fn(),
}));

vi.mock('../internal-logger/logger.js', () => ({
  createLogger: vi.fn(),
}));

import { setupConnection } from '../shared-doc/index.js';
import { createLogger as createLoggerMock } from '../internal-logger/logger.js';
import { ConnectionHandler } from '../connection-handler/handler.js';
import type { CollaborationWebSocket, SocketRequest } from '../types/service-types.js';
import type { DocumentManager } from '../document-manager/manager.js';

describe('ConnectionHandler', () => {
  type TestSocket = CollaborationWebSocket & {
    events: Record<string, (...args: unknown[]) => void>;
  };

  let documentManager: DocumentManager;
  let socket: TestSocket;
  let socketEvents: Record<string, (...args: unknown[]) => void>;
  let sharedDoc: { name: string; on: ReturnType<typeof vi.fn> };
  let docEvents: Record<string, (...args: unknown[]) => void>;
  let loggerSpy: ReturnType<typeof vi.fn>;
  const createLoggerFn = createLoggerMock as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    loggerSpy = vi.fn();
    createLoggerFn.mockReturnValue(loggerSpy);

    socketEvents = {};
    socket = {
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        socketEvents[event] = handler;
      }),
      events: socketEvents,
    } as TestSocket;

    docEvents = {};
    sharedDoc = {
      name: 'doc-1',
      on: vi.fn((event, handler) => {
        docEvents[event] = handler;
      }),
    };

    documentManager = {
      getDocument: vi.fn().mockResolvedValue(sharedDoc),
      releaseConnection: vi.fn(),
    } as unknown as DocumentManager;
  });

  test('handle authenticates, wires hooks, and returns user params', async () => {
    const beforeChange = vi.fn();
    const change = vi.fn();
    const userContext = { id: 'user-1' };
    const hooks = {
      authenticate: vi.fn().mockResolvedValue(userContext),
      beforeChange,
      change,
    };

    const handler = new ConnectionHandler({ documentManager, hooks });
    const params = { documentId: 'doc-1', role: 'editor' };
    const request: SocketRequest = { url: '/collab/doc-1', params: { documentId: 'doc-1' } };

    const result = await handler.handle(socket, request, params);

    expect(hooks.authenticate).toHaveBeenCalledWith(expect.objectContaining(params));
    expect(documentManager.getDocument).toHaveBeenCalledWith('doc-1', result);
    expect(result).toMatchObject({ documentId: 'doc-1', role: 'editor', userContext, document: sharedDoc });
    expect(setupConnection).toHaveBeenCalledWith(socket, sharedDoc);

    // invoke registered doc listeners
    docEvents.beforeTransaction();
    expect(beforeChange).toHaveBeenCalledWith(result);

    docEvents.update();
    expect(change).toHaveBeenCalledWith(result);

    // simulate socket close to ensure cleanup
    socketEvents.close(1000, Buffer.from('bye'));
    expect(documentManager.releaseConnection).toHaveBeenCalledWith('doc-1', socket);
    expect(loggerSpy).toHaveBeenCalledWith(
      '🔌 Socket closed, cleaning up connection for',
      'doc-1',
      expect.objectContaining({ code: 1000 })
    );
  });

  test('handle skips authentication when hook missing', async () => {
    const handler = new ConnectionHandler({ documentManager, hooks: {} });
    const params = { documentId: 'doc-2' };
    const request: SocketRequest = { url: '/collab/doc-2', params: { documentId: 'doc-2' } };

    const result = await handler.handle(socket, request, params);

    expect(result.userContext).toBeUndefined();
    expect(documentManager.getDocument).toHaveBeenCalledWith('doc-2', result);
  });

  test('handle closes socket when authenticate returns falsy', async () => {
    const hooks = {
      authenticate: vi.fn().mockResolvedValue(undefined),
    };

    const handler = new ConnectionHandler({ documentManager, hooks });
    const params = { documentId: 'doc-3' };
    const request: SocketRequest = { url: '/collab/doc-3', params: { documentId: 'doc-3' } };

    await expect(handler.handle(socket, request, params)).rejects.toThrowError('Authentication failed for connection');

    expect(socket.close).toHaveBeenCalledWith(1008, 'Authentication failed');
    expect(loggerSpy).toHaveBeenCalledWith('⛔ Auth rejected for doc-3');
    expect(documentManager.getDocument).not.toHaveBeenCalled();
  });

  test('handle closes socket when authenticate throws', async () => {
    const error = new Error('boom');
    const hooks = {
      authenticate: vi.fn().mockRejectedValue(error),
    };

    const handler = new ConnectionHandler({ documentManager, hooks });
    const params = { documentId: 'doc-4' };
    const request: SocketRequest = { url: '/collab/doc-4', params: { documentId: 'doc-4' } };

    await expect(handler.handle(socket, request, params)).rejects.toThrowError('Authentication failed for connection');

    expect(socket.close).toHaveBeenCalledWith(1011, 'Internal auth error');
    expect(loggerSpy).toHaveBeenCalledWith('🛑 Auth hook threw:', error);
    expect(documentManager.getDocument).not.toHaveBeenCalled();
  });

  test('handle does not open document when authenticate returns false', async () => {
    const hooks = {
      authenticate: vi.fn().mockResolvedValue(false),
    };

    const handler = new ConnectionHandler({ documentManager, hooks });
    const params = { documentId: 'doc-5' };
    const request: SocketRequest = { url: '/collab/doc-5', params: { documentId: 'doc-5' } };

    await expect(handler.handle(socket, request, params)).rejects.toThrowError('Authentication failed for connection');

    expect(documentManager.getDocument).not.toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledWith(1008, 'Authentication failed');
  });

  test('hangUp logs and closes the socket', () => {
    const handler = new ConnectionHandler({ documentManager, hooks: {} });
    handler.hangUp(socket, 'Something went wrong', 4000);

    expect(loggerSpy).toHaveBeenCalledWith('Closing socket (4000)...', 'Something went wrong');
    expect(socket.close).toHaveBeenCalledWith(4000, 'Something went wrong');
  });
});
