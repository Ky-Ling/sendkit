import { Hono } from 'hono'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'

import { registerTelegramTool } from 'sendkit-mcp-tools'

function createServer(botToken: string) {
  const server = new McpServer({
    name: 'sendkit-remote-mcp',
    version: '0.0.0',
  })

  registerTelegramTool(server, () => botToken)

  return server
}

// authInfo is the only per-request input the factory receives, so the bot token from
// the URL rides in as its token; clientId and scopes are unused placeholders the type requires.
// sendTelegramMessage validates the token, so no check is needed here
const handler = createMcpHandler(({ authInfo }) => createServer(authInfo?.token ?? ''))

const app = new Hono()

app.all('/:botToken/mcp', (c) => {
  const botToken = c.req.param('botToken')

  return handler.fetch(c.req.raw, {
    authInfo: { token: botToken, clientId: 'telegram-bot', scopes: [] },
  })
})

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

process.on('SIGINT', async () => {
  await handler.close()
  process.exit(0)
})

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
