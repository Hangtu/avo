import "server-only";

import { auth } from "@/lib/auth";
import { authOrigins } from "@/lib/auth-origins";

export class AccountHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export async function verifiedAccount(request: Request, mutation = false): Promise<string> {
  if (mutation) {
    if (
      !authOrigins().includes(request.headers.get("origin") ?? "") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      throw new AccountHttpError(403, "invalid_origin");
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      throw new AccountHttpError(415, "json_required");
    }
  }
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) throw new AccountHttpError(401, "unauthorized");
  // An expected ID prevents an A outbox request being applied under B's cookies.
  if (request.headers.get("x-avo-account") !== session.user.id)
    throw new AccountHttpError(409, "account_changed");
  return session.user.id;
}
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, X-Avo-Account" };
