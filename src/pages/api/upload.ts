import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../lib/auth.js';
import { getUserSchoolId } from '../../lib/school.js';
import { getDb } from '../../lib/db/index.js';
import { mediaUploads } from '../../lib/db/schema.js';
import { isCloudinaryConfigured, uploadToCloudinary } from '../../lib/cloudinary.js';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const form = await request.formData();
  const file = form.get('file') as File;
  const folder = form.get('folder')?.toString() || 'general';
  const tagsRaw = form.get('tags')?.toString() || '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

  if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });

  // File size validation (Phase 1.4.6)
  const MAX_SIZES: Record<string, number> = {
    image: 10 * 1024 * 1024,      // 10MB
    video: 50 * 1024 * 1024,      // 50MB
    audio: 20 * 1024 * 1024,      // 20MB
    document: 5 * 1024 * 1024,    // 5MB
  };
  const ALLOWED_MIMES: Record<string, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv'],
  };
  const fileType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'document';
  const maxSize = MAX_SIZES[fileType] || 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return new Response(JSON.stringify({ error: `File too large. Maximum ${maxSize / (1024 * 1024)}MB for ${fileType} files.` }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  const allowed = ALLOWED_MIMES[fileType] || [];
  if (allowed.length > 0 && !allowed.includes(file.type)) {
    return new Response(JSON.stringify({ error: `File type ${file.type} not allowed for ${fileType} uploads.` }), { status: 415, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  if (isCloudinaryConfigured()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToCloudinary(buffer, folder, tags);
    const [record] = db.insert(mediaUploads).values({
      schoolId,
      uploadedBy: result.user.id,
      fileName: uploaded.publicId,
      originalName: file.name,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
      type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'document',
      mimeType: file.type,
      size: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      cloudinaryId: uploaded.publicId,
      folder,
      tags: JSON.stringify(tags),
    }).returning().all();
    return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } });
  }

  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
  const url = `/uploads/${schoolId}/${fileName}`;
  const [record] = db.insert(mediaUploads).values({
    schoolId,
    uploadedBy: result.user.id,
    fileName,
    originalName: file.name,
    url,
    type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'document',
    mimeType: file.type,
    size: file.size,
    folder,
    tags: JSON.stringify(tags),
  }).returning().all();
  return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } });
};
