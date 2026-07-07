import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db/index.js';
import { schools, users, students, staff } from '../../lib/db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  try {
    const db = getDb();
    const schoolCount = db.select({ c: sql<number>`count(*)` }).from(schools).get()?.c || 0;
    const userCount = db.select({ c: sql<number>`count(*)` }).from(users).get()?.c || 0;

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'connected',
        schools: schoolCount,
        users: userCount,
      },
      version: '1.0.0',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: e.message,
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
