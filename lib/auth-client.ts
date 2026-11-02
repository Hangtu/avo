"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Same-origin client: cookies and OAuth callbacks work on localhost, preview
 * and production without baking a deployment URL into the bundle.
 */
export const authClient = createAuthClient();
