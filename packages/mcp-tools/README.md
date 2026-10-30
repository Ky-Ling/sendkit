# @mirid-dev/sendkit-mcp-tools

[MCP](https://modelcontextprotocol.io) tool definitions for SendKit, shared by its local and remote MCP servers.

Requires Node.js 20 or later. ESM only.

## Install

```sh
npm install @mirid-dev/sendkit-mcp-tools @modelcontextprotocol/server
```

## Usage

```ts
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { registerTelegramTool } from '@mirid-dev/sendkit-mcp-tools'

const server = new McpServer({ name: 'my-server', version: '1.0.0' })

registerTelegramTool(server, () => process.env.TELEGRAM_BOT_TOKEN ?? '')

await server.connect(new StdioServerTransport())
```

`registerTelegramTool(server, getBotToken)` registers a `telegram` tool that takes `chatId` and `message` and returns `messageId`, `chatId`, and `sentAt`. `getBotToken` is called on every tool call, so a missing token fails that call instead of server startup.

For a ready-to-run server, use [`@mirid-dev/sendkit-local-mcp`](https://www.npmjs.com/package/@mirid-dev/sendkit-local-mcp).

## License

MIT
