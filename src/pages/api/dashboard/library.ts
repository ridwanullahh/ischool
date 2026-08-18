import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { libraryBooks, libraryLoans, schoolMembers, users, students, staff } from '../../../lib/db/schema.js';
import { eq, and, like, sql } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'library.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const allBooks = db.select().from(libraryBooks).where(eq(libraryBooks.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'author', label: 'Author' },
      { key: 'isbn', label: 'ISBN' }, { key: 'publisher', label: 'Publisher' },
      { key: 'category', label: 'Category' }, { key: 'totalCopies', label: 'Total Copies' },
      { key: 'availableCopies', label: 'Available Copies' }, { key: 'shelfLocation', label: 'Shelf Location' },
    ];
    return csvResponse(toCsv(allBooks, columns), 'library_books.csv');
  }
  if (action === 'loans') {
    const loans = db.select({
      id: libraryLoans.id, bookId: libraryLoans.bookId, borrowerId: libraryLoans.borrowerId,
      issueDate: libraryLoans.issueDate, dueDate: libraryLoans.dueDate, returnDate: libraryLoans.returnDate,
      renewals: libraryLoans.renewals, fine: libraryLoans.fine, finePaid: libraryLoans.finePaid,
      status: libraryLoans.status, createdAt: libraryLoans.createdAt,
      bookTitle: libraryBooks.title, bookAuthor: libraryBooks.author, bookIsbn: libraryBooks.isbn,
      borrowerName: users.name, borrowerEmail: users.email,
    }).from(libraryLoans)
      .leftJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id))
      .leftJoin(users, eq(libraryLoans.borrowerId, users.id))
      .where(eq(libraryLoans.schoolId, schoolId)).all();
    return new Response(JSON.stringify(loans), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'members') {
    // All users in the school are library members
    const members = db.select({
      id: users.id, name: users.name, email: users.email, role: users.role,
    }).from(users)
      .innerJoin(schoolMembers, eq(users.id, schoolMembers.userId))
      .where(eq(schoolMembers.schoolId, schoolId)).all();
    // Count active loans per member
    const loans = db.select().from(libraryLoans).where(eq(libraryLoans.schoolId, schoolId)).all();
    const loanCounts = new Map<number, { active: number; total: number; fines: number }>();
    for (const l of loans) {
      if (!loanCounts.has(l.borrowerId)) loanCounts.set(l.borrowerId, { active: 0, total: 0, fines: 0 });
      const c = loanCounts.get(l.borrowerId)!;
      c.total++;
      if (l.status === 'active' || l.status === 'overdue') c.active++;
      if (l.fine && !l.finePaid) c.fines += l.fine;
    }
    const enriched = members.map(m => ({ ...m, ...(loanCounts.get(m.id) || { active: 0, total: 0, fines: 0 }) }));
    return new Response(JSON.stringify(enriched), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'fines') {
    const loans = db.select({
      id: libraryLoans.id, bookId: libraryLoans.bookId, borrowerId: libraryLoans.borrowerId,
      issueDate: libraryLoans.issueDate, dueDate: libraryLoans.dueDate, returnDate: libraryLoans.returnDate,
      fine: libraryLoans.fine, finePaid: libraryLoans.finePaid, status: libraryLoans.status,
      bookTitle: libraryBooks.title, borrowerName: users.name, borrowerEmail: users.email,
    }).from(libraryLoans)
      .leftJoin(libraryBooks, eq(libraryLoans.bookId, libraryBooks.id))
      .leftJoin(users, eq(libraryLoans.borrowerId, users.id))
      .where(and(eq(libraryLoans.schoolId, schoolId), sql`${libraryLoans.fine} > 0`)).all();
    return new Response(JSON.stringify(loans), { headers: { 'Content-Type': 'application/json' } });
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
  const denied = guardPermission(user, 'library.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  const db = getDb();

  // Issue a book (transactional — Phase 2.2)
  if (data.action === 'issue') {
    if (!data.bookId || !data.borrowerId || !data.dueDate) {
      return new Response(JSON.stringify({ error: 'bookId, borrowerId, dueDate required' }), { status: 400 });
    }
    const result = db.transaction(() => {
      const book = db.select().from(libraryBooks).where(and(eq(libraryBooks.id, data.bookId), eq(libraryBooks.schoolId, schoolId))).get();
      if (!book) throw new Error('Book not found');
      if ((book.availableCopies || 0) <= 0) throw new Error('No copies available');
      const loan = db.insert(libraryLoans).values({
        schoolId, bookId: data.bookId, borrowerId: data.borrowerId, issuedBy: user.id,
        issueDate: new Date().toISOString().split('T')[0], dueDate: data.dueDate,
        renewals: 0, fine: 0, finePaid: false, status: 'active', createdAt: new Date(),
      }).returning().get();
      db.update(libraryBooks).set({ availableCopies: (book.availableCopies || 0) - 1, updatedAt: new Date() }).where(eq(libraryBooks.id, data.bookId)).run();
      return loan;
    });
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  // Return a book (transactional — Phase 2.2)
  if (data.action === 'return') {
    if (!data.loanId) return new Response(JSON.stringify({ error: 'loanId required' }), { status: 400 });
    const fine = db.transaction(() => {
      const loan = db.select().from(libraryLoans).where(and(eq(libraryLoans.id, data.loanId), eq(libraryLoans.schoolId, schoolId))).get();
      if (!loan) throw new Error('Loan not found');
      const today = new Date().toISOString().split('T')[0];
      let computedFine = 0;
      if (new Date(loan.dueDate) < new Date(today) && loan.status !== 'returned') {
        const days = Math.floor((Date.now() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        computedFine = days * 50;
      }
      db.update(libraryLoans).set({
        returnDate: today, status: 'returned', fine: computedFine, updatedAt: new Date(),
      }).where(eq(libraryLoans.id, data.loanId)).run();
      const book = db.select().from(libraryBooks).where(eq(libraryBooks.id, loan.bookId)).get();
      if (book) {
        db.update(libraryBooks).set({ availableCopies: (book.availableCopies || 0) + 1, updatedAt: new Date() }).where(eq(libraryBooks.id, book.id)).run();
      }
      return computedFine;
    });
    return new Response(JSON.stringify({ success: true, fine }), { headers: { 'Content-Type': 'application/json' } });
  }
  // Renew a book (extend due date by 14 days)
  if (data.action === 'renew') {
    if (!data.loanId) return new Response(JSON.stringify({ error: 'loanId required' }), { status: 400 });
    const loan = db.select().from(libraryLoans).where(and(eq(libraryLoans.id, data.loanId), eq(libraryLoans.schoolId, schoolId))).get();
    if (!loan) return new Response(JSON.stringify({ error: 'Loan not found' }), { status: 404 });
    if (loan.status === 'returned') return new Response(JSON.stringify({ error: 'Cannot renew a returned book' }), { status: 400 });
    const newDue = new Date(loan.dueDate);
    newDue.setDate(newDue.getDate() + 14);
    db.update(libraryLoans).set({
      dueDate: newDue.toISOString().split('T')[0],
      renewals: (loan.renewals || 0) + 1, updatedAt: new Date(),
    }).where(eq(libraryLoans.id, data.loanId)).run();
    return new Response(JSON.stringify({ success: true, newDueDate: newDue.toISOString().split('T')[0] }), { headers: { 'Content-Type': 'application/json' } });
  }
  // Pay fine
  if (data.action === 'pay_fine') {
    if (!data.loanId) return new Response(JSON.stringify({ error: 'loanId required' }), { status: 400 });
    db.update(libraryLoans).set({ finePaid: true, updatedAt: new Date() }).where(and(eq(libraryLoans.id, data.loanId), eq(libraryLoans.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  // Waive fine
  if (data.action === 'waive_fine') {
    if (!data.loanId) return new Response(JSON.stringify({ error: 'loanId required' }), { status: 400 });
    db.update(libraryLoans).set({ fine: 0, finePaid: true, updatedAt: new Date() }).where(and(eq(libraryLoans.id, data.loanId), eq(libraryLoans.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 });
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
  const denied = guardPermission(user, 'library.edit');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
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
  const denied = guardPermission(user, 'library.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  db.delete(libraryBooks).where(and(eq(libraryBooks.id, id), eq(libraryBooks.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
