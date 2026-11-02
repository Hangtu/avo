import { NextResponse, type NextRequest } from "next/server";

import {
  CLOUD_COOKIE,
  cloudCookieOptions,
  cloudOwnerId,
  isCloudConfigured,
  isRequestAuthenticated,
} from "@/lib/cloud/auth";
import { BackupError, parseBackupSnapshot } from "@/lib/cloud/snapshot";
import {
  deleteRemoteSnapshot,
  getLastBackup,
  replaceRemoteSnapshot,
} from "@/lib/cloud/repository";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function notConfigured() {
  return NextResponse.json(
    { configured: false, error: "not_configured" },
    { status: 503 },
  );
}

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isCloudConfigured()) return notConfigured();
  if (!isRequestAuthenticated(request)) return unauthorized();

  const result = await getLastBackup(cloudOwnerId());
  return NextResponse.json({ configured: true, connected: true, ...result });
}

export async function DELETE(request: NextRequest) {
  if (!isCloudConfigured()) return notConfigured();
  if (!isRequestAuthenticated(request)) return unauthorized();

  try {
    await deleteRemoteSnapshot(cloudOwnerId());
    const response = NextResponse.json({ configured: true, deleted: true });
    response.cookies.set(CLOUD_COOKIE, "", { ...cloudCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("No se pudo eliminar la copia remota", error);
    return NextResponse.json({ error: "deletion_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isCloudConfigured()) return notConfigured();
  if (!isRequestAuthenticated(request)) return unauthorized();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let snapshot;
  try {
    snapshot = parseBackupSnapshot(body);
  } catch (error) {
    if (error instanceof BackupError) {
      return NextResponse.json({ error: "invalid_snapshot", detail: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid_snapshot" }, { status: 400 });
  }

  try {
    const result = await replaceRemoteSnapshot(
      snapshot,
      cloudOwnerId(),
      process.env.RUNO_TIME_ZONE ?? "America/Mexico_City",
    );
    return NextResponse.json({ configured: true, connected: true, ...result });
  } catch (error) {
    console.error("No se pudo reemplazar la copia remota", error);
    return NextResponse.json({ error: "backup_failed" }, { status: 500 });
  }
}
