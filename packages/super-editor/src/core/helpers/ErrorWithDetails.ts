/**
 * Custom error class which allows passing additional details
 */
export class ErrorWithDetails extends Error {
  details: unknown;

  constructor(name: string, message = '', details?: unknown) {
    super(message);
    this.name = name;
    this.details = details;
  }
}
