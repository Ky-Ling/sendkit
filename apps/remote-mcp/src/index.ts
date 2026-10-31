import { createClerkClient } from '@clerk/backend'

import { createApp } from './app'

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY
const clerkSecretKey = process.env.CLERK_SECRET_KEY

if (!clerkPublishableKey) {
  throw new Error('CLERK_PUBLISHABLE_KEY environment variable is required')
}

if (!clerkSecretKey) {
  throw new Error('CLERK_SECRET_KEY environment variable is required')
}

const clerkClient = createClerkClient({
  publishableKey: clerkPublishableKey,
  secretKey: clerkSecretKey,
})

const app = createApp({
  publishableKey: clerkPublishableKey,
  authenticate: async (request, audience) => {
    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: 'oauth_token',
      // Requires "Include audience" in Clerk's OAuth settings, or every token lacks `aud`
      audience,
    })

    return requestState.isAuthenticated
  },
})

process.on('SIGINT', async () => {
  await app.close()
  process.exit(0)
})

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch: app.fetch,
}
