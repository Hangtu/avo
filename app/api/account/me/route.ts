import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";

/** Private workspace session probe; domain rows are never returned here. */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
