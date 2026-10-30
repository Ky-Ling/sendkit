---
name: sendkit
description: Send Telegram messages from an agent through the SendKit MCP `telegram` tool, with the SendKit CLI (`@mirid-dev/sendkit`) as a fallback. Use when a user asks to send a Telegram message, mentions SendKit, wants to interact with the SendKit toolset, asks to verify SendKit manually, or needs to choose between the SendKit MCP and CLI workflows.
---

# SendKit

SendKit sends Telegram messages through the user's own bot. It exposes the same operation two ways, both backed by `@mirid-dev/sendkit-core`:

- **MCP tool** (`sendkit` server → `telegram` tool, from `@mirid-dev/sendkit-local-mcp`) — preferred for agents.
- **CLI** (`@mirid-dev/sendkit`, binary `sendkit`) — fallback when MCP is unavailable or for manual verification.

Both take a `chatId` and a `message` and call the Telegram Bot API `sendMessage` method.

Only use packages under the `@mirid-dev` scope. Packages with similar names under other scopes belong to other people and must never receive the user's bot token.

## Inputs

| Field     | Type   | Rules                                                                 |
| --------- | ------ | --------------------------------------------------------------------- |
| `chatId`  | string | Numeric chat ID (negative for groups), or a public `@channelusername` |
| `message` | string | Not blank, at most 4096 characters                                    |

The bot token is never part of the input. Never ask the user to paste it into the chat or include it in a command you run.

## Choosing MCP vs CLI

Prefer the **MCP tool** whenever the `sendkit` MCP server is connected — it needs no shell and the bot token is supplied by the MCP client environment.

Use the **CLI** when:

- The MCP server is not connected in this session.
- Verifying behavior manually or from a script / terminal.
- The token saved by `sendkit init` should be used instead of the MCP server's environment token.

## MCP workflow (preferred)

Call the `telegram` tool on the `sendkit` MCP server with `chatId` and `message`.

The server reads the bot token from `TELEGRAM_BOT_TOKEN` in its environment, set in the MCP client config:

```json
{
  "mcpServers": {
    "sendkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mirid-dev/sendkit-local-mcp@latest"],
      "env": { "TELEGRAM_BOT_TOKEN": "<your-bot-token>" }
    }
  }
}
```

Keep the `@latest` suffix. Inside a checkout of the SendKit repo, a bare package name makes `npx` resolve to the local workspace copy, and the server fails to start (the client reports the connection as closed).

On success the tool returns structured content `{ messageId, chatId, sentAt }`: `messageId` and `chatId` are numbers (Telegram resolves `@channelusername` to the numeric chat ID) and `sentAt` is an ISO 8601 timestamp. Its text content reads `Sent Telegram message <messageId> to chat <chatId>`.

## CLI workflow (fallback)

Requires Node.js 22.12 or later. Run it without a global install via `npx @mirid-dev/sendkit <command>` (or `bunx @mirid-dev/sendkit <command>`).

First-time setup stores the token in `~/.config/sendkit/config.json` (mode `0600`). Have the user run it themselves, since it prompts for the token:

```bash
sendkit init
```

`init` also reads the token from stdin. Avoid `--telegram-bot-token <botToken>`: it leaves the token in shell history.

Send a message:

```bash
sendkit telegram <chatId> "<message>"
```

On success it prints:

```
Sending message to <chatId>...
Message sent
  Message ID: <messageId>
  Chat ID:    <chatId>
  Sent at:    <local time>
```

On failure it prints the error to stderr and exits with code `1`. Without a saved token it fails with ``Telegram bot token is required. Run `sendkit init`.``

## Errors

Both workflows surface the same errors from `@mirid-dev/sendkit-core`, and none of them contain the bot token:

- `Telegram API error (<status>): <description>` — Telegram rejected the request, e.g. an invalid token or unknown chat ID.
- `Could not reach Telegram: <reason>` — network failure, or no response within 10 seconds.
- `Unexpected response from Telegram (HTTP <status>)` — the response wasn't Telegram's JSON. If it adds `the message may still have been sent`, check the chat before resending.
- Input validation errors, e.g. `Use a numeric chat ID or @channelusername` or `Telegram allows at most 4096 characters`.

## Verifying manually

To confirm SendKit works end to end, send a test message to a known chat ID and check the result includes a numeric `messageId`. Use the CLI for this so the result is visible in the terminal:

```bash
sendkit telegram <yourChatId> "SendKit test message"
```

Then confirm the message arrived in the Telegram chat.
