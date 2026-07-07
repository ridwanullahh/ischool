import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { libraryBooks, libraryLoans, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like, sql } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const allBooks = db.select().from(libraryBooks).where(eq(libraryBooks.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' },
      { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'category', label: 'Category' },
      { key: 'totalCopies', label: 'Total Copies' },
      { key: 'availableCopies', label: 'Available Copies' },
      { key: 'shelfLocation', label: 'Shelf Location' },
    ];
    return csvResponse(toCsv(allBooks, columns), 'library_books.csv');
  }

  const search = url.searchParams.get('search');
  if (search) {
    const results = db.select().from(libraryBooks).where(and(
      eq(libraryBooks.schoolId, schoolId),
      like(libraryBooks.title, `%${search}%`)
    )).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }
  const allBooks = db.select().from(libraryBooks).where(eq(libraryBooks.schoolId, schoolId)).all();
  const activeLoans = db.select().from(libraryLoans).where(eq(libraryLoans.schoolId, schoolId)).all();
  return new Response(JSON.stringify({ books: allBooks, loans: activeLoans }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 });
  const db = getDb();
  const result = db.insert(libraryBooks).values({
    schoolId,
    title: data.title,
    author: data.author || null,
    isbn: data.isbn || null,
    publisher: data.publisher || null,
    genre: data.genre || null,
    category: data.category || null,
    coverUrl: data.coverUrl || null,
    description: data.description || null,
    totalCopies: data.totalCopies || 1,
    availableCopies: data.availableCopies ?? data.totalCopies ?? 1,
    shelfLocation: data.shelfLocation || null,
    barcode: data.barcode || null,
    purchaseDate: data.purchaseDate || null,
    price: data.price || null,
  }).returning().get();
  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  const db = getDb();
  const existing = db.select().from(libraryBooks).where(and(eq(libraryBooks.id, data.id), eq(libraryBooks.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Book not found' }), { status: 404 });
  const { id, schoolId: _, ...updateData } = data;
  db.update(libraryBooks).set({ ...updateData, updatedAt: new Date() }).where(eq(libraryBooks.id, id)).run();
  const updated = db.select().from(libraryBooks).where(eq(libraryBooks.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  db.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
