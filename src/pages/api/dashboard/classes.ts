import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { classes, programs, faqs, galleryItems } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';

const tableMap = { classes, programs, faqs, gallery: galleryItems } as const;

function createCrudHandler(table: any, fieldMap: Record<string, (v: string | null) => any>, redirectPath: string) {
  return (async ({ request }: { request: Request }) => {
    const form = await request.formData();
    const sid = getSessionIdFromCookie(request);
    const result = sid ? await validateSession(sid) : null;
    if (!result?.user) return new Response('Unauthorized', { status: 401 });

    const schoolId = getUserSchoolId(result.user.id);
    if (!schoolId) return new Response('No school found', { status: 404 });

    const db = getDb();
    const id = form.get('id') ? Number(form.get('id')) : null;
    const action = form.get('action')?.toString();

    if (action === 'delete' && id) {
      db.delete(table).where(and(eq(table.id, id), eq(table.schoolId, schoolId))).run();
    } else if (id) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      for (const [key, transform] of Object.entries(fieldMap)) {
        updates[key] = transform(form.get(key)?.toString() ?? null);
      }
      db.update(table).set(updates).where(and(eq(table.id, id), eq(table.schoolId, schoolId))).run();
    } else {
      const values: Record<string, any> = { schoolId };
      for (const [key, transform] of Object.entries(fieldMap)) {
        values[key] = transform(form.get(key)?.toString() ?? null);
      }
      db.insert(table).values(values).run();
    }

    return new Response(null, { status: 302, headers: { Location: `${redirectPath}?success=1` } });
  }) as APIRoute;
}

const str = (v: string | null) => v || '';
const nullable = (v: string | null) => v || null;
const num = (v: string | null) => v ? Number(v) : 0;

export const POST: APIRoute = createCrudHandler(classes, {
  name: str,
  slug: str,
  description: nullable,
  content: nullable,
  gradeLevel: nullable,
  teacherName: nullable,
  capacity: (v) => v ? Number(v) : null,
  imageUrl: nullable,
  hasDetailPage: (v) => v === 'on' || v === 'true',
  sortOrder: num,
}, '/dashboard/classes');
