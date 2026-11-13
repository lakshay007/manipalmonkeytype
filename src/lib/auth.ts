import type { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Discord sends an `iss` param on the OAuth redirect; without an issuer
      // configured, openid-client rejects the callback and sign-in fails.
      issuer: "https://discord.com",
      // The default 3.5s timeout is too tight for Discord's token endpoint
      // from a cold serverless function and makes sign-in fail intermittently.
      httpOptions: { timeout: 10000 },
      authorization: {
        params: {
          scope: "identify",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and user info to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.id = (profile as any)?.id
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.user.id = token.id as string
      // Remove email from session
      delete session.user.email
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
} 