import { defineConfig } from 'rollup';
import ts from 'rollup-plugin-ts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  input: 'lib/ical/index.ts',
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts']
    }),
    ts({
      transpileOnly: true
    })
  ],
  output: [
    {
      file: 'dist/ical.js',
      format: 'es'
    },
    {
      file: 'dist/ical.cjs',
      format: 'commonjs'
    }
  ]
});
