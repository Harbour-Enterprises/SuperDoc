import { HocuspocusProvider } from '@hocuspocus/provider';
import { awarenessStatesToArray } from '@harbour-enterprises/common/collaboration/awareness.js';
import { Doc as YDoc } from 'yjs';

/**
 * Translate awareness states to an array of users. This will cause superdoc (context) to
 * emit an awareness-update event with the list of users.
 *
 * @param {Object} context The superdoc instance
 * @param {*} states The awareness states
 * @returns {void}
 */
function createAwarenessHandler(context, states) {
  // Context is the superdoc instance
  // Since co-presence is handled outside of superdoc,
  // we need to emit an awareness-update event
  context.emit('awareness-update', awarenessStatesToArray(context, states));
}

/**
 * Main function to create a provider for collaboration.
 * Currently only hocuspocus is actually supported.
 *
 * @param {Object} param The config object
 * @param {Object} param.config The configuration object
 * @param {Object} param.ydoc The Yjs document
 * @param {Object} param.user The user object
 * @param {string} param.documentId The document ID
 * @returns {Object} The provider and socket
 */
function createProvider({ config, user, documentId, socket, superdocInstance }) {
  config.providerType = 'hocuspocus';
  const providers = {
    hocuspocus: () => createHocuspocusProvider({ config, user, documentId, socket, superdocInstance }),
  };
  return providers[config.providerType]();
}

/**
 *
 * @param {Object} param The config object
 * @param {Object} param.config The configuration object
 * @param {Object} param.ydoc The Yjs document
 * @param {Object} param.user The user object
 * @param {string} param.documentId The document ID
 * @returns {Object} The provider and socket
 */
function createHocuspocusProvider({ config, user, documentId, socket, superdocInstance }) {
  const ydoc = new YDoc({ gc: false });
  const options = {
    websocketProvider: socket,
    document: ydoc,
    name: documentId,
    token: config.token || '',
    preserveConnection: false,
    onAuthenticationFailed: () => onAuthenticationFailed(documentId),
    onConnect: () => onConnect(superdocInstance, documentId),
    onDisconnect: () => onDisconnect(superdocInstance, documentId),
  };

  const provider = new HocuspocusProvider(options);
  provider.setAwarenessField('user', user);
  return { provider, ydoc };
}

const onAuthenticationFailed = (data, documentId) => {
  console.warn('🔒 [superdoc] Authentication failed', data, 'document', documentId);
};

const onConnect = (superdocInstance, documentId) => {
  console.warn('🔌 [superdoc] Connected -- ', documentId);
};

const onDisconnect = (superdocInstance, documentId) => {
  console.warn('🔌 [superdoc] Disconnected', documentId);
};

export { createAwarenessHandler, createProvider };
