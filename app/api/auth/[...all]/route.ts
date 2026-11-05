import { auth } from "@/lib/auth";
import { privateHeaders } from "@/lib/sync/server-auth";

/** Normalize throttling/outage responses without exposing adapter errors. */
async function handle(request: Request): Promise<Response> {
  try {
    const response = await auth.handler(request);
    if (response.status >= 500) throw new Error("auth_unavailable");
    if (response.status === 429) {
      return Response.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            ...privateHeaders,
            "Retry-After": response.headers.get("x-retry-after") ?? "60",
          },
        },
      );
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return Response.json(
      { error: "temporarily_unavailable" },
      {
        status: 503,
        headers: privateHeaders,
      },
    );
  }
}

export const GET = handle;
export const POST = handle;
