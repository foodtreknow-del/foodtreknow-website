import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'www');
const entries = [
  'index.html',
  'manifest.webmanifest',
  'service-worker.js',
  'assets',
  'css',
  'js'
];

if (path.dirname(output) !== root || path.basename(output) !== 'www') {
  throw new Error('Refusing to build outside the FoodTrekNow www directory.');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of entries) {
  const source = path.join(root, entry);
  await stat(source);
  await cp(source, path.join(output, entry), { recursive: true });
}

console.log(`FoodTrekNow web assets built in ${output}`);
