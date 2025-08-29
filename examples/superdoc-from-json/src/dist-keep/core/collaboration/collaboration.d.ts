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
export function createProvider({ config, user, documentId, socket, superdocInstance }: {
    config: any;
    ydoc: any;
    user: any;
    documentId: string;
}): any;
//# sourceMappingURL=collaboration.d.ts.map