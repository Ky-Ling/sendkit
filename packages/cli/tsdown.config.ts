import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.build.json',
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  platform: 'node',
  target: 'node22.12',
  outDir: 'dist',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  deps: {
    neverBundle: ['@mirid-dev/sendkit-core', 'commander', 'zod'],
  },
})
