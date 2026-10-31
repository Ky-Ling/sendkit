# @mirid-dev/sendkit-mcp-tools

Private workspace package with the [MCP](https://modelcontextprotocol.io) tool definitions shared by SendKit's local and remote MCP servers. It is not published to npm: tsdown bundles it into [`@mirid-dev/sendkit-local-mcp`](../local-mcp/README.md), and `apps/remote-mcp` runs it from source.

Versions up to `0.0.1` were published before this package became private. They are deprecated on npm and no longer updated.

## Usage

```ts
import { registerTelegramTool } from '@mirid-dev/sendkit-mcp-tools'

registerTelegramTool(server, () => process.env.TELEGRAM_BOT_TOKEN ?? '')
```

`registerTelegramTool(server, getBotToken)` registers a `telegram` tool that takes `chatId` and `message` and returns `messageId`, `chatId`, and `sentAt`. `getBotToken` is called on every tool call, so a missing token fails that call instead of server startup.

`package.json` exports `src/index.ts` directly, so the package has no build step.
