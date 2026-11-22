// Bundles the server into a single ESM file for production.
//
// Third-party dependencies stay external (installed with `npm ci --omit=dev` in the image),
// while workspace packages (@vigortally/*) are bundled in, because they ship TypeScript
// source that Node can't run directly.
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => !name.startsWith('@vigortally/'),
);

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external,
  logLevel: 'info',
});
