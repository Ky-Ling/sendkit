import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'

import { sendTelegramMessage } from '../src'

const botToken = '123456789:AAH-test_token'

function stubFetch(respond: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation((async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => respond(String(input), init)) as typeof fetch)
}

function telegramJson(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function rejectionOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected the promise to reject')
}

afterEach(() => {
  mock.restore()
})

describe('sendTelegramMessage', () => {
  test('posts the message to the bot sendMessage endpoint and returns the result', async () => {
    const fetchStub = stubFetch(() =>
      telegramJson(200, {
        ok: true,
        result: { message_id: 42, date: 1_700_000_000, chat: { id: -1001234567890 } },
      }),
    )

    const result = await sendTelegramMessage({ botToken, chatId: '@my_channel', message: 'Hello' })

    expect(result).toEqual({
      messageId: 42,
      chatId: -1001234567890,
      sentAt: new Date(1_700_000_000 * 1000),
    })

    const [url, init] = fetchStub.mock.calls[0]!
    expect(String(url)).toBe(`https://api.telegram.org/bot${botToken}/sendMessage`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: '@my_channel', text: 'Hello' })
  })

  test('rejects invalid input without calling Telegram', async () => {
    const fetchStub = stubFetch(() => telegramJson(200, {}))

    await expect(
      sendTelegramMessage({ botToken, chatId: 'not-a-chat', message: 'Hello' }),
    ).rejects.toThrow('Use a numeric chat ID or @channelusername')
    await expect(sendTelegramMessage({ botToken, chatId: '1', message: '   ' })).rejects.toThrow(
      'Message cannot be empty',
    )
    await expect(
      sendTelegramMessage({ botToken: `bot${botToken}`, chatId: '1', message: 'Hello' }),
    ).rejects.toThrow('Expected a token like 123456789:ABC-DEF...')

    expect(fetchStub).not.toHaveBeenCalled()
  })

  test('redacts the bot token from network errors', async () => {
    stubFetch((url) => {
      throw new Error(`connect ECONNREFUSED ${url}`)
    })

    const { message } = await rejectionOf(
      sendTelegramMessage({ botToken, chatId: '1', message: 'Hello' }),
    )

    expect(message).toStartWith('Could not reach Telegram: connect ECONNREFUSED')
    expect(message).toContain('<redacted>')
    expect(message).not.toContain(botToken)
  })

  test("surfaces Telegram's error description", async () => {
    stubFetch(() =>
      telegramJson(400, { ok: false, error_code: 400, description: 'Bad Request: chat not found' }),
    )

    await expect(sendTelegramMessage({ botToken, chatId: '1', message: 'Hello' })).rejects.toThrow(
      'Telegram API error (400): Bad Request: chat not found',
    )
  })

  test('reports a non-Telegram error response', async () => {
    stubFetch(() => new Response('<html>Bad Gateway</html>', { status: 502 }))

    // Exact match: the "may still have been sent" hint is only for 2xx responses
    const { message } = await rejectionOf(
      sendTelegramMessage({ botToken, chatId: '1', message: 'Hello' }),
    )

    expect(message).toBe('Unexpected response from Telegram (HTTP 502)')
  })

  test('warns that an unreadable success response may still have sent the message', async () => {
    stubFetch(() => new Response('not json', { status: 200 }))

    await expect(sendTelegramMessage({ botToken, chatId: '1', message: 'Hello' })).rejects.toThrow(
      'Unexpected response from Telegram (HTTP 200); the message may still have been sent',
    )
  })
})
