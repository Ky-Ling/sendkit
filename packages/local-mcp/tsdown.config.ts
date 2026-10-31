import { definePackageBuild } from '../../tsdown.base.ts'

export default definePackageBuild({
  dts: false,
  target: 'node20',
  // @mirid-dev/sendkit-mcp-tools is private, so it is bundled rather than listed here
  neverBundle: ['@mirid-dev/sendkit-core', '@modelcontextprotocol/server', 'zod'],
})
