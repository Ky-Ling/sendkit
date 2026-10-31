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

## Exports

- `sendTelegramMessage(options)`
- Schemas: `telegramMessageInputSchema` (`chatId`, `message`), `telegramMessageOptionsSchema` (adds `botToken`), `telegramMessageOutputSchema`
- Types: `TelegramMessageInput`, `TelegramMessageOptions`, `TelegramMessageOutput`

## License

MIT
