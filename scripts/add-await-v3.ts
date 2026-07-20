/**
 * Fix v3: Add `await` to ternary-style DB calls (X ? db.select() : null)
 * Also fix any remaining inline calls.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src/pages -name "*.astro"', { encoding: 'utf-8' }).trim().split('\n');
let count = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Split into frontmatter and rest
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  let fm = parts[1];
  const before = fm;

  // Fix: "? db.select" → "? await db.select"
  fm = fm.replace(/\?\s*(db\.select)/g, '? await $1');
  fm = fm.replace(/\?\s*(db\.insert)/g, '? await $1');
  fm = fm.replace(/\?\s*(db\.update)/g, '? await $1');
  fm = fm.replace(/\?\s*(db\.delete)/g, '? await $1');

  // Fix: ": db.select" after ternary (for the else branch, rare but possible)
  // Skip this — ternary else branches typically use null or []

  // Fix: inline calls like "db.select(...).get()" not preceded by = or ?
  // These are rare but let's catch: "const X = Y ? db.select" was handled above
  // What about: "const X = db.select({...}).from(...).all()" with object arg?
  // Pattern: "= db.select({" — add await before db.select if not present
  fm = fm.replace(/(\w+\s*=\s*)(db\.select\(\{)/g, (match, p1, p2) => {
    if (p1.includes('await')) return match;
    return p1 + 'await ' + p2;
  });

  if (fm !== before) {
    parts[1] = fm;
    content = parts.join('---');
    fs.writeFileSync(file, content);
    count++;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nModified: ${count} files`);
