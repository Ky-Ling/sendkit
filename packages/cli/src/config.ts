import { z } from 'zod'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { telegramMessageOptionsSchema } from 'sendkit-core'

export const configPath = join(homedir(), '.config', 'sendkit', 'config.json')
export const botTokenSchema = telegramMessageOptionsSchema.shape.botToken

const cliConfigSchema = z.object({
  telegramBotToken: botTokenSchema.optional(),
})

export function writeTelegramBotToken(token: string) {
  mkdirSync(dirname(configPath), { recursive: true })
  writeFileSync(configPath, `${JSON.stringify({ telegramBotToken: token }, null, 2)}\n`, {
    mode: 0o600,
  })
  // mode only applies when the file is created, so tighten an existing file too
  chmodSync(configPath, 0o600)
}

function readCliConfig() {
  try {
    return cliConfigSchema.parse(JSON.parse(readFileSync(configPath, 'utf8')))
  } catch (error) {
    // Don't surface the raw JSON/Zod error, it doesn't say which file is broken
    throw new Error(`Invalid config at ${configPath}. Run \`sendkit init\` again.`, {
      cause: error,
    })
  }
}

export function getTelegramBotToken() {
  if (!existsSync(configPath)) {
    throw new Error('Telegram bot token is required. Run `sendkit init`.')
  }

  const token = readCliConfig().telegramBotToken

  if (!token) {
    throw new Error('Telegram bot token is required. Run `sendkit init`.')
  }

  return token
}
