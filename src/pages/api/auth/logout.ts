import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, deleteSession, clearSessionCookie } from '../../../lib/auth.js';

export const POST: APIRoute = async ({ request }) => {
  const sessionId = getSessionIdFromCookie(request);
  if (sessionId) {
    await deleteSession(sessionId);
  }

  const headers = new Headers();
  clearSessionCookie(headers);
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
};

export const GET: APIRoute = async ({ request }) => {
  const sessionId = getSessionIdFromCookie(request);
  if (sessionId) {
    await deleteSession(sessionId);
  }

  const headers = new Headers();
  clearSessionCookie(headers);
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
};
