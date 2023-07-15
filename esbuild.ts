#!/usr/bin/env -S node -r esbuild-register
import fs from 'fs';
import { build, transform } from 'esbuild';

async function main() {
  const mjs = 'dist/index.mjs';

  await build({
    entryPoints: ['lib/ical/index.ts'],
    bundle: true,
    outfile: mjs,
    format: 'esm',
    target: 'esnext',
    platform: 'neutral',
    packages: 'external',
    banner: {
      js: '/* eslint-disable */'
    }
  });

  const cjs = 'dist/index.js';
  const { code } = await transform(fs.readFileSync(mjs, 'utf8'), {
    loader: 'js',
    format: 'cjs',
    target: 'esnext'
  });

  fs.writeFileSync(cjs, '/* eslint-disable */\n' + code);
}

main().catch(() => {
  process.exit(1);
});
