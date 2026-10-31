# sendkit

Send Telegram messages through your own bot, from a terminal or from an AI client over [MCP](https://modelcontextprotocol.io).

SendKit has one operation, `sendTelegramMessage`, and exposes it three ways:

- **CLI**: `sendkit telegram <chatId> "<message>"`
- **Local MCP server**: a stdio server that gives clients such as Claude Code a `telegram` tool
- **Remote MCP server**: the same tool over Streamable HTTP, protected by [Clerk](https://clerk.com) OAuth

## Packages

| Path                 | Package                                                                                      | What it is                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `packages/core`      | [`@mirid-dev/sendkit-core`](https://www.npmjs.com/package/@mirid-dev/sendkit-core)           | zod schemas and `sendTelegramMessage`                         |
| `packages/mcp-tools` | [`@mirid-dev/sendkit-mcp-tools`](https://www.npmjs.com/package/@mirid-dev/sendkit-mcp-tools) | `registerTelegramTool`, shared by both MCP servers            |
| `packages/cli`       | [`@mirid-dev/sendkit`](https://www.npmjs.com/package/@mirid-dev/sendkit)                     | The `sendkit` command                                         |
| `packages/local-mcp` | [`@mirid-dev/sendkit-local-mcp`](https://www.npmjs.com/package/@mirid-dev/sendkit-local-mcp) | stdio MCP server                                              |
| `apps/remote-mcp`    | `sendkit-remote-mcp` (private)                                                               | HTTP MCP server with Clerk OAuth, run from source with Bun    |
| `skills/sendkit`     | none                                                                                         | Agent skill that explains when to use the MCP tool or the CLI |

Each published package has its own README with full usage details.

## Quick start

You need a bot token from [@BotFather](https://t.me/BotFather) and the chat ID to send to. A chat ID is a number (negative for groups) or a public `@channelusername`. Messages can be up to 4096 characters.

### CLI

Requires Node.js 22.12 or later.

```sh
npm install -g @mirid-dev/sendkit
sendkit init                                   # prompts for the bot token
sendkit telegram 123456789 "Hello from SendKit"
```

`init` saves the token to `~/.config/sendkit/config.json`, readable only by your user. See [`packages/cli`](packages/cli/README.md).

### Local MCP server

Requires Node.js 20 or later. Add it to your MCP client config. For Claude Code, in `.mcp.json`:

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

Keep the `@latest` suffix if you run this inside a checkout of this repo. Without it, `npx` resolves to the workspace copy and the server fails to start. See [`packages/local-mcp`](packages/local-mcp/README.md).

### Remote MCP server

`apps/remote-mcp` serves the `telegram` tool at `https://<host>/<botToken>/mcp`. The bot token in the path picks which bot sends the message, and every request needs a Clerk OAuth access token issued for that exact URL.

1. In your Clerk instance, enable dynamic client registration, allow the `profile` and `email` scopes for dynamic clients, and turn on **Include audience** in the OAuth settings.
2. Copy `.env.example` to `.env` and set `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Run `bun run dev:remote-mcp` from the repo root, or `bun run start` in `apps/remote-mcp`. It listens on `PORT` (default `3000`).
4. Expose it over HTTPS (a reverse proxy or a tunnel such as ngrok) and add `https://<host>/<botToken>/mcp` to your MCP client as a remote server.

The server honors `x-forwarded-proto` and `x-forwarded-host`, so OAuth URLs match the public address behind a proxy.

Treat the endpoint URL as a secret, because it contains the bot token. The OAuth check confirms that a user signed in to your Clerk instance. It does not tie that user to a particular bot.

## Agent skill

[`skills/sendkit/SKILL.md`](skills/sendkit/SKILL.md) tells an AI agent how to send messages with SendKit. It prefers the MCP tool, falls back to the CLI, and never puts the bot token in chat or on a command line. Copy it into your agent's skills folder (for Claude Code, `~/.claude/skills/sendkit/` or `.claude/skills/sendkit/`).

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
cp .env.example .env               # fill in the values you need
cp .mcp.json.example .mcp.json     # runs the local MCP server from source
```

During development the packages import each other's TypeScript source through a `source` export condition, so you don't need to build first.

| Script                                                   | What it does                                   |
| -------------------------------------------------------- | ---------------------------------------------- |
| `bun run dev:cli -- <args>`                              | Run the CLI from source                        |
| `bun run dev:local-mcp`                                  | Run the local MCP server from source           |
| `bun run dev:remote-mcp`                                 | Run the remote MCP server from source          |
| `bun run build`                                          | Build every package in `packages/` with tsdown |
| `bun run release:pack:<core\|mcp-tools\|cli\|local-mcp>` | Build a package and dry-run `bun pm pack`      |
| `bun run typecheck`                                      | Type-check with `tsc`                          |
| `bun run lint` / `lint:fix`                              | Lint with oxlint                               |
| `bun run format` / `format:check`                        | Format with oxfmt                              |

Publish in dependency order: `core` first, then `cli` and `mcp-tools` in either order, then `local-mcp` once `mcp-tools` is out.

## Notes

- [`notes/01-sendkit-architecture.md`](notes/01-sendkit-architecture.md): how the packages fit together, with diagrams of both MCP servers and the OAuth flow
- [`notes/02-publish-npm-with-tsdown.md`](notes/02-publish-npm-with-tsdown.md): how the packages are built and published to npm

## License

[MIT](LICENSE)
