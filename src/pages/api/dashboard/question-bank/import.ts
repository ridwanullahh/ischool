/**
 * Question Bank CSV Import API
 *
 * POST - bulk import questions from CSV text
 * CSV format: type,question,options (pipe-separated),correctAnswer,difficulty,points,tags (comma-separated)
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { questions } from '../../../../lib/db/schema.js';
import { guardPermission } from '../../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'cbt.question_bank.manage');
  if (denied) return denied;

  const schoolId = (user as any).schoolId;
  if (!schoolId) {
    return new Response(JSON.stringify({ error: 'No school context' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const csvText = await request.text();
  const lines = csvText.split('\n').filter(l => l.trim());

  if (lines.length === 0) {
    return new Response(JSON.stringify({ error: 'Empty CSV' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += ch;
    }
    result.push(current);
    return result.map(s => s.trim());
  }

  const db = getDb();
  let imported = 0;
  let skipped = 0;

  const firstLine = parseCSVLine(lines[0]);
  if (firstLine[0]?.toLowerCase() === 'type' || firstLine[0]?.toLowerCase() === 'question') {
    lines.shift();
  }

  for (const line of lines) {
    try {
      const fields = parseCSVLine(line);
      if (fields.length < 2) { skipped++; continue; }

      const type = fields[0] || 'multiple_choice';
      const question = fields[1];
      const optionsStr = fields[2] || '';
      const options = optionsStr ? optionsStr.split('|').map(s => s.trim()).filter(Boolean) : null;
      const correctAnswer = fields[3] || null;
      const difficulty = fields[4] || 'medium';
      const points = parseInt(fields[5]) || 1;
      const tagsStr = fields[6] || '';
      const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

      if (!question) { skipped++; continue; }

      db.insert(questions).values({
        schoolId,
        type,
        question,
        options: options ? JSON.stringify(options) : null,
        correctAnswer,
        difficulty,
        points,
        tags: JSON.stringify(tags),
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
      imported++;
    } catch {
      skipped++;
    }
  }

  return new Response(JSON.stringify({ ok: true, imported, skipped }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
