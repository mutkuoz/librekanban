import { OpenAPIHono } from '@hono/zod-openapi';
import type { ZodType } from 'zod';
import type { AppEnv } from '../lib/context';
import { ApiError } from '../lib/errors';

/**
 * An OpenAPIHono router wired to our app context + error envelope. The
 * defaultHook turns request-validation failures into our standard ApiError so
 * every error response has the same shape.
 */
export function makeRouter(): OpenAPIHono<AppEnv> {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw new ApiError(400, 'validation_error', 'Invalid request', result.error.flatten());
      }
    },
  });
}

/** Build a single-status JSON response definition for `createRoute`. */
export const jsonResponse = <T extends ZodType>(schema: T, description = 'Success') =>
  ({ content: { 'application/json': { schema } }, description }) as const;

/** Build a required JSON request body definition for `createRoute`. */
export const jsonBody = <T extends ZodType>(schema: T) =>
  ({ content: { 'application/json': { schema } }, required: true }) as const;
