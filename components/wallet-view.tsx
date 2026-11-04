"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { motion, useReducedMotion } from "motion/react";
import { Toast } from "@base-ui/react/toast";
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
  const toastManager = Toast.useToastManager();
  const reduceMotion = useReducedMotion();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

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
      setFieldErrors({ amount: t("invalid") });
      amountRef.current?.focus();
      return;
    }
    if (value > balance) {
      setFieldErrors({ amount: t("notEnough") });
      amountRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setError(null);
    setConfirmation({ amount: value, actionId: newActionId() });
  }

  async function confirm() {
    if (!confirmation || busy) return;
    setBusy(true);
    setError(null);
    try {
      const db = await openDatabase();
      try {
        const result = await redeemRc(db, confirmation.amount, confirmation.actionId, Date.now());
        setBalance(result.balance);
        toastManager.add({
          title: t("used", { minutes: confirmation.amount }),
          type: "success",
          timeout: 4000,
        });
        setConfirmation(null);
        setAmount("");
        setFieldErrors({});
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("eyebrow")}</p>
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

          {balance === 0 ? (
            <p className="mt-5 text-sm leading-6 text-muted">{t("empty")}</p>
          ) : confirmation ? (
            <div className="mt-6 border-y border-line py-5">
              <p className="text-lg font-semibold">{t("confirmTitle", { minutes: confirmation.amount })}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("confirmCopy", { minutes: confirmation.amount })}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <motion.button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy}
                  className="min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                >
                  {busy ? t("saving") : t("confirm")}
                </motion.button>
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
            <Form
              noValidate
              errors={fieldErrors}
              onSubmit={(event) => {
                event.preventDefault();
                review();
              }}
              className="mt-6"
            >
              <Field.Root name="amount" className="form-field max-w-xs">
                <Field.Label className="form-label">{t("input")}</Field.Label>
                <Field.Control
                  ref={amountRef}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={balance}
                  step={1}
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError(null);
                    setFieldErrors((current) => {
                      if (!current.amount) return current;
                      const next = { ...current };
                      delete next.amount;
                      return next;
                    });
                  }}
                  className="mt-1 min-h-11 w-full border border-control bg-background px-3 text-base"
                  placeholder={String(Math.min(10, balance))}
                />
                <Field.Error className="form-error" />
              </Field.Root>
              <motion.button
                type="submit"
                disabled={busy}
                className="mt-4 min-h-11 bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                {t("review")}
              </motion.button>
            </Form>
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
