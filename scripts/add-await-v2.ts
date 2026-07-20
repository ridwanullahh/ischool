/**
 * Add `await` to ALL remaining db.select/insert/update/delete calls in .astro files.
 * Handles multi-line calls that the first script missed.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src/pages -name "*.astro"', { encoding: 'utf-8' }).trim().split('\n');
let count = 0;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  let modified = false;

  // Pattern: "= db.select" (not preceded by await)
  // Also: "= db.insert", "= db.update", "= db.delete"
  // Only in frontmatter (between --- markers)
  
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  // Parts[0] = before first ---, parts[1] = frontmatter, parts[2+] = rest
  let frontmatter = parts[1];
  const before = frontmatter;
  
  // Add await before db.select/db.insert/db.update/db.delete when assigned with =
  // But NOT inside .map() callbacks or other non-async functions
  // Strategy: only add await at the top level of variable assignments (const/var/let X = db...)
  
  // Match: const/var/let X = db.select or = db.select (already declared)
  frontmatter = frontmatter.replace(/(\bconst\s+\w+\s*=\s*)(db\.select)/g, (match, p1, p2) => {
    if (p1.includes('await')) return match;
    return p1 + 'await ' + p2;
  });
  frontmatter = frontmatter.replace(/(\bconst\s+\w+\s*=\s*)(db\.insert)/g, (match, p1, p2) => {
    if (p1.includes('await')) return match;
    return p1 + 'await ' + p2;
  });
  frontmatter = frontmatter.replace(/(\bconst\s+\w+\s*=\s*)(db\.update)/g, (match, p1, p2) => {
    if (p1.includes('await')) return match;
    return p1 + 'await ' + p2;
  });
  frontmatter = frontmatter.replace(/(\bconst\s+\w+\s*=\s*)(db\.delete)/g, (match, p1, p2) => {
    if (p1.includes('await')) return match;
    return p1 + 'await ' + p2;
  });
  
  // Also handle: "X = db.select" where X was declared earlier (let X; X = db.select...)
  frontmatter = frontmatter.replace(/^(\s*)(\w+)\s*=\s*(db\.select)/gm, (match, indent, varname, p3) => {
    if (match.includes('await')) return match;
    return indent + varname + ' = await ' + p3;
  });
  frontmatter = frontmatter.replace(/^(\s*)(\w+)\s*=\s*(db\.insert)/gm, (match, indent, varname, p3) => {
    if (match.includes('await')) return match;
    return indent + varname + ' = await ' + p3;
  });
  frontmatter = frontmatter.replace(/^(\s*)(\w+)\s*=\s*(db\.update)/gm, (match, indent, varname, p3) => {
    if (match.includes('await')) return match;
    return indent + varname + ' = await ' + p3;
  });
  frontmatter = frontmatter.replace(/^(\s*)(\w+)\s*=\s*(db\.delete)/gm, (match, indent, varname, p3) => {
    if (match.includes('await')) return match;
    return indent + varname + ' = await ' + p3;
  });
  
  if (frontmatter !== before) {
    parts[1] = frontmatter;
    content = parts.join('---');
    fs.writeFileSync(file, content);
    count++;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nModified: ${count} files`);
