import { defineConfig } from 'rollup';
import ts from 'rollup-plugin-ts';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  input: 'lib/ical/module.ts',
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
      format: 'es',
      exports: 'default'
    },
    {
      file: 'dist/ical.cjs',
      format: 'commonjs',
      exports: 'default'
    }
  ]
});
