import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { mediaUploads, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), { status: 413 });

  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  if (!allowedMimes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'File type not allowed' }), { status: 415 });
  }

  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${randomUUID()}.${ext}`;
  const uploadDir = join(process.cwd(), 'public', 'uploads', String(schoolId));

  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(uploadDir, fileName);
  writeFileSync(filePath, buffer);

  const url = `/uploads/${schoolId}/${fileName}`;

  let type: 'image' | 'video' | 'document' | 'audio' = 'document';
  if (file.type.startsWith('image/')) type = 'image';
  else if (file.type.startsWith('video/')) type = 'video';
  else if (file.type.startsWith('audio/')) type = 'audio';

  const db = getDb();
  const record = db.insert(mediaUploads).values({
    schoolId, uploadedBy: user.id, fileName, originalName: file.name,
    url, type, mimeType: file.type, size: file.size,
  }).returning().get();

  return new Response(JSON.stringify({
    id: record.id, url, fileName: file.name, type, size: file.size,
  }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
