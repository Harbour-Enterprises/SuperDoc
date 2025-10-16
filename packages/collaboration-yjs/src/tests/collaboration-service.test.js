import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../internal-logger/logger.js', () => ({
  createLogger: vi.fn(),
}));

vi.mock('../document-manager/manager.js', () => ({
  DocumentManager: vi.fn(),
}));

vi.mock('../connection-handler/handler.js', () => ({
  ConnectionHandler: vi.fn(),
}));

vi.mock('../collaboration/helpers.js', () => ({
  generateParams: vi.fn(),
}));

import { createLogger as createLoggerMock } from '../internal-logger/logger.js';
import { DocumentManager as DocumentManagerMock } from '../document-manager/manager.js';
import { ConnectionHandler as ConnectionHandlerMock } from '../connection-handler/handler.js';
import { generateParams as generateParamsMock } from '../collaboration/helpers.js';
import { SuperDocCollaboration } from '../collaboration/collaboration.js';

describe('SuperDocCollaboration', () => {
  let handleSpy;
  let loggerSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    handleSpy = vi.fn();
    loggerSpy = vi.fn();

    createLoggerMock.mockImplementation(() => loggerSpy);

    DocumentManagerMock.mockImplementation(function DocumentManagerStub(config) {
      this.config = config;
      this.has = vi.fn();
    });

    ConnectionHandlerMock.mockImplementation(({ documentManager, hooks }) => ({
      handle: handleSpy,
      documentManager,
      hooks,
    }));

    generateParamsMock.mockImplementation(() => ({
      documentId: 'doc-123',
      params: {},
    }));
  });

  test('constructs with provided config and wires dependencies', () => {
    const hooks = { load: vi.fn() };
    const config = { name: 'alpha', hooks, debounce: 10, documentExpiryMs: 5000 };

    const service = new SuperDocCollaboration(config);

    expect(service.config).toBe(config);
    expect(DocumentManagerMock).toHaveBeenCalledWith(config);
    expect(ConnectionHandlerMock).toHaveBeenCalledWith({
      documentManager: DocumentManagerMock.mock.instances[0],
      hooks,
    });
    expect(service.documentManager).toBe(DocumentManagerMock.mock.instances[0]);
    expect(createLoggerMock).toHaveBeenCalledWith('SuperDocCollaboration');
  });

  test('name getter returns configured name or default', () => {
    const service = new SuperDocCollaboration({ hooks: {} });

    expect(service.name).toBe('SuperDocCollaboration');

    service.config.name = 'beta';
    expect(service.name).toBe('beta');
  });

  test('welcome logs and delegates to connection handler', async () => {
    const config = { hooks: {} };
    const service = new SuperDocCollaboration(config);
    const socket = { id: 'socket-1' };
    const request = { url: '/collab/doc-1', params: { documentId: 'doc-1' } };
    const params = { documentId: 'doc-999', params: { user: 'alice' } };

    generateParamsMock.mockReturnValueOnce(params);

    await service.welcome(socket, request);

    expect(generateParamsMock).toHaveBeenCalledWith(request, service);
    expect(loggerSpy).toHaveBeenCalledWith('New connection request', params.documentId);
    expect(handleSpy).toHaveBeenCalledWith(socket, request, params);
  });

  test('has proxies to the document manager instance', () => {
    const service = new SuperDocCollaboration({ hooks: {} });
    const manager = DocumentManagerMock.mock.instances[0];
    manager.has.mockReturnValueOnce(true);

    expect(service.has('doc-007')).toBe(true);
    expect(manager.has).toHaveBeenCalledWith('doc-007');
  });
});
