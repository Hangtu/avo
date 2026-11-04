import "server-only";

import { publicEnv } from "@/lib/public-env";

const localOrigin = "http://localhost:3000";

function vercelOrigin(): string | undefined {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return host ? `https://${host}` : undefined;
}

/**
 * Canonical origin for metadata, robots, and the sitemap. Precedence:
 * explicit `NEXT_PUBLIC_SITE_URL`, Vercel's production host, localhost.
 * The planned production origin is `https://avo.frutit.app`; set
 * `NEXT_PUBLIC_SITE_URL` there when the domain is configured.
 */
export const siteUrl = (publicEnv.NEXT_PUBLIC_SITE_URL ?? vercelOrigin() ?? localOrigin).replace(/\/$/, "");

export const siteName = "Avo";
