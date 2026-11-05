import "server-only";

import { betterAuth } from "better-auth";
import { boundedAuthAdapter } from "@/lib/db/auth-adapter";
import { boundedTransaction } from "@/lib/db/transaction";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { authOrigins } from "@/lib/auth-origins";
import { env } from "@/lib/env";
import { authRateLimit, trustedIpOptions } from "@/lib/security/rate-limit";

function socialProviders() {
  const { GOOGLE_CLIENT_ID: googleId, GOOGLE_CLIENT_SECRET: googleSecret } = env;
  const { FACEBOOK_CLIENT_ID: facebookId, FACEBOOK_CLIENT_SECRET: facebookSecret } = env;

  return {
    ...(googleId && googleSecret ? { google: { clientId: googleId, clientSecret: googleSecret } } : {}),
    ...(facebookId && facebookSecret
      ? { facebook: { clientId: facebookId, clientSecret: facebookSecret } }
      : {}),
  };
}

function discardedProviderTokens() {
  return {
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
  };
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  ...(authOrigins().length > 1 ? { trustedOrigins: authOrigins().slice(1) } : {}),
  secret: env.BETTER_AUTH_SECRET,
  database: boundedAuthAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.authUsers,
      session: schema.authSessions,
      account: schema.authAccounts,
      verification: schema.authVerifications,
    },
  }),
  advanced: trustedIpOptions.advanced,
  rateLimit: authRateLimit,
  account: {
    storeAccountCookie: false,
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
    // Login needs the provider identity, not reusable credentials. Override with
    // null (not undefined: updates must also clear previously stored tokens).
    account: {
      create: { before: async () => ({ data: discardedProviderTokens() }) },
      update: { before: async () => ({ data: discardedProviderTokens() }) },
    },
    user: {
      create: {
        // Reverse order: an account first created by a provider counts as
        // verified, so Google can link into a Facebook-created user. This does
        // not mean the mailbox was verified by Avo; it records that a provider
        // authenticated the person and gave that email (MVP policy).
        before: async (user) =>
          user.email && !user.emailVerified ? { data: { emailVerified: true } } : undefined,
        after: async (user) => {
          await boundedTransaction({
            database: db,
            work: async (transaction) => {
              await transaction
                .insert(schema.users)
                .values({
                  id: user.id,
                  authUserId: user.id,
                  timeZone: "America/Mexico_City",
                })
                .onConflictDoNothing();
            },
          });
        },
      },
    },
  },
  onAPIError: {
    onError: async () => {
      console.error("Authentication unavailable");
    },
  },
  plugins: [nextCookies()],
});
