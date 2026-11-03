import { describe, expect, it } from "vitest";

import { authErrorKey } from "./auth-error";

describe("OAuth callback error codes — no provider text is shown", () => {
  it("maps the codes that explain why a link was refused", () => {
    expect(authErrorKey("account_not_linked")).toBe("accountNotLinked");
    expect(authErrorKey("unable_to_link_account")).toBe("accountNotLinked");
    expect(authErrorKey("email_not_found")).toBe("emailMissing");
    expect(authErrorKey("email_not_verified")).toBe("emailNotVerified");
    expect(authErrorKey("email_does_not_match")).toBe("emailMismatch");
    expect(authErrorKey("access_denied")).toBe("denied");
  });
  it("falls back to a neutral message for unknown codes instead of guessing", () => {
    expect(authErrorKey("invalid_code")).toBe("generic");
    expect(authErrorKey("<script>")).toBe("generic");
  });
  it("shows nothing when the redirect carries no error", () => {
    expect(authErrorKey(null)).toBeNull();
    expect(authErrorKey(undefined)).toBeNull();
    expect(authErrorKey("")).toBeNull();
  });
});
