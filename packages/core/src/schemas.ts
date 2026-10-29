import { z } from 'zod'

// Telegram rejects message text longer than this
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096

// Numeric ID (negative for groups) or a public @channelusername
const telegramChatIdSchema = z
  .string()
  .trim()
  .refine(
    (chatId) => /^-?\d+$/.test(chatId) || /^@\w{5,}$/.test(chatId),
    'Use a numeric chat ID or @channelusername',
  )

export const telegramMessageInputSchema = z.object({
  chatId: telegramChatIdSchema,
  message: z
    .string()
    .refine((message) => message.trim().length > 0, 'Message cannot be empty')
    .refine(
      (message) => message.length <= TELEGRAM_MAX_MESSAGE_LENGTH,
      `Telegram allows at most ${TELEGRAM_MAX_MESSAGE_LENGTH} characters`,
    ),
})

export const telegramMessageOptionsSchema = telegramMessageInputSchema.extend({
  botToken: z
    .string()
    .trim()
    .min(1, 'Telegram bot token is required')
    // Tokens look like 123456789:AAH...; a copied "bot" prefix would otherwise surface as a 404
    .regex(/^\d+:[\w-]+$/, 'Expected a token like 123456789:ABC-DEF..., without the "bot" prefix'),
})

// Body of POST /bot<token>/sendMessage, in Telegram's snake_case
export const telegramSendMessageRequestSchema = z.object({
  chat_id: z.union([z.string(), z.number().int()]),
  text: z.string().min(1).max(TELEGRAM_MAX_MESSAGE_LENGTH),
  parse_mode: z.enum(['MarkdownV2', 'HTML', 'Markdown']).optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
})

// Telegram returns a JSON body with `ok` and `description` even on 4xx errors
export const telegramSendMessageResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    result: z.object({
      message_id: z.number().int(),
      date: z.number().int(),
      chat: z.object({
        id: z.number().int(),
      }),
    }),
  }),
  z.object({
    ok: z.literal(false),
    error_code: z.number().int().optional(),
    description: z.string().optional(),
  }),
])

export const telegramMessageOutputSchema = z.object({
  messageId: z.number().int(),
  // Always numeric: Telegram resolves @channelusername to the chat's ID
  chatId: z.number().int(),
  sentAt: z.date(),
})

export type TelegramMessageInput = z.infer<typeof telegramMessageInputSchema>
export type TelegramMessageOptions = z.infer<typeof telegramMessageOptionsSchema>
export type TelegramMessageOutput = z.infer<typeof telegramMessageOutputSchema>
