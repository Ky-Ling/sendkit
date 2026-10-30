// Read hidden input from a terminal, so the token isn't echoed to the screen
function promptHidden(prompt: string) {
  const { stdin, stdout } = process

  return new Promise<string>((resolve, reject) => {
    let value = ''

    const finish = (error?: Error) => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')

      if (error) {
        reject(error)
      } else {
        resolve(value)
      }
    }

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          return finish()
        }
        if (char === '\u0003') {
          return finish(new Error('Cancelled'))
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1)
        } else {
          value += char
        }
      }
    }

    stdout.write(prompt)
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdin.on('data', onData)
    stdin.resume()
  })
}

async function readStdin() {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

// Passing the token as a flag leaves it in shell history and `ps`, so prompt or read stdin by default
export function readTelegramBotTokenInput() {
  return process.stdin.isTTY ? promptHidden('Telegram bot token: ') : readStdin()
}
