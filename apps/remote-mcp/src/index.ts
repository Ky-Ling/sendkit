import { Hono, type Context } from 'hono'

import { createClerkClient } from "@clerk/backend"
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server"

import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { registerTelegramTool } from 'sendkit-mcp-tools'

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY
const clerkSecretKey = process.env.CLERK_SECRET_KEY

if (!clerkPublishableKey) {
  throw new Error("CLERK_PUBLISHABLE_KEY environment variable is required")
}

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY environment variable is required")
}

const clerkClient = createClerkClient({
  publishableKey: clerkPublishableKey,
  secretKey: clerkSecretKey,
})

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

// Must stay within Clerk's "Allowed scopes for dynamic clients"; without it clients
// request every scope Clerk advertises and the authorize step fails with invalid_scope
const oauthScopes = ['profile', 'email']

function protectedResourceMetadataUrl(c: Context, botToken: string) {
  return new URL(`/.well-known/oauth-protected-resource/${botToken}/mcp`, c.req.url).toString()
}

function unauthorizedMcpResponse(c: Context, botToken: string) {
  c.header(
    "WWW-Authenticate",
    `Bearer resource_metadata="${protectedResourceMetadataUrl(c, botToken)}", scope="${oauthScopes.join(' ')}"`,
  )
  return c.json({ error: "Unauthorized" }, 401)
}

// The MCP endpoint's public URL: the PRM `resource` and the `aud` Clerk stamps into tokens
function mcpResourceUrl(c: Context) {
  return new URL(`/${c.req.param('botToken')}/mcp`, c.req.url).toString()
}

app.get("/.well-known/oauth-protected-resource/:botToken/mcp", (c) => {
  return c.json(
    generateClerkProtectedResourceMetadata({
      publishableKey: clerkPublishableKey,
      resourceUrl: mcpResourceUrl(c),
      properties: { scopes_supported: oauthScopes },
    }),
  )
})

// All methods, so GET/DELETE get the 401 challenge and then the handler's 405 rather than a 404
app.all('/:botToken/mcp', async (c) => {
  const botToken = c.req.param('botToken')
  const authHeader = c.req.header("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return unauthorizedMcpResponse(c, botToken)
  }

  try {
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      acceptsToken: 'oauth_token',
      // Rejects tokens issued for any other resource, including another bot token's URL.
      // Requires "Include audience" in Clerk's OAuth settings, or every token lacks `aud`
      audience: mcpResourceUrl(c),
    })

    if (!requestState.isAuthenticated) {
      return unauthorizedMcpResponse(c, botToken)
    }
  } catch {
    return unauthorizedMcpResponse(c, botToken)
  }

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
  fetch: (req: Request) => {
    const url = new URL(req.url)
    url.protocol = req.headers.get("x-forwarded-proto") ?? url.protocol
    url.host = req.headers.get("x-forwarded-host") ?? url.host

    return app.fetch(new Request(url, req))
  },
}
