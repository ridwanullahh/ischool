/**
 * Structured Logger — Production-grade logging with JSON output.
 *
 * Provides:
 * - Structured JSON log output (Phase 5.1)
 * - Log levels: debug, info, warn, error, fatal
 * - Request context correlation (requestId)
 * - Environment-based level filtering
 * - Console output in development, JSON in production
 *
 * Usage:
 *   import { log } from './logger.js';
 *   log.info('User logged in', { userId: 123, email: '...' });
 *   log.error('Database error', { error: err, query: '...' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, message: string, context?: Record<string, any>): string {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(entry);
  }

  // Development: pretty-print
  const ctx = context ? ' ' + JSON.stringify(context) : '';
  return `[${entry.timestamp}] ${level.toUpperCase()}: ${message}${ctx}`;
}

function writeLog(level: LogLevel, message: string, context?: Record<string, any>) {
  if (!shouldLog(level)) return;
  const formatted = formatLog(level, message, context);

  if (level === 'error' || level === 'fatal') {
    process.stderr.write(formatted + '\n');
  } else {
    process.stdout.write(formatted + '\n');
  }
}

export const log = {
  debug: (message: string, context?: Record<string, any>) => writeLog('debug', message, context),
  info: (message: string, context?: Record<string, any>) => writeLog('info', message, context),
  warn: (message: string, context?: Record<string, any>) => writeLog('warn', message, context),
  error: (message: string, context?: Record<string, any>) => writeLog('error', message, context),
  fatal: (message: string, context?: Record<string, any>) => writeLog('fatal', message, context),
};

export { LogLevel };
