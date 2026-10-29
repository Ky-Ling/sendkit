import { Command } from "commander"
import { sendTelegramMessage, telegramMessageOptionsSchema } from "sendkit-core"

const program = new Command()

program
  .name("sendkit")
  .description("Sendkit tutorial CLI")
  // Required by passThroughOptions() on the subcommand below
  .enablePositionalOptions()
  .command("telegram")
  .description("Send a Telegram message")
  .argument("<chatId>", "Telegram Chat ID")
  .argument("<message>", "Message text to send")
  // Stop parsing options after <chatId>, so a message like "-hello" or "--help" is sent as text
  .passThroughOptions()
  .action(async (chatId: string, message: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token?.trim()) {
      console.error("Missing TELEGRAM_BOT_TOKEN. Set it in your .env file.")
      process.exit(1)
    }

    // Validate here so bad arguments print a readable message instead of a raw ZodError
    const input = telegramMessageOptionsSchema.safeParse({ chatId, message, botToken: token })

    if (!input.success) {
      for (const issue of input.error.issues) {
        console.error(`Invalid ${issue.path.join(".")}: ${issue.message}`)
      }
      process.exit(1)
    }

    console.log(`Sending message to ${input.data.chatId}...`)

    try {
      const result = await sendTelegramMessage(input.data)

      console.log("Message sent")
      console.log(`  Message ID: ${result.messageId}`)
      console.log(`  Chat ID:    ${result.chatId}`)
      console.log(`  Sent at:    ${result.sentAt.toLocaleString()}`)
    } catch (error) {
      // Safe to print: sendTelegramMessage never puts the bot token in its errors
      console.error(`Failed to send message: ${(error as Error).message}`)
      process.exit(1)
    }
  })

program.parseAsync(process.argv)
