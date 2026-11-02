import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

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

function trustedOrigins(): string[] {
  const configured = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  return (configured ? configured.split(",") : [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://runo-mu.vercel.app",
  ]).map((origin) => origin.trim()).filter(Boolean);
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
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
    accountLinking: { enabled: true },
  },
  emailAndPassword: { enabled: false },
  socialProviders: socialProviders(),
  trustedOrigins: trustedOrigins(),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db
            .insert(schema.users)
            .values({
              id: user.id,
              timeZone: process.env.RUNO_TIME_ZONE ?? "America/Mexico_City",
            })
            .onConflictDoNothing();
        },
      },
    },
  },
  plugins: [nextCookies()],
});
