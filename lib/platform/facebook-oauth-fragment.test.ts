import { describe, expect, it, vi } from "vitest";

import { removeFacebookOAuthFragment } from "./facebook-oauth-fragment";

describe("Facebook OAuth URL fragment cleanup", () => {
  it("removes only #_=_ while preserving the route and query", () => {
    const history = { state: { next: "/settings" }, replaceState: vi.fn() };

    expect(removeFacebookOAuthFragment({
      hash: "#_=_",
      pathname: "/",
      search: "?from=facebook",
    }, history)).toBe(true);
    expect(history.replaceState).toHaveBeenCalledWith(
      history.state,
      "",
      "/?from=facebook",
    );
  });

  it("leaves other fragments and history unchanged", () => {
    const history = { state: null, replaceState: vi.fn() };

    expect(removeFacebookOAuthFragment({
      hash: "#section",
      pathname: "/",
      search: "",
    }, history)).toBe(false);
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
