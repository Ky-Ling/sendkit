# @mirid-dev/sendkit

Command-line tool for sending Telegram messages through your own bot.

Requires Node.js 22.12 or later.

## Install

```sh
npm install -g @mirid-dev/sendkit
```

Or run it without installing: `npx @mirid-dev/sendkit <command>`.

## Usage

Save your bot token (from [@BotFather](https://t.me/BotFather)) once:

```sh
sendkit init
```

`init` prompts for the token, or reads it from stdin. You can also pass it with `--telegram-bot-token <botToken>`, but that leaves the token in your shell history. The token is stored in `~/.config/sendkit/config.json`, readable only by your user.

Send a message:

```sh
sendkit telegram <chatId> "Hello from SendKit"
```

`<chatId>` is a numeric chat ID (negative for groups) or a public `@channelusername`. Messages can be up to 4096 characters.

Run `sendkit --help` for all commands and `sendkit --version` for the installed version.

## License

MIT
