"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { authErrorKey, type AuthErrorKey } from "@/lib/auth-error";
import { takeAuthCallbackError } from "@/lib/platform/auth-callback-error";

const MESSAGE = {
  accountNotLinked: "authErrorAccountNotLinked",
  emailMissing: "authErrorEmailMissing",
  emailNotVerified: "authErrorEmailNotVerified",
  emailMismatch: "authErrorEmailMismatch",
  denied: "authErrorDenied",
  generic: "authErrorGeneric",
} as const;

/**
 * An OAuth callback can land on "/" with `?error=<code>`. Render it once in the
 * chosen language and clean the URL. It is dismissed locally: the condition is
 * a past attempt, not persistent state.
 */
export function AuthErrorNotice() {
  const t = useTranslations("account");
  const [key, setKey] = useState<AuthErrorKey | null>(null);

  useEffect(() => {
    const code = takeAuthCallbackError(window.location, window.history);
    const mapped = authErrorKey(code);
    // Browser-only value read after hydration; SSR has no redirect to inspect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (mapped) setKey(mapped);
  }, []);

  if (!key) return null;
  return (
    <div role="alert" className="mx-auto max-w-3xl px-5 pt-5 text-sm leading-6">
      <p>{t(MESSAGE[key])}</p>
      <button type="button" className="min-h-11 font-semibold underline" onClick={() => setKey(null)}>
        {t("dismiss")}
      </button>
    </div>
  );
}
