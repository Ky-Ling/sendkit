import type { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

import {
  sendTelegramMessage,
  telegramMessageInputSchema,
  telegramMessageOutputSchema,
} from 'sendkit-core'

// Structured content travels as JSON, so the Date becomes an ISO string
const telegramToolOutputSchema = telegramMessageOutputSchema.extend({
  sentAt: z.iso.datetime(),
})

// getBotToken runs per call, so a missing token fails the call rather than server startup
export function registerTelegramTool(server: McpServer, getBotToken: () => string) {
  server.registerTool(
    'telegram',
    {
      title: 'Telegram',
      description: 'Send a Telegram message',
      inputSchema: telegramMessageInputSchema,
      outputSchema: telegramToolOutputSchema,
    },
    async (input) => {
      const result = await sendTelegramMessage({
        ...input,
        botToken: getBotToken(),
      })

      const output = { ...result, sentAt: result.sentAt.toISOString() }

      return {
        content: [
          {
            type: 'text',
            text: `Sent Telegram message ${output.messageId} to chat ${output.chatId}`,
          },
        ],
        structuredContent: output,
      }
    },
  )
}
