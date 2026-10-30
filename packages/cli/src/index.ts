import { Command } from 'commander'
import { sendTelegramMessage, telegramMessageInputSchema } from 'sendkit-core'
import { botTokenSchema, configPath, getTelegramBotToken, writeTelegramBotToken } from './config'
import { readTelegramBotTokenInput } from './input'

const program = new Command()

program.name('sendkit').description('SendKit CLI backed by sendkit-core')

program
  .command('init')
  .description('Configure SendKit CLI local settings')
  .option(
    '--telegram-bot-token <botToken>',
    'Telegram bot token (prompted for, or read from stdin, when omitted)',
  )
  .action(async (options: { telegramBotToken?: string }) => {
    const token = botTokenSchema.safeParse(
      options.telegramBotToken ?? (await readTelegramBotTokenInput()),
    )

    if (!token.success) {
      for (const issue of token.error.issues) {
        console.error(`Invalid Telegram bot token: ${issue.message}`)
      }
      process.exit(1)
    }

    writeTelegramBotToken(token.data)
    console.log(`Saved SendKit CLI config to ${configPath}`)
  })

program
  // Required by passThroughOptions() on the subcommand below
  .enablePositionalOptions()
  .command('telegram')
  .description('Send a Telegram message')
  .argument('<chatId>', 'Telegram Chat ID')
  .argument('<message>', 'Message text to send')
  // Stop parsing options after <chatId>, so a message like "-hello" or "--help" is sent as text
  .passThroughOptions()
  .action(async (chatId: string, message: string) => {
    // Validate here so bad arguments print a readable message instead of a raw ZodError
    const args = telegramMessageInputSchema.safeParse({ chatId, message })

    if (!args.success) {
      for (const issue of args.error.issues) {
        console.error(`Invalid ${issue.path.join('.')}: ${issue.message}`)
      }
      process.exit(1)
    }

    // Load the token only after the arguments are valid, so argument errors aren't hidden by a missing config
    const botToken = getTelegramBotToken()

    console.log(`Sending message to ${args.data.chatId}...`)

    const result = await sendTelegramMessage({ ...args.data, botToken })

    console.log('Message sent')
    console.log(`  Message ID: ${result.messageId}`)
    console.log(`  Chat ID:    ${result.chatId}`)
    console.log(`  Sent at:    ${result.sentAt.toLocaleString()}`)
  })

await program.parseAsync(process.argv).catch((error: unknown) => {
  // Safe to print: sendTelegramMessage never puts the bot token in its errors
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
