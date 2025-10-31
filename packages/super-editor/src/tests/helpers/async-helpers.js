/**
 * Asynchronous test utilities for waiting on conditions
 * @module tests/helpers/async-helpers
 */

/**
 * Sleeps for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls an assertion function until it passes or times out.
 * Useful for waiting on asynchronous state changes in tests.
 *
 * @param {Function} assertion - Function that throws if condition not met, returns value if met
 * @param {Object} [options] - Configuration options
 * @param {number} [options.timeout=1000] - Maximum time to wait in milliseconds
 * @param {number} [options.interval=10] - Time between polling attempts in milliseconds
 * @returns {Promise<*>} The value returned by the assertion function
 * @throws {Error} The last error from assertion if timeout is reached
 *
 * @example
 * // Wait for an element to appear
 * await waitFor(() => {
 *   const element = document.querySelector('.my-element');
 *   if (!element) throw new Error('Element not found');
 *   return element;
 * }, { timeout: 2000 });
 *
 * @example
 * // Wait for editor state to be ready
 * await waitFor(() => {
 *   expect(editor.storage?.pagination?.repository).toBeTruthy();
 * });
 */
export const waitFor = async (assertion, { timeout = 1000, interval = 10 } = {}) => {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeout) {
    try {
      return await assertion();
    } catch (error) {
      lastError = error;
      await sleep(interval);
    }
  }

  // One final attempt without sleeping
  try {
    return await assertion();
  } catch (error) {
    const timeoutError = new Error(`waitFor timed out after ${timeout}ms. Last error: ${error.message}`);
    timeoutError.cause = error;
    throw timeoutError;
  }
};
