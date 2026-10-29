import { z } from 'zod'
import {
  telegramMessageOutputSchema,
  telegramMessageOptionsSchema,
  telegramSendMessageRequestSchema,
  telegramSendMessageResponseSchema,
  type TelegramMessageOutput,
} from './schemas'

const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000

export async function sendTelegramMessage(
  input: z.input<typeof telegramMessageOptionsSchema>,
): Promise<TelegramMessageOutput> {
  const { chatId, message, botToken } = telegramMessageOptionsSchema.parse(input)

  const requestBody = telegramSendMessageRequestSchema.parse({
    chat_id: chatId,
    text: message,
  })

  let response: Response

  try {
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    // Don't rethrow the original error: the request URL contains the bot token
    const reason = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line preserve-caught-error -- the cause would carry the token
    throw new Error(`Could not reach Telegram: ${reason.replaceAll(botToken, '<redacted>')}`)
  }

  // Telegram returns a JSON body even on 4xx errors, but a proxy or outage page may not
  const parsedResponse = telegramSendMessageResponseSchema.safeParse(
    await response.json().catch(() => null),
  )

  if (!parsedResponse.success) {
    // A 2xx we can't read may still mean the message went out, so warn before the caller resends
    const hint = response.ok ? '; the message may still have been sent' : ''
    throw new Error(`Unexpected response from Telegram (HTTP ${response.status})${hint}`)
  }

  const data = parsedResponse.data

  if (!data.ok) {
    throw new Error(
      `Telegram API error (${response.status}): ${data.description || response.statusText || 'Unknown error'}`,
    )
  }

  return telegramMessageOutputSchema.parse({
    messageId: data.result.message_id,
    chatId: data.result.chat.id,
    sentAt: new Date(data.result.date * 1000),
  })
}
