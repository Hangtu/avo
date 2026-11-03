/**
 * Machine-readable codes Better Auth appends to the OAuth error redirect
 * (`?error=<code>`). Only codes are mapped; provider text is never rendered.
 */
export type AuthErrorKey =
  | "accountNotLinked"
  | "emailMissing"
  | "emailNotVerified"
  | "emailMismatch"
  | "denied"
  | "generic";

const CODES: Record<string, AuthErrorKey> = {
  account_not_linked: "accountNotLinked",
  unable_to_link_account: "accountNotLinked",
  email_not_found: "emailMissing",
  email_not_verified: "emailNotVerified",
  email_does_not_match: "emailMismatch",
  access_denied: "denied",
};

export function authErrorKey(code: string | null | undefined): AuthErrorKey | null {
  if (!code) return null;
  return CODES[code] ?? "generic";
}
