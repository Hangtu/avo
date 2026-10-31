"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { HelpTip } from "./help-tip";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import { getBalance, redeemRc } from "@/lib/db/wallet";

interface Confirmation {
  amount: number;
  actionId: string;
}

function newActionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `redeem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function WalletView() {
  const t = useTranslations("wallet");
  const errors = useTranslations("errors");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let db: RunoDatabase | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const value = await getBalance(db);
        if (!cancelled) {
          setBalance(value);
          setLoadError(null);
        }
      } catch (cause) {
        if (!cancelled) {
          console.error("No se pudo abrir el monedero", cause);
          setLoadError(errors("loadWallet"));
        }
      } finally {
        db?.close();
      }
    }

    void load();
    return () => {
      cancelled = true;
      db?.close();
    };
  }, [reloadKey, errors]);

  function review() {
    if (balance === null || busy) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError(t("invalid"));
      return;
    }
    if (value > balance) {
      setError(t("notEnough"));
      return;
    }
    setError(null);
    setNotice(null);
    setConfirmation({ amount: value, actionId: newActionId() });
  }

  async function confirm() {
    if (!confirmation || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const result = await redeemRc(db, confirmation.amount, confirmation.actionId, Date.now());
        setBalance(result.balance);
        setNotice(t("used", { minutes: confirmation.amount }));
        setConfirmation(null);
        setAmount("");
      } finally {
        db.close();
      }
    } catch (cause) {
      console.error("No se pudo canjear", cause);
      setError(errors("redeem"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="wallet-title">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {t("eyebrow")}
      </p>
      <div className="mt-2 flex items-start gap-2">
        <h2 id="wallet-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h2>
        <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
      </div>

      {loadError ? (
        <div className="mt-6 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : balance === null ? (
        <p className="mt-6 text-sm text-muted">{t("loading")}</p>
      ) : (
        <>
          <p className="mt-7 text-4xl font-semibold tabular-nums">
            {Math.floor(balance / 60) > 0
              ? t("balanceHours", {
                  hours: Math.floor(balance / 60),
                  minutes: balance % 60,
                  total: balance,
                })
              : t("balanceMinutes", { minutes: balance % 60, total: balance })}
          </p>

          {notice ? (
            <p className="mt-4 border-l-2 border-line pl-4 text-sm" role="status">
              {notice}
            </p>
          ) : null}

          {balance === 0 ? (
            <p className="mt-5 text-sm leading-6 text-muted">
              {t("empty")}
            </p>
          ) : confirmation ? (
            <div className="mt-6 border-y border-line py-5">
              <p className="text-lg font-semibold">
                {t("confirmTitle", { minutes: confirmation.amount })}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("confirmCopy", { minutes: confirmation.amount })}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy}
                  className="min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {busy ? t("saving") : t("confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  disabled={busy}
                  className="min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <label className="block max-w-xs">
                <span className="text-sm font-medium">{t("input")}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={balance}
                  step={1}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError(null);
                  }}
                  className="mt-1 min-h-11 w-full border border-control bg-background px-3 text-base"
                  placeholder={String(Math.min(10, balance))}
                />
              </label>
              <button
                type="button"
                onClick={review}
                disabled={busy}
                className="mt-4 min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
              >
                {t("review")}
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-4 border-l-2 border-accent pl-4 text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
