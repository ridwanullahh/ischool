import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { runBackup, restoreBackup, listBackups } from '../../../lib/backup.js';

export const GET: APIRoute = async ({ request, url }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user || result.user.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const action = url.searchParams.get('action');
  if (action === 'list') {
    const backups = listBackups();
    return new Response(JSON.stringify(backups), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    providers: ['local', 'google_drive', 'dropbox', 'backblaze_b2', 's3', 'mega'],
    activeProvider: import.meta.env.BACKUP_PROVIDER || 'local',
    retentionCount: parseInt(import.meta.env.BACKUP_RETENTION_COUNT || '3'),
    schedule: import.meta.env.BACKUP_SCHEDULE || '0 2,14 * * *',
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user || result.user.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const data = await request.json();
  const action = data.action || 'backup';

  if (action === 'backup') {
    const backupResult = await runBackup();
    return new Response(JSON.stringify(backupResult), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'restore') {
    if (!data.backupPath) return new Response(JSON.stringify({ error: 'backupPath required' }), { status: 400 });
    const restoreResult = await restoreBackup(data.backupPath);
    return new Response(JSON.stringify(restoreResult), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};
