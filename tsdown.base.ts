import { defineConfig } from 'tsdown'

type PackageBuildOptions = {
  // Emit .d.ts files; only library packages need them
  dts: boolean
  // Lowest Node.js version the package supports, matching its `engines.node`
  target: `node${string}`
  // Packages left as runtime imports; anything else, such as the private mcp-tools, is bundled into dist
  neverBundle: string[]
}

// Shared by every published package's tsdown.config.ts, so the build settings only differ where the packages do
export function definePackageBuild({ dts, target, neverBundle }: PackageBuildOptions) {
  return defineConfig({
    entry: ['src/index.ts'],
    tsconfig: 'tsconfig.build.json',
    format: ['esm'],
    dts,
    sourcemap: true,
    clean: true,
    platform: 'node',
    target,
    outDir: 'dist',
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
    deps: {
      neverBundle,
    },
  })
}
