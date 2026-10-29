import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'

import { registerTelegramTool } from 'sendkit-mcp-tools'

const server = new McpServer({
  name: 'sendkit-local-mcp',
  version: '0.0.0',
})

function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN is required. Configure it in your MCP client environment.')
  }

  return token
}

registerTelegramTool(server, getTelegramBotToken)

const transport = new StdioServerTransport()

await server.connect(transport)
