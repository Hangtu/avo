import { describe, expect, it, vi } from "vitest";

import { takeAuthCallbackError } from "./auth-callback-error";

describe("OAuth error redirect cleanup", () => {
  it("removes only the error params and keeps route, other params and fragment", () => {
    const history = { state: { next: "/settings" }, replaceState: vi.fn() };
    const code = takeAuthCallbackError(
      { pathname: "/", search: "?error=account_not_linked&error_description=denied&keep=1", hash: "#_=_" },
      history,
    );
    expect(code).toBe("account_not_linked");
    expect(history.replaceState).toHaveBeenCalledWith({ next: "/settings" }, "", "/?keep=1#_=_");
  });
  it("does nothing when the redirect carries no error", () => {
    const history = { state: null, replaceState: vi.fn() };
    expect(takeAuthCallbackError({ pathname: "/", search: "?keep=1", hash: "" }, history)).toBeNull();
    expect(history.replaceState).not.toHaveBeenCalled();
  });
  it("handles a provider denial and an error-only URL", () => {
    const history = { state: null, replaceState: vi.fn() };
    expect(takeAuthCallbackError({ pathname: "/settings", search: "?error=access_denied", hash: "" }, history))
      .toBe("access_denied");
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/settings");
  });
});
