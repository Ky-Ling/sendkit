import { definePackageBuild } from '../../tsdown.base.ts'

export default definePackageBuild({
  dts: false,
  target: 'node22.12',
  neverBundle: ['@mirid-dev/sendkit-core', 'commander', 'zod'],
})
