import { Hono, type Context } from 'hono'

import { generateClerkProtectedResourceMetadata } from '@clerk/mcp-tools/server'

import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { registerTelegramTool } from '@mirid-dev/sendkit-mcp-tools'

import { version } from '../package.json' with { type: 'json' }

// Resolves true only for an OAuth access token issued for `audience`, the MCP endpoint's public URL
export type Authenticate = (request: Request, audience: string) => Promise<boolean>

export type AppOptions = {
  authenticate: Authenticate
  // Clerk publishable key, which locates the authorization server for the protected resource metadata
  publishableKey: string
}

function createServer(botToken: string) {
  const server = new McpServer({
    name: 'sendkit-remote-mcp',
    version,
  })

  registerTelegramTool(server, () => botToken)

  return server
}

// Must stay within Clerk's "Allowed scopes for dynamic clients"; without it clients
// request every scope Clerk advertises and the authorize step fails with invalid_scope
const oauthScopes = ['profile', 'email']

function protectedResourceMetadataUrl(c: Context, botToken: string) {
  return new URL(`/.well-known/oauth-protected-resource/${botToken}/mcp`, c.req.url).toString()
}

function unauthorizedMcpResponse(c: Context, botToken: string) {
  c.header(
    'WWW-Authenticate',
    `Bearer resource_metadata="${protectedResourceMetadataUrl(c, botToken)}", scope="${oauthScopes.join(' ')}"`,
  )
  return c.json({ error: 'Unauthorized' }, 401)
}

// The MCP endpoint's public URL: the PRM `resource` and the `aud` Clerk stamps into tokens
function mcpResourceUrl(c: Context) {
  return new URL(`/${c.req.param('botToken')}/mcp`, c.req.url).toString()
}

export function createApp({ authenticate, publishableKey }: AppOptions) {
  // authInfo is the only per-request input the factory receives, so the bot token from
  // the URL rides in as its token; clientId and scopes are unused placeholders the type requires.
  // sendTelegramMessage validates the token, so no check is needed here
  const handler = createMcpHandler(({ authInfo }) => createServer(authInfo?.token ?? ''))

  const app = new Hono()

  app.get('/.well-known/oauth-protected-resource/:botToken/mcp', (c) => {
    return c.json(
      generateClerkProtectedResourceMetadata({
        publishableKey,
        resourceUrl: mcpResourceUrl(c),
        properties: { scopes_supported: oauthScopes },
      }),
    )
  })

  // All methods, so GET/DELETE get the 401 challenge and then the handler's 405 rather than a 404
  app.all('/:botToken/mcp', async (c) => {
    const botToken = c.req.param('botToken')
    const authHeader = c.req.header('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedMcpResponse(c, botToken)
    }

    // Binding the audience to this URL rejects tokens issued for any other resource,
    // including another bot token's URL. A failed check fails closed
    const isAuthenticated = await authenticate(c.req.raw, mcpResourceUrl(c)).catch(() => false)

    if (!isAuthenticated) {
      return unauthorizedMcpResponse(c, botToken)
    }

    return handler.fetch(c.req.raw, {
      authInfo: { token: botToken, clientId: 'telegram-bot', scopes: [] },
    })
  })

  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404)
  })

  return {
    fetch: (req: Request) => {
      // Behind a proxy or tunnel, rebuild the public URL so the audience and metadata URLs match what the client used
      const url = new URL(req.url)
      url.protocol = req.headers.get('x-forwarded-proto') ?? url.protocol
      url.host = req.headers.get('x-forwarded-host') ?? url.host

      return app.fetch(new Request(url, req))
    },
    close: () => handler.close(),
  }
}
