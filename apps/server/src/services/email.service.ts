import nodemailer from 'nodemailer';
import type { Logger } from 'pino';
import type { Env } from '../env';

export interface Emailer {
  /** Whether SMTP is configured; callers skip work when false. */
  enabled: boolean;
  send(to: string, subject: string, html: string): Promise<void>;
}

/**
 * Build an emailer from SMTP_* env. When SMTP_HOST is unset (the common
 * self-host case) it's a no-op that just logs — the app works without email.
 */
export function createEmailer(env: Env, logger: Logger): Emailer {
  if (!env.SMTP_HOST) {
    return {
      enabled: false,
      async send(to, subject) {
        logger.debug({ to, subject }, 'email skipped (SMTP not configured)');
      },
    };
  }
  const port = env.SMTP_PORT ?? 587;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  const from = env.SMTP_FROM ?? 'librekanban <no-reply@localhost>';
  return {
    enabled: true,
    async send(to, subject, html) {
      await transport.sendMail({ from, to, subject, html });
    },
  };
}
