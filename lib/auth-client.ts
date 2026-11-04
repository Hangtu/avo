"use client";

import { createAuthClient } from "better-auth/react";
import { finishAccountSignOut, lockAccountAccess } from "@/lib/sync/access";

/**
 * Same-origin client: cookies and OAuth callbacks work on localhost, preview
 * and production without baking a deployment URL into the bundle.
 */
export const authClient = createAuthClient();

/** Hide local data immediately; do not claim remote revocation if the request failed. */
export async function signOutAccount() {
  lockAccountAccess(true);
  let failed = true;
  try {
    const result = await authClient.signOut({ fetchOptions: { timeout: 8000, retry: 0 } });
    failed = Boolean(result.error);
    return result;
  } finally {
    finishAccountSignOut(failed);
  }
}
