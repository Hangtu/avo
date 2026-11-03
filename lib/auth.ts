import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { authOrigins } from "@/lib/auth-origins";

function configuredValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function socialProviders() {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  const facebookId = process.env.FACEBOOK_CLIENT_ID;
  const facebookSecret = process.env.FACEBOOK_CLIENT_SECRET;

  return {
    ...(configuredValue(googleId) && configuredValue(googleSecret)
      ? { google: { clientId: googleId, clientSecret: googleSecret } }
      : {}),
    ...(configuredValue(facebookId) && configuredValue(facebookSecret)
      ? { facebook: { clientId: facebookId, clientSecret: facebookSecret } }
      : {}),
  };
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ...(authOrigins().length > 1 ? { trustedOrigins: authOrigins().slice(1) } : {}),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.authUsers,
      session: schema.authSessions,
      account: schema.authAccounts,
      verification: schema.authVerifications,
    },
  }),
  account: {
    accountLinking: {
      enabled: true,
      // MVP identity: the provider sign-in is the proof. Same email = same
      // person, in either order, without verifying the mailbox ourselves.
      // Facebook never asserts a verified email in this library version, so it
      // is trusted explicitly instead of pretending it verified.
      disableImplicitLinking: false,
      trustedProviders: ["facebook"],
      updateUserInfoOnLink: false,
    },
  },
  emailAndPassword: { enabled: false },
  socialProviders: socialProviders(),
  databaseHooks: {
    user: {
      create: {
        // Reverse order: an account first created by a provider counts as
        // verified, so Google can link into a Facebook-created user. This does
        // not mean the mailbox was verified by Avo; it records that a provider
        // authenticated the person and gave that email (MVP policy).
        before: async (user) => (user.email && !user.emailVerified
          ? { data: { emailVerified: true } }
          : undefined),
        after: async (user) => {
          await db
            .insert(schema.users)
            .values({
              id: user.id,
              authUserId: user.id,
              timeZone: "America/Mexico_City",
            })
            .onConflictDoNothing();
        },
      },
    },
  },
  plugins: [nextCookies()],
});
