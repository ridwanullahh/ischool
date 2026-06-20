import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { galleryItems, galleryAlbums, virtualTours } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { isCloudinaryConfigured, uploadToCloudinary } from '../../../lib/cloudinary.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const db = getDb();
  const resource = form.get('resource')?.toString() || 'item';
  const id = form.get('id') ? Number(form.get('id')) : null;
  const action = form.get('action')?.toString();

  if (resource === 'album') {
    if (action === 'delete' && id) {
      db.delete(galleryAlbums).where(and(eq(galleryAlbums.id, id), eq(galleryAlbums.schoolId, schoolId))).run();
    } else if (id) {
      db.update(galleryAlbums).set({
        name: form.get('name')?.toString() || '',
        slug: form.get('slug')?.toString() || '',
        description: form.get('description')?.toString() || null,
        type: (form.get('type')?.toString() || 'custom') as any,
        coverImageUrl: form.get('coverImageUrl')?.toString() || null,
        isPublished: form.get('isPublished') === '1',
        sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
        updatedAt: new Date(),
      }).where(and(eq(galleryAlbums.id, id), eq(galleryAlbums.schoolId, schoolId))).run();
    } else {
      db.insert(galleryAlbums).values({
        schoolId,
        name: form.get('name')?.toString() || '',
        slug: form.get('slug')?.toString() || '',
        description: form.get('description')?.toString() || null,
        type: (form.get('type')?.toString() || 'custom') as any,
        coverImageUrl: form.get('coverImageUrl')?.toString() || null,
        isPublished: form.get('isPublished') === '1',
        sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      }).run();
    }
    return new Response(null, { status: 302, headers: { Location: '/dashboard/gallery?tab=albums&success=1' } });
  }

  if (resource === 'tour') {
    if (action === 'delete' && id) {
      db.delete(virtualTours).where(and(eq(virtualTours.id, id), eq(virtualTours.schoolId, schoolId))).run();
    } else if (id) {
      db.update(virtualTours).set({
        title: form.get('title')?.toString() || '',
        description: form.get('description')?.toString() || null,
        embedUrl: form.get('embedUrl')?.toString() || '',
        thumbnailUrl: form.get('thumbnailUrl')?.toString() || null,
        location: form.get('location')?.toString() || null,
        isPublished: form.get('isPublished') === '1',
        sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
        updatedAt: new Date(),
      }).where(and(eq(virtualTours.id, id), eq(virtualTours.schoolId, schoolId))).run();
    } else {
      db.insert(virtualTours).values({
        schoolId,
        title: form.get('title')?.toString() || '',
        description: form.get('description')?.toString() || null,
        embedUrl: form.get('embedUrl')?.toString() || '',
        thumbnailUrl: form.get('thumbnailUrl')?.toString() || null,
        location: form.get('location')?.toString() || null,
        isPublished: form.get('isPublished') === '1',
        sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      }).run();
    }
    return new Response(null, { status: 302, headers: { Location: '/dashboard/gallery?tab=tours&success=1' } });
  }

  let imageUrl = form.get('imageUrl')?.toString() || '';
  const file = form.get('file') as File | null;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (isCloudinaryConfigured()) {
      try {
        const uploaded = await uploadToCloudinary(buffer, `gallery/${schoolId}`, ['gallery']);
        imageUrl = uploaded.secure_url;
      } catch {
        imageUrl = await saveLocally(buffer, file.name, schoolId);
      }
    } else {
      imageUrl = await saveLocally(buffer, file.name, schoolId);
    }
  }

  if (action === 'delete' && id) {
    db.delete(galleryItems).where(and(eq(galleryItems.id, id), eq(galleryItems.schoolId, schoolId))).run();
  } else if (id) {
    const updates: Record<string, any> = {
      title: form.get('title')?.toString() || null,
      caption: form.get('caption')?.toString() || null,
      category: form.get('category')?.toString() || 'General',
      albumId: form.get('albumId') ? Number(form.get('albumId')) : null,
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      updatedAt: new Date(),
    };
    if (imageUrl) updates.imageUrl = imageUrl;
    db.update(galleryItems).set(updates).where(and(eq(galleryItems.id, id), eq(galleryItems.schoolId, schoolId))).run();
  } else {
    db.insert(galleryItems).values({
      schoolId,
      title: form.get('title')?.toString() || null,
      imageUrl,
      caption: form.get('caption')?.toString() || null,
      category: form.get('category')?.toString() || 'General',
      albumId: form.get('albumId') ? Number(form.get('albumId')) : null,
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/gallery?tab=items&success=1' } });
};

async function saveLocally(buffer: Buffer, originalName: string, schoolId: number): Promise<string> {
  const ext = originalName.split('.').pop() || 'jpg';
  const fileName = `${randomUUID()}.${ext}`;
  const dir = join(process.cwd(), 'public', 'uploads', 'gallery', String(schoolId));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), buffer);
  return `/uploads/gallery/${schoolId}/${fileName}`;
}
