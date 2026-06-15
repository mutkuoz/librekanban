import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from './lib/context';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const mimeFor = (path: string): string => {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME[ext] ?? 'application/octet-stream';
};

/**
 * Serve the built SPA from `dir` (single-container deploy). Real asset files
 * are returned directly; everything else falls back to index.html so the
 * client router can handle the route. API/auth/health paths are excluded.
 */
export function serveSpa(app: OpenAPIHono<AppEnv>, dir: string): void {
  const indexHtml = readFileSync(join(dir, 'index.html'), 'utf8');

  app.get('*', (c) => {
    const path = c.req.path;
    if (path.startsWith('/api') || path === '/healthz' || path === '/readyz') {
      return c.json({ error: { code: 'not_found', message: 'Not found' } }, 404);
    }
    const rel = path === '/' ? 'index.html' : path.replace(/^\/+/, '');
    const filePath = normalize(join(dir, rel));
    if (filePath.startsWith(dir) && existsSync(filePath) && statSync(filePath).isFile()) {
      return c.body(readFileSync(filePath), 200, { 'content-type': mimeFor(filePath) });
    }
    return c.html(indexHtml);
  });
}
