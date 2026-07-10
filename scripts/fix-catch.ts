import fs from 'fs';
import path from 'path';
import { globSync } from 'fs';

const files = fs.readdirSync('src/pages/api/dashboard').filter(f => f.endsWith('.ts'));
let fixed = 0;

for (const file of files) {
  const filepath = path.join('src/pages/api/dashboard', file);
  let content = fs.readFileSync(filepath, 'utf-8');
  let modified = false;

  // Fix: .catch(() => {}) → .catch((e: any) => console.error("Async op failed:", e))
  if (content.includes('.catch(() => {})')) {
    content = content.split('.catch(() => {})').join('.catch((e: any) => console.error("Async op failed:", e))');
    modified = true;
  }

  // Fix: } catch {} → } catch (e: any) { console.error("Parse error:", e); }
  if (content.includes('} catch {}')) {
    content = content.split('} catch {}').join('} catch (e: any) { console.error("Parse error:", e); }');
    modified = true;
  }

  // Fix: } catch (e) {} → } catch (e: any) { console.error("Operation failed:", e); }
  if (content.includes('} catch (e) {}')) {
    content = content.split('} catch (e) {}').join('} catch (e: any) { console.error("Operation failed:", e); }');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filepath, content);
    fixed++;
    console.log(`  ✓ ${file}`);
  }
}

console.log(`\nFixed: ${fixed} files`);
