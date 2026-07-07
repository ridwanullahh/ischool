/**
 * Discussion Boards API
 *
 * POST - create a board OR post a message/reply
 * DELETE - delete a board or post
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { discussionBoards, discussionPosts } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();

  // Creating a new board
  if (body.title && body.schoolId) {
    const denied = guardPermission(user, 'courses.create');
    if (denied) return denied;

    if (body.schoolId !== (user as any).schoolId) {
      return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const db = getDb();
    const result = db.insert(discussionBoards).values({
      schoolId: body.schoolId,
      courseId: body.courseId || null,
      title: body.title,
      description: body.description || null,
      createdBy: user.id,
      createdAt: new Date(),
    }).returning().get();

    return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // Posting a message or reply
  if (body.boardId && body.content) {
    const denied = guardPermission(user, 'messages.send');
    if (denied) return denied;

    const db = getDb();
    const board = db.select().from(discussionBoards).where(eq(discussionBoards.id, body.boardId)).get();
    if (!board) {
      return new Response(JSON.stringify({ error: 'Board not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (board.locked && !pageGuardCheck(user, 'courses.create')) {
      return new Response(JSON.stringify({ error: 'Board is locked' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const result = db.insert(discussionPosts).values({
      boardId: body.boardId,
      parentId: body.parentId || null,
      authorId: user.id,
      content: body.content,
      createdAt: new Date(),
    }).returning().get();

    return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const db = getDb();

  if (body.boardId) {
    const denied = guardPermission(user, 'courses.create');
    if (denied) return denied;
    db.delete(discussionBoards).where(eq(discussionBoards.id, body.boardId)).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (body.postId) {
    const post = db.select().from(discussionPosts).where(eq(discussionPosts.id, body.postId)).get();
    if (!post) return new Response(JSON.stringify({ error: 'Post not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    // Author or admin can delete
    if (post.authorId !== user.id && !pageGuardCheck(user, 'courses.create')) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    db.delete(discussionPosts).where(eq(discussionPosts.id, body.postId)).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};

function pageGuardCheck(user: any, permission: string): boolean {
  const perms = (user as any).permissions;
  return perms ? perms.has(permission) : false;
}
