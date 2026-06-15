import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import type { AppEnv } from './context';

/** A domain/HTTP error with a machine-readable code, surfaced via the API. */
export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFound = (what = 'Resource') => new ApiError(404, 'not_found', `${what} not found`);
export const forbidden = (msg = 'You are not allowed to do that') =>
  new ApiError(403, 'forbidden', msg);
export const unauthorized = () => new ApiError(401, 'unauthorized', 'Authentication required');
export const conflict = (msg: string) => new ApiError(409, 'conflict', msg);

/** Hono `onError` handler: map known errors to the shared error envelope. */
export function handleError(err: Error, c: Context<AppEnv>) {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.status,
    );
  }
  if (err instanceof ZodError) {
    return c.json(
      { error: { code: 'validation_error', message: 'Invalid request', details: err.flatten() } },
      400,
    );
  }
  // Unknown error — log it (the request logger has request-id context).
  c.get('deps')?.logger?.error({ err }, 'Unhandled error');
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
}
