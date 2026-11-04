"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "./confirm-dialog";
import { authClient, signOutAccount } from "@/lib/auth-client";
import { beginAccountSignIn } from "@/lib/sync/access";
import { useWorkspace } from "./account-workspace";

export function AccountControl() {
  const t = useTranslations("account");
  const sync = useTranslations("sync");
  const { data: session, isPending } = authClient.useSession();
  const [busy, setBusy] = useState<"google" | "facebook" | "signout" | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workspace = useWorkspace();
  const user = workspace.available
    ? workspace.status === "expired" || workspace.status === "offline"
      ? null
      : workspace.identity
    : session?.user;

  async function signIn(provider: "google" | "facebook") {
    setBusy(provider);
    setError(null);
    try {
      beginAccountSignIn();
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/",
        // Never lose the reason: Better Auth otherwise redirects to /error.
        errorCallbackURL: "/",
      });
      if (result.error) setError(result.error.message ?? t("error"));
    } catch {
      setError(t("error"));
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("signout");
    setError(null);
    try {
      const result = await signOutAccount();
      if (result.error) setError(result.error.message ?? t("error"));
    } catch {
      setError(t("error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {isPending ? (
        <p className="text-sm text-muted" role="status">
          {t("checking")}
        </p>
      ) : user ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold">{t("titleSignedIn")}</p>
            <p>{user.name?.trim() || user.email}</p>
            {user.name?.trim() ? <p className="text-muted">{user.email}</p> : null}
          </div>
          <button
            type="button"
            className="runo-account-provider w-fit"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setConfirmSignOut(true);
            }}
          >
            {busy === "signout" ? t("signingOut") : t("signOut")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-6 text-muted">{t("copy")}</p>
          {session?.user && workspace.available ? (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold underline"
              onClick={workspace.unlock}
            >
              {sync("verifyExisting")}
            </button>
          ) : null}
          <div className="runo-account-providers">
            <button
              type="button"
              className="runo-account-provider"
              disabled={busy !== null}
              onClick={() => void signIn("google")}
            >
              <span aria-hidden>G</span>
              {busy === "google" ? t("opening") : t("continueGoogle")}
            </button>
            <button
              type="button"
              className="runo-account-provider"
              disabled={busy !== null}
              onClick={() => void signIn("facebook")}
            >
              <span aria-hidden>f</span>
              {busy === "facebook" ? t("opening") : t("continueFacebook")}
            </button>
          </div>
        </>
      )}

      {error ? (
        <p className="runo-account-error" role="alert">
          {error}
        </p>
      ) : null}
      {user ? (
        <ConfirmDialog
          open={confirmSignOut}
          onOpenChange={setConfirmSignOut}
          title={t("confirmSignOutTitle")}
          description={t("confirmSignOutDescription")}
          confirmLabel={t("signOut")}
          onConfirm={() => void signOut()}
        />
      ) : null}
    </div>
  );
}
