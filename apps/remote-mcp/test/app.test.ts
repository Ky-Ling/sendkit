import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'

import { createApp, type Authenticate } from '../src/app'

const botToken = '123456789:AAH-test_token'
const publishableKey = `pk_test_${btoa('example.clerk.accounts.dev$')}`

function setup(authenticate: Authenticate = async () => true) {
  const authenticateSpy = mock(authenticate)
  const app = createApp({ authenticate: authenticateSpy, publishableKey })
  return { app, authenticate: authenticateSpy }
}

function mcpRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'telegram', arguments: { chatId: '1', message: 'Hello' } },
    }),
  })
}

afterEach(() => {
  mock.restore()
})

describe('remote MCP app', () => {
  test('challenges a request without a bearer token, without authenticating it', async () => {
    const { app, authenticate } = setup()

    const response = await app.fetch(mcpRequest(`/${botToken}/mcp`))

    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toBe(
      `Bearer resource_metadata="http://localhost/.well-known/oauth-protected-resource/${botToken}/mcp", scope="profile email"`,
    )
    expect(authenticate).not.toHaveBeenCalled()
  })

  test('rejects a token the authenticator does not accept', async () => {
    const { app } = setup(async () => false)

    const response = await app.fetch(
      mcpRequest(`/${botToken}/mcp`, { Authorization: 'Bearer bad' }),
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('WWW-Authenticate')).toStartWith('Bearer resource_metadata=')
  })

  test('fails closed when the authenticator throws', async () => {
    const { app } = setup(async () => {
      throw new Error('Clerk unreachable')
    })

    const response = await app.fetch(
      mcpRequest(`/${botToken}/mcp`, { Authorization: 'Bearer token' }),
    )

    expect(response.status).toBe(401)
  })

  test("binds the audience to the requested bot's public URL", async () => {
    const { app, authenticate } = setup(async () => false)

    await app.fetch(mcpRequest('/111:aaa/mcp', { Authorization: 'Bearer token' }))
    await app.fetch(
      mcpRequest('/222:bbb/mcp', {
        Authorization: 'Bearer token',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'sendkit.example.com',
      }),
    )

    expect(authenticate.mock.calls.map(([, audience]) => audience)).toEqual([
      'http://localhost/111:aaa/mcp',
      'https://sendkit.example.com/222:bbb/mcp',
    ])
  })

  test('serves protected resource metadata for the public MCP URL', async () => {
    const { app } = setup()

    const response = await app.fetch(
      new Request(`http://localhost/.well-known/oauth-protected-resource/${botToken}/mcp`, {
        headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'sendkit.example.com' },
      }),
    )
    const metadata = await response.json()

    expect(response.status).toBe(200)
    expect(metadata).toMatchObject({
      resource: `https://sendkit.example.com/${botToken}/mcp`,
      authorization_servers: ['https://example.clerk.accounts.dev'],
      scopes_supported: ['profile', 'email'],
    })
  })

  test('sends the message with the bot token from the URL once authenticated', async () => {
    const fetchStub = spyOn(globalThis, 'fetch').mockImplementation((async () =>
      Response.json({
        ok: true,
        result: { message_id: 7, date: 1_700_000_000, chat: { id: 1 } },
      })) as unknown as typeof fetch)
    const { app } = setup()

    const response = await app.fetch(
      mcpRequest(`/${botToken}/mcp`, { Authorization: 'Bearer token' }),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('Sent Telegram message 7 to chat 1')
    expect(String(fetchStub.mock.calls[0]![0])).toBe(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
    )
  })

  test('returns JSON 404 for unknown paths', async () => {
    const { app } = setup()

    const response = await app.fetch(new Request('http://localhost/nope'))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })
})
