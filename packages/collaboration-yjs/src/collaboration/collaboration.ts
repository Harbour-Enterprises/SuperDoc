import { generateParams } from './helpers.js';
import { createLogger } from '../internal-logger/logger.js';

import { DocumentManager } from '../document-manager/manager.js';
import { ConnectionHandler } from '../connection-handler/handler.js';
import type { CollaborationWebSocket, ServiceConfig, SocketRequest } from '../types/service-types.js';

export class SuperDocCollaboration {
  readonly config: ServiceConfig;
  readonly documentManager: DocumentManager;
  #connectionHandler: ConnectionHandler;
  #log = createLogger('SuperDocCollaboration');

  constructor(config: ServiceConfig) {
    this.config = config;
    this.documentManager = new DocumentManager(config);

    const handlerConfig =
      config.hooks !== undefined
        ? { documentManager: this.documentManager, hooks: config.hooks }
        : { documentManager: this.documentManager };

    this.#connectionHandler = new ConnectionHandler(handlerConfig);
  }

  get name(): string {
    return this.config.name || 'SuperDocCollaboration';
  }

  async welcome(socket: CollaborationWebSocket, request: SocketRequest): Promise<void> {
    const params = generateParams(request, this);
    this.#log('New connection request', params.documentId);
    await this.#connectionHandler.handle(socket, request, params);
  }

  has(documentId: string): boolean {
    return this.documentManager.has(documentId);
  }
}
