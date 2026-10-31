import { NextResponse, type NextRequest } from "next/server";

import {
  CLOUD_COOKIE,
  cloudCookieOptions,
  createSessionToken,
  isCloudConfigured,
  isRequestAuthenticated,
  isValidPasscode,
} from "@/lib/cloud/auth";

function notConfigured() {
  return NextResponse.json(
    { configured: false, error: "not_configured" },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  if (!isCloudConfigured()) return notConfigured();
  return isRequestAuthenticated(request)
    ? NextResponse.json({ configured: true, connected: true })
    : NextResponse.json({ configured: true, connected: false }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isCloudConfigured()) return notConfigured();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const passcode = typeof body === "object" && body !== null && "passcode" in body
    ? (body as { passcode?: unknown }).passcode
    : undefined;
  if (!isValidPasscode(passcode)) {
    return NextResponse.json({ error: "invalid_passcode" }, { status: 401 });
  }

  const response = NextResponse.json({ configured: true, connected: true });
  response.cookies.set(CLOUD_COOKIE, createSessionToken(), cloudCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ configured: isCloudConfigured(), connected: false });
  response.cookies.set(CLOUD_COOKIE, "", { ...cloudCookieOptions(), maxAge: 0 });
  return response;
}
