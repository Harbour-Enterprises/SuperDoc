/**
 * Custom error class which allows to pass additional details
 * @param {string} name - Error name
 * @param {string} message - Error message
 * @param {object} details - additional details from the calling context
 */
export function ErrorWithDetails(name: string, message: string, details: object): void;
export class ErrorWithDetails {
    /**
     * Custom error class which allows to pass additional details
     * @param {string} name - Error name
     * @param {string} message - Error message
     * @param {object} details - additional details from the calling context
     */
    constructor(name: string, message: string, details: object);
    name: string;
    message: string;
    details: any;
    stack: string;
}
