/**
 * Extracts all params for the provider request and websocket connection.
 * @param {import('../types.js').SocketRequest} request - The request object containing the URL and parameters.
 * @returns {Object} An object containing the documentId and any query parameters.
 */
export const generateParams = (request) => {
  const { params } = request;
  const { documentId } = params;
  const urlParts = request.url.split('?');
  const queryString = urlParts[1] || '';
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));

  return {
    ...queryParams,
    documentId,
  };
};
