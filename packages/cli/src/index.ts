import { Command } from "commander"

type TelegramResponseType = {
  ok: boolean
  result?: {
    message_id?: number
  }
  description?: string
}

const program = new Command()

program 
  .name("sendkit")
  .description("Sendkit tutorial CLI")
  .command("telegram")
  .description("Send a Telegram message")
  .argument("<chatId>", "Telegram Chat ID")
  .argument("<message>", "Message text to send")
  .action(async (chatId: string, message: string) => {
    const token = process.env.TELEGRAM_BOT_TOKEN

    if (!token?.trim()) {
      console.error("Missing TELEGRAM_BOT_TOKEN. Set it in your .env file.")
      process.exit(1)
    }

    // Numeric ID (negative for groups) or a public @channelusername
    if (!/^-?\d+$/.test(chatId) && !/^@\w{5,}$/.test(chatId)) {
      console.error(`Invalid chatId "${chatId}". Use a numeric ID or @channelusername.`)
      process.exit(1)
    }

    if (!message.trim()) {
      console.error("Message cannot be empty.")
      process.exit(1)
    }

    if (message.length > 4096) {
      console.error(`Message is ${message.length} characters; Telegram allows at most 4096.`)
      process.exit(1)
    }

    let response: Response

    try {
      response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ chat_id: chatId, text: message })
        }
      )
    } catch (error) {
      // Only print the message: the request URL contains the bot token
      console.error(`Could not reach Telegram: ${(error as Error).message}`)
      process.exit(1)
    }

    // Telegram returns a JSON body with `ok` and `description` even on 4xx errors
    const data = (await response.json().catch(() => null)) as TelegramResponseType | null

    if (!response.ok || !data?.ok) {
      console.error(`Telegram API error (${response.status}): ${data?.description ?? response.statusText}`)
      process.exit(1)
    }

    const messageId = data.result?.message_id

    console.log(`Message sent (message_id: ${messageId})`)

    if (messageId !== undefined) {
      console.log(`Telegram message id: ${messageId}`)
    }
  })

  program.parseAsync(process.argv)