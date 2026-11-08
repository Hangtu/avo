import { withAccountDiagnostics } from "@/lib/observability/account-diagnostics";
import { accountFailure, accountSession, privateHeaders } from "@/lib/sync/server-auth";

/** Private workspace session probe; domain rows are never returned here. */
export async function GET(request: Request) {
  return withAccountDiagnostics("account.me.get", async () => {
    try {
      const session = await accountSession(request, "probe");
      return Response.json(
        {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image ?? null,
          },
        },
        { headers: privateHeaders },
      );
    } catch (error) {
      return accountFailure(error);
    }
  });
}
