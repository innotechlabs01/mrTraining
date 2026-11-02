import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json',
  '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

function exists(p) {
  for (const e of exts) {
    try { if (fs.statSync(p + e).isFile()) return true; } catch {}
  }
  return false;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// tsconfig path aliases
const aliases = {
  '@/': 'src/',
  '@shared/': 'src/shared/',
  '@features/': 'src/features/',
  '@infrastructure/': 'src/infrastructure/',
};

const files = walk(ROOT);
let broken = 0;

for (const file of files) {
  const dir = path.dirname(file);
  const src = fs.readFileSync(file, 'utf8');
  const re = /(?:from\s+|require\(\s*)['"](\.[^'"]+|[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    if (!spec.startsWith('.') && !Object.keys(aliases).some(a => spec.startsWith(a))) continue;

    let target;
    if (spec.startsWith('.')) {
      target = path.resolve(dir, spec);
    } else {
      const key = Object.keys(aliases).find(a => spec.startsWith(a));
      target = path.resolve(path.resolve('.'), aliases[key] + spec.slice(key.length));
    }

    if (!exists(target)) {
      broken++;
      const line = src.slice(0, m.index).split('\n').length;
      console.log(`\n${path.relative(process.cwd(), file)}:${line}\n  unresolved -> "${spec}"`);
    }
  }
}

console.log(`\n=== ${broken} unresolved import(s) across ${files.length} files ===`);
