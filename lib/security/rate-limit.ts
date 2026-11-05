import "server-only";

import type { BetterAuthOptions, BetterAuthRateLimitOptions } from "better-auth";
import { getIP } from "better-auth/api";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { createRateLimitStore, type RateLimitRule } from "./rate-limit-store";

// Only Vercel overwrites this header at our deployed boundary. Never trust a
// caller-supplied X-Forwarded-For. Other hosts use a shared fallback until their
// reverse-proxy boundary is explicitly reviewed.
export const trustedIpOptions = {
  advanced: {
    ipAddress: {
      ipAddressHeaders: env.VERCEL === "1" ? ["x-vercel-forwarded-for"] : [],
      ipv6Subnet: 64,
    },
  },
} satisfies Pick<BetterAuthOptions, "advanced">;

const store = createRateLimitStore({ database: db, secret: env.BETTER_AUTH_SECRET });
export const ACCOUNT_LIMITS = {
  ip: { window: 60, max: 240 },
  probe: { window: 60, max: 120 },
  read: { window: 60, max: 60 },
  write: { window: 60, max: 30 },
} as const satisfies Record<string, RateLimitRule>;

export const authRateLimit = {
  enabled: true,
  window: 60,
  max: 120,
  customRules: {
    "/sign-in/*": { window: 900, max: 10 },
    "/callback/*": { window: 900, max: 20 },
  },
  customStorage: {
    consume: (key, rule) => {
      // Better Auth keys are IP|path. Share paths with identical budgets to
      // prevent arbitrary unknown paths creating an unbounded key per IP.
      const ip = key.slice(0, key.indexOf("|"));
      return store.consume(`auth:${rule.window}:${rule.max}:${ip}`, rule);
    },
  },
} satisfies BetterAuthRateLimitOptions;

export class RateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super("rate_limited");
  }
}

export function rateLimitIp(request: Request): string {
  return getIP(request, trustedIpOptions) ?? "no-trusted-ip";
}

/** Store errors propagate: a missing migration/outage must not disable limits. */
export async function enforceRateLimit(key: string, rule: RateLimitRule): Promise<void> {
  const result = await store.consume(key, rule);
  if (!result.allowed) throw new RateLimitError(result.retryAfter ?? rule.window);
}
