import { definePackageBuild } from '../../tsdown.base.ts'

export default definePackageBuild({
  dts: true,
  target: 'node20',
  neverBundle: ['zod'],
})
