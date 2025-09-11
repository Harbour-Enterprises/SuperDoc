/**
 * @param {string} json
 * @returns {Object}
 */
export function parseTagValueJSON(json) {
  try {
    const attrs = JSON.parse(json);
    return attrs;
  } catch (err) {
    console.error(err);
    return {};
  }
}
