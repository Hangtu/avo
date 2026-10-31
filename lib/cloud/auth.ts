import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const CLOUD_COOKIE = "runo_cloud_session";
export const CLOUD_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function configuredSecret(): string | null {
  const secret = process.env.RUNO_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function cloudOwnerId(): string {
  return process.env.RUNO_OWNER_ID?.trim() || "owner";
}

export function isCloudConfigured(): boolean {
  const passcode = process.env.RUNO_PASSCODE;
  return Boolean(passcode && passcode.length >= 8 && configuredSecret());
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Compare hashes so a wrong length does not throw or leak. */
export function isValidPasscode(candidate: unknown): boolean {
  const expected = process.env.RUNO_PASSCODE;
  if (!expected || typeof candidate !== "string" || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  const secret = configuredSecret();
  if (!secret) throw new Error("La nube no está configurada.");
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    ownerId: cloudOwnerId(),
    exp: now + CLOUD_SESSION_MAX_AGE * 1000,
  })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const secret = configuredSecret();
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature) return false;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      v?: number;
      ownerId?: string;
      exp?: number;
    };
    return data.v === 1 &&
      data.ownerId === cloudOwnerId() &&
      Number.isFinite(data.exp) &&
      (data.exp as number) > now;
  } catch {
    return false;
  }
}

export function isRequestAuthenticated(request: NextRequest): boolean {
  return verifySessionToken(request.cookies.get(CLOUD_COOKIE)?.value);
}

export function cloudCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: CLOUD_SESSION_MAX_AGE,
    priority: "high" as const,
  };
}
