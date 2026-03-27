export class ServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'service_error') {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.code = code;
  }
}

export const isServiceError = (error: unknown): error is ServiceError => error instanceof ServiceError;

export const ensureString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
