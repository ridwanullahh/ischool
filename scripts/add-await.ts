/**
 * Add `await` to all .all() and .get() DB calls in .astro frontmatter files.
 * This makes the codebase compatible with both SQLite (sync) and Lightbase (async).
 * `await` on a non-Promise value just returns the value, so it's safe for SQLite.
 */
import fs from 'fs';
import path from 'path';
import { glob } from 'fs';

function processFile(filepath: string): boolean {
  let content = fs.readFileSync(filepath, 'utf-8');
  let modified = false;

  // Pattern: const/var/let X = db.select()...all()
  // We need to add `await` before `db.select()` or `db.insert()` etc.
  // But only in the frontmatter (between --- markers)
  
  // Match: = db.select(...)...all() or = db.select(...)...get()
  // The key insight: we need to add `await` before the expression that ends with .all() or .get()
  
  // Simple approach: find lines with .all() or .get() that have `= ` before them
  // and add `await ` after the `= `
  
  const lines = content.split('\n');
  const newLines: string[] = [];
  let inFrontmatter = false;
  
  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      newLines.push(line);
      continue;
    }
    
    if (inFrontmatter && (line.includes('.all()') || line.includes('.get()'))) {
      // Check if it's a DB call (has db. or has = before)
      if (line.includes('db.') || line.includes('Db.')) {
        // Check if it already has await
        if (!line.includes('await ')) {
          // Add await after = sign
          let newLine = line.replace(/=\s*db\./, '= await db.');
          newLine = newLine.replace(/=\s*const db/, '= const db'); // Don't touch db creation
          if (newLine !== line) {
            modified = true;
            newLines.push(newLine);
            continue;
          }
          // Also handle multi-line: const X = db.select()
          // ...   .from(...)
          // ...   .all()
          // In this case, the await needs to go on the first line
        }
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    fs.writeFileSync(filepath, newLines.join('\n'));
    return true;
  }
  return false;
}

// Find all .astro files
import { execSync } from 'child_process';
const files = execSync('find src/pages -name "*.astro"', { encoding: 'utf-8' }).trim().split('\n');

let count = 0;
for (const file of files) {
  if (processFile(file)) {
    count++;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nModified: ${count} files`);
