/**
 * API Helper — Production-grade wrapper for all dashboard API handlers.
 *
 * Provides:
 * - Automatic try/catch error handling (Phase 2.1)
 * - Standardized error responses (Phase 2.1)
 * - RBAC permission enforcement (Phase 1.1)
 * - Audit logging for write operations (Phase 5.4)
 * - Structured logging (Phase 5.1)
 * - Request context correlation
 *
 * Usage:
 *   import { apiHandler, requirePerm } from '../../../lib/api-helper.js';
 *
 *   export const GET = apiHandler(
 *     requirePerm('students.view'),
 *     async ({ user, schoolId, url }) => {
 *       const db = getDb();
 *       const students = db.select().from(studentsTable).where(eq(studentsTable.schoolId, schoolId)).all();
 *       return students; // automatically wrapped in JSON response
 *     }
 *   );
 *
 *   export const POST = apiHandler(
 *     requirePerm('students.create'),
 *     async ({ user, schoolId, body, audit }) => {
 *       const db = getDb();
 *       const result = db.insert(studentsTable).values({ ...body, schoolId }).returning().get();
 *       await audit('create', 'student', result.id, `Created student ${result.firstName} ${result.lastName}`);
 *       return { success: true, id: result.id };
 *     }
 *   );
 */

import { getDb } from './db/index.js';
import { auditLogs, schoolMembers } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from './rbac.js';
import { log } from './logger.js';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface ApiContext {
  user: any;
  schoolId: number | null;
  url: URL;
  request: Request;
  body: any;
  audit: (action: string, entityType: string, entityId: number | null, description?: string) => void;
}

export type ApiHandler = (ctx: ApiContext) => Promise<any> | any;
export type PermissionGuard = (user: any) => Response | null;

// ═══════════════════════════════════════════════════════
// Error Classes
// ═══════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errors = {
  badRequest: (msg: string, details?: any) => new ApiError(400, msg, 'BAD_REQUEST', details),
  unauthorized: (msg = 'Authentication required') => new ApiError(401, msg, 'UNAUTHORIZED'),
  forbidden: (msg = 'Permission denied') => new ApiError(403, msg, 'FORBIDDEN'),
  notFound: (msg = 'Resource not found') => new ApiError(404, msg, 'NOT_FOUND'),
  conflict: (msg: string) => new ApiError(409, msg, 'CONFLICT'),
  tooMany: (msg = 'Too many requests') => new ApiError(429, msg, 'RATE_LIMITED'),
  internal: (msg = 'Internal server error') => new ApiError(500, msg, 'INTERNAL_ERROR'),
};

// ═══════════════════════════════════════════════════════
// Permission Guard Helper
// ═══════════════════════════════════════════════════════

export function requirePerm(permission: string): PermissionGuard {
  return (user: any) => guardPermission(user, permission as any);
}

// ═══════════════════════════════════════════════════════
// School ID Helper
// ═══════════════════════════════════════════════════════

export function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

// ═══════════════════════════════════════════════════════
// Audit Logger
// ═══════════════════════════════════════════════════════

export function createAuditLogger(schoolId: number, userId: number) {
  return (action: string, entityType: string, entityId: number | null, description?: string) => {
    try {
      const db = getDb();
      db.insert(auditLogs).values({
        schoolId,
        userId,
        action,
        entityType,
        entityId: entityId || null,
        details: description || null,
        ipAddress: null, // Could be populated from request if needed
        createdAt: new Date(),
      }).run();
    } catch (e) {
      log.error('Failed to write audit log', { error: e, action, entityType, entityId });
    }
  };
}

// ═══════════════════════════════════════════════════════
// API Handler Wrapper
// ═══════════════════════════════════════════════════════

export function apiHandler(
  guard: PermissionGuard | null,
  handler: ApiHandler,
): (ctx: any) => Promise<Response> {
  return async ({ request, locals, url }: any) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const user = (locals as any).user;

    try {
      // Authentication check
      if (!user) {
        throw errors.unauthorized();
      }

      // School ID resolution
      const schoolId = getUserSchoolId(user.id);
      if (!schoolId) {
        throw errors.forbidden('No school association found');
      }

      // Permission check
      if (guard) {
        const denied = guard(user);
        if (denied) return denied;
      }

      // Parse body for POST/PUT/DELETE
      let body: any = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const text = await request.text();
          body = text ? JSON.parse(text) : {};
        } catch {
          throw errors.badRequest('Invalid JSON body');
        }
      }

      // Create audit logger
      const audit = createAuditLogger(schoolId, user.id);

      // Execute handler
      const result = await handler({
        user,
        schoolId,
        url,
        request,
        body,
        audit,
      });

      // Log successful request
      log.info('API request', {
        requestId,
        method: request.method,
        path: url.pathname,
        userId: user.id,
        schoolId,
        duration: Date.now() - startTime,
        status: 200,
      });

      // Return response
      if (result instanceof Response) return result;
      if (result === undefined) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      // Log error
      log.error('API error', {
        requestId,
        method: request.method,
        path: url.pathname,
        userId: user?.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
      });

      // Determine response
      if (error instanceof ApiError) {
        return new Response(JSON.stringify({
          error: {
            code: error.code || 'ERROR',
            message: error.message,
            details: error.details,
          },
        }), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Generic 500 — never expose stack traces in production
      return new Response(JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId, // For support correlation
        },
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}

// ═══════════════════════════════════════════════════════
// Simple Handler (no permission check — for read-only or custom auth)
// ═══════════════════════════════════════════════════════

export function simpleApiHandler(handler: ApiHandler): (ctx: any) => Promise<Response> {
  return apiHandler(null, handler);
}
