import { createHmac, randomBytes } from 'node:crypto';
import { type Database, newId, webhookDeliveries, webhooks } from '@librekanban/db';
import type {
  CreateWebhookInput,
  CreatedWebhook,
  UpdateWebhookInput,
  Webhook,
  WebhookDelivery,
} from '@librekanban/shared';
import { and, desc, eq } from 'drizzle-orm';
import type { Deps } from '../lib/context';
import { notFound } from '../lib/errors';
import { assertWorkspacePermission } from './permissions';

type WebhookRow = typeof webhooks.$inferSelect;

const toDTO = (w: WebhookRow): Webhook => ({
  id: w.id,
  url: w.url,
  events: w.events,
  isActive: w.isActive,
  createdAt: w.createdAt.toISOString(),
});

async function loadWebhook(db: Database, id: string): Promise<WebhookRow> {
  const rows = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!rows[0]) throw notFound('Webhook');
  return rows[0];
}

export async function listWebhooks(
  deps: Deps,
  userId: string,
  workspaceId: string,
): Promise<Webhook[]> {
  await assertWorkspacePermission(deps.db, userId, workspaceId, 'webhook:manage');
  const rows = await deps.db
    .select()
    .from(webhooks)
    .where(eq(webhooks.workspaceId, workspaceId))
    .orderBy(desc(webhooks.createdAt));
  return rows.map(toDTO);
}

export async function createWebhook(
  deps: Deps,
  userId: string,
  workspaceId: string,
  input: CreateWebhookInput,
): Promise<CreatedWebhook> {
  await assertWorkspacePermission(deps.db, userId, workspaceId, 'webhook:manage');
  const secret = `whsec_${randomBytes(24).toString('base64url')}`;
  const [row] = await deps.db
    .insert(webhooks)
    .values({
      id: newId(),
      workspaceId,
      url: input.url,
      secret,
      events: input.events ?? [],
      createdBy: userId,
    })
    .returning();
  return { ...toDTO(row!), secret };
}

export async function updateWebhook(
  deps: Deps,
  userId: string,
  id: string,
  input: UpdateWebhookInput,
): Promise<Webhook> {
  const existing = await loadWebhook(deps.db, id);
  await assertWorkspacePermission(deps.db, userId, existing.workspaceId, 'webhook:manage');
  const [row] = await deps.db
    .update(webhooks)
    .set({
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.events !== undefined ? { events: input.events } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(webhooks.id, id))
    .returning();
  return toDTO(row!);
}

export async function deleteWebhook(deps: Deps, userId: string, id: string): Promise<void> {
  const existing = await loadWebhook(deps.db, id);
  await assertWorkspacePermission(deps.db, userId, existing.workspaceId, 'webhook:manage');
  await deps.db.delete(webhooks).where(eq(webhooks.id, id));
}

export async function listDeliveries(
  deps: Deps,
  userId: string,
  webhookId: string,
): Promise<WebhookDelivery[]> {
  const existing = await loadWebhook(deps.db, webhookId);
  await assertWorkspacePermission(deps.db, userId, existing.workspaceId, 'webhook:manage');
  const rows = await deps.db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(50);
  return rows.map((d) => ({
    id: d.id,
    verb: d.verb,
    status: d.status,
    responseCode: d.responseCode,
    attempts: d.attempts,
    createdAt: d.createdAt.toISOString(),
  }));
}

// --- Delivery ---------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BACKOFF_MS = [0, 2_000, 10_000]; // before attempts 1, 2, 3
const MAX_ATTEMPTS = 3;

async function attemptDelivery(
  deps: Deps,
  deliveryId: string,
  url: string,
  body: string,
  signature: string,
  verb: string,
  attempt: number,
): Promise<void> {
  if (BACKOFF_MS[attempt]) await sleep(BACKOFF_MS[attempt]!);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let code: number | null = null;
  let error: string | null = null;
  let ok = false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-librekanban-event': verb,
        'x-librekanban-signature': `sha256=${signature}`,
      },
      body,
    });
    code = res.status;
    ok = res.ok;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }
  const last = attempt + 1 >= MAX_ATTEMPTS;
  await deps.db
    .update(webhookDeliveries)
    .set({
      status: ok ? 'success' : last ? 'failed' : 'pending',
      attempts: attempt + 1,
      responseCode: code,
      error,
      lastAttemptAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, deliveryId));
  if (!ok && !last)
    await attemptDelivery(deps, deliveryId, url, body, signature, verb, attempt + 1);
}

/**
 * Fire-and-forget: POST an HMAC-signed payload to every active workspace webhook
 * subscribed to `verb`. Never throws to the caller; failures are logged + recorded.
 */
export function dispatchWebhooks(
  deps: Deps,
  workspaceId: string,
  verb: string,
  data: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const hooks = await deps.db
        .select()
        .from(webhooks)
        .where(and(eq(webhooks.workspaceId, workspaceId), eq(webhooks.isActive, true)));
      const matching = hooks.filter(
        (h) => h.events.length === 0 || h.events.includes('*') || h.events.includes(verb),
      );
      for (const h of matching) {
        const deliveryId = newId();
        const payload = {
          id: deliveryId,
          verb,
          workspaceId,
          data,
          timestamp: new Date().toISOString(),
        };
        const body = JSON.stringify(payload);
        const signature = createHmac('sha256', h.secret).update(body).digest('hex');
        await deps.db
          .insert(webhookDeliveries)
          .values({ id: deliveryId, webhookId: h.id, verb, payload, status: 'pending' });
        void attemptDelivery(deps, deliveryId, h.url, body, signature, verb, 0).catch((err) =>
          deps.logger.warn({ err }, 'webhook delivery error'),
        );
      }
    } catch (err) {
      deps.logger.warn({ err }, 'webhook dispatch failed');
    }
  })();
}
