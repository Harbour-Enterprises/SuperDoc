import { setupConnection } from '../shared-doc/index.js';
import { createLogger } from '../internal-logger/logger.js';
import type {
  CollaborationParams,
  CollaborationWebSocket,
  Hooks,
  SocketRequest,
  UserContext,
} from '../types/service-types.js';
import type { DocumentManager } from '../document-manager/manager.js';

interface ConnectionHandlerConfig {
  documentManager: DocumentManager;
  hooks?: Hooks;
}

/**
 * Handles WebSocket connections for collaborative document editing.
 * This class manages the connection lifecycle, including authentication,
 * setting up the document, and handling incoming messages.
 * It also provides methods to close the connection gracefully.
 */
export class ConnectionHandler {
  documentManager: DocumentManager;
  #hooks: Hooks | undefined;
  #log = createLogger('ConnectionHandler');
  #socket: CollaborationWebSocket | null = null;
  #request: SocketRequest | null = null;
  #documentId = '';
  #params!: CollaborationParams;

  constructor({ documentManager, hooks }: ConnectionHandlerConfig) {
    this.documentManager = documentManager;
    this.#hooks = hooks;
  }

  async handle(
    socket: CollaborationWebSocket,
    request: SocketRequest,
    params: CollaborationParams
  ): Promise<CollaborationParams> {
    this.#socket = socket;
    this.#request = request;
    this.#params = { ...params };
    this.#documentId = this.#params.documentId;

    /**
     * Attempt to authenticate the connection.
     * If the authentication hook throws an error, we abort the connection
     */
    const userContextResult = await this.#authenticate(this.#socket, this.#request, this.#params);
    if (userContextResult === false) {
      throw new Error('Authentication failed for connection');
    }

    const normalizedContext = userContextResult === true ? undefined : userContextResult || undefined;
    const userParams: CollaborationParams =
      normalizedContext !== undefined ? { ...this.#params, userContext: normalizedContext } : { ...this.#params };

    /**
     * If authenticated, load the document
     */
    const sharedDoc = await this.documentManager.getDocument(this.#documentId, userParams);
    userParams.document = sharedDoc;

    /**
     * Connect some listeners for our hooks, if provided
     */
    if (this.#hooks?.beforeChange) {
      // keeping transaction here for future reference
      sharedDoc.on('beforeTransaction', (_transaction: unknown) => {
        this.#hooks?.beforeChange?.(userParams);
      });
    }

    if (this.#hooks?.change) {
      // keeping origin here for future reference
      sharedDoc.on('update', (_update: Uint8Array, _origin: unknown) => {
        this.#hooks?.change?.(userParams);
      });
    }

    socket.on('close', (...args: unknown[]) => {
      const [code, reason] = args as [number, Buffer];
      this.#log('🔌 Socket closed, cleaning up connection for', params.documentId, { code, reason });
      this.documentManager.releaseConnection(params.documentId, socket);
    });

    if (!this.#socket) {
      throw new Error('Socket not initialized');
    }
    setupConnection(this.#socket, sharedDoc);

    return userParams;
  }

  async #authenticate(
    socket: CollaborationWebSocket,
    _request: SocketRequest,
    params: CollaborationParams
  ): Promise<UserContext | boolean> {
    if (!this.#hooks?.authenticate) {
      return true;
    }

    try {
      const userContext = await this.#hooks.authenticate(params);
      if (!userContext) {
        this.#log(`⛔ Auth rejected for ${params.documentId}`);
        socket.close(1008, 'Authentication failed');
        return false;
      }
      return userContext;
    } catch (err) {
      this.#log(`🛑 Auth hook threw:`, err);
      socket.close(1011, 'Internal auth error');
      return false;
    }
  }

  hangUp(socket: CollaborationWebSocket, errorMessage: string, code = 1011) {
    this.#log(`Closing socket (${code})...`, errorMessage);
    socket.close(code, errorMessage);
  }
}
