import { createAwarenessHandler, createProvider } from '../collaboration/collaboration';
import useComment from '../../components/CommentsLayer/use-comment';

/**
 * Initialize sync for comments if the module is enabled
 * 
 * @param {Object} superdoc The SuperDoc instance
 * @returns {void}
 */
export const initCollaborationComments = (superdoc) => {
  if (!superdoc.config.modules.comments) return;

  // Get the comments map from the Y.Doc
  const commentsMap = superdoc.ydoc.getMap('comments');

  // Observe changes to the comments map
  commentsMap.observe((event) => {
    // Ignore events if triggered by the current user
    const currentUser = superdoc.config.user;
    const { user = {} } = event.transaction.origin;
    if (currentUser.name === user.name && currentUser.email === user.email) return;

    // Update conversations
    const comments = commentsMap.get('comments');
    superdoc.commentsStore.commentsList = comments.map((c) => useComment(c));
  });
};

/**
 * Initialize SuperDoc general Y.Doc for high level collaboration
 * Assigns superdoc.ydoc and superdoc.provider in place
 * 
 * @param {Object} superdoc The SuperDoc instance
 * @returns {void}
 */
export const initSuperdocYdoc = (superdoc) => {
  const { isInternal } = superdoc.config;
  const baseName = `${superdoc.config.superdocId}-superdoc`;
  const documentId = isInternal ? baseName : `${baseName}-external`;

  const superdocCollaborationOptions = {
    config: superdoc.config.modules.collaboration,
    user: superdoc.config.user,
    documentId,
    socket: superdoc.socket,
    superdocInstance: superdoc,
  };
  const { provider: superdocProvider, ydoc: superdocYdoc } = createProvider(superdocCollaborationOptions);
  superdoc.ydoc = superdocYdoc;
  superdoc.provider = superdocProvider;
};

/**
 * Process SuperDoc's documents to make them collaborative by 
 * adding provider, ydoc, awareness handler, and socket to each document.
 * 
 * @param {Object} superdoc The SuperDoc instance
 * @returns {Array[Object]} The processed documents
 */
export const makeDocumentsCollaborative = (superdoc) => {
  const processedDocuments = [];
  superdoc.config.documents.forEach((doc) => {
    superdoc.config.user.color = superdoc.colors[0];
    const options = {
      config: superdoc.config.modules.collaboration,
      user: superdoc.config.user,
      documentId: doc.id,
      socket: superdoc.socket,
      superdocInstance: superdoc,
    };

    const { provider, ydoc } = createProvider(options);
    doc.provider = provider;
    doc.socket = superdoc.socket;
    doc.ydoc = ydoc;
    doc.role = superdoc.config.role;
    provider.on('awarenessUpdate', ({ states }) => createAwarenessHandler(superdoc, states));
    processedDocuments.push(doc);
  });
  return processedDocuments;
};

/**
 * Sync local comments with ydoc and other clients if in collaboration mode and comments module is enabled
 * 
 * @param {Object} superdoc 
 * @returns {void}
 */
export const syncCommentsToClients = (superdoc) => {
  if (superdoc.isCollaborative && superdoc.config.modules.comments) {

    const list = superdoc.commentsStore.commentsList;
    const yComments = superdoc.ydoc.getMap('comments');
    superdoc.ydoc.transact(() => {
      yComments.set('comments', list);
    }, { user: superdoc.user });
  };
};
