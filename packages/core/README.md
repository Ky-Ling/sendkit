# @mirid-dev/sendkit-core

Telegram messaging operations and [zod](https://zod.dev) schemas shared by the SendKit CLI and MCP servers.

Requires Node.js 20 or later. ESM only.

## Install

```sh
npm install @mirid-dev/sendkit-core
```

## Usage

```ts
import { sendTelegramMessage } from '@mirid-dev/sendkit-core'

const result = await sendTelegramMessage({
  botToken: process.env.TELEGRAM_BOT_TOKEN!,
  chatId: '123456789',
  message: 'Hello from SendKit',
})

console.log(result.messageId, result.chatId, result.sentAt)
```

`sendTelegramMessage` validates its input, calls the Telegram Bot API `sendMessage` method with a 10-second timeout, and resolves to `{ messageId, chatId, sentAt }`. `chatId` comes back numeric even when you pass an `@channelusername`. Errors never include the bot token.

## Input

| Field      | Rules                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `chatId`   | Numeric chat ID (negative for groups), or a public `@channelusername` of at least 5 characters        |
| `message`  | Not blank, at most 4096 characters                                                                    |
| `botToken` | A token like `123456789:ABC-DEF...` from [@BotFather](https://t.me/BotFather), without a `bot` prefix |

## Errors

- `Telegram API error (<status>): <description>`: Telegram rejected the request, for example an invalid token or unknown chat ID.
- `Could not reach Telegram: <reason>`: a network failure, or no response within 10 seconds.
- `Unexpected response from Telegram (HTTP <status>)`: the response wasn't Telegram's JSON. When it adds `the message may still have been sent`, check the chat before resending.
- A `ZodError` for input that breaks the rules above, such as `Use a numeric chat ID or @channelusername` or `Telegram allows at most 4096 characters`.

## Exports

- `sendTelegramMessage(options)`
- Schemas: `telegramMessageInputSchema` (`chatId`, `message`), `telegramMessageOptionsSchema` (adds `botToken`), `telegramMessageOutputSchema`
- Types: `TelegramMessageInput`, `TelegramMessageOptions`, `TelegramMessageOutput`

## License

MIT
