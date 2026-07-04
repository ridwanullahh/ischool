/**
 * Error Notification System
 *
 * Provides centralized error logging and notification.
 * Currently logs to console + file; can be extended to send
 * email/webhook notifications.
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const LOG_DIR = resolve(process.cwd(), 'logs');
const ERROR_LOG = resolve(LOG_DIR, 'errors.log');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}
}

export interface ErrorInfo {
  timestamp: string;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  userId?: number;
  schoolId?: number;
  ip?: string;
}

/**
 * Logs an error to file and console.
 * In production, this should be extended to send notifications
 * via email or webhook.
 */
export function logError(error: ErrorInfo | Error, context?: Record<string, any>) {
  const info: ErrorInfo = error instanceof Error
    ? {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        ...context,
      }
    : { timestamp: new Date().toISOString(), ...error };

  // Console log
  console.error('[ERROR]', info.timestamp, info.message, info.url || '');

  // File log
  const logLine = JSON.stringify(info) + '\n';
  try {
    appendFileSync(ERROR_LOG, logLine);
  } catch {}

  // TODO: Send email notification if configured
  // This can be extended to call the email system with error details
  // For now, errors are logged to logs/errors.log
}

/**
 * Wraps an async handler with error catching.
 * Returns a 500 JSON response on error instead of crashing.
 */
export function withErrorHandler<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      const ctx = args[0]?.url ? {
        url: args[0].url.pathname,
        method: args[0].request?.method,
      } : {};
      logError(error as Error, ctx);
      return new Response(
        JSON.stringify({ error: 'An internal error occurred. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }) as T;
}
