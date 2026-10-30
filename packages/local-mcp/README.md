# @mirid-dev/sendkit-local-mcp

Local [MCP](https://modelcontextprotocol.io) server that lets AI clients such as Claude Code send Telegram messages through your own bot. It runs over stdio.

Requires Node.js 20 or later.

## Setup

Add it to your MCP client config, with your bot token from [@BotFather](https://t.me/BotFather). For Claude Code, in `.mcp.json`:

```json
{
  "mcpServers": {
    "sendkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mirid-dev/sendkit-local-mcp@latest"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "<your-bot-token>"
      }
    }
  }
}
```

Keep the `@latest` suffix if you run this inside a checkout of the SendKit repo. Without it, `npx` resolves the package to the repo's own workspace copy and fails to start.

## Tools

### `telegram`

Sends a Telegram message.

| Input     | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| `chatId`  | Numeric chat ID (negative for groups) or a public `@channelusername` |
| `message` | Message text, up to 4096 characters                                  |

Returns the sent message's `messageId`, the numeric `chatId`, and `sentAt` (ISO 8601).

## License

MIT
