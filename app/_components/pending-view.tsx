"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { Menu } from "@base-ui/react/menu";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toast } from "@base-ui/react/toast";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { openDatabase } from "@/lib/db/database";
import {
  completePendingDirect,
  createPending,
  deletePending,
  listPendings,
  restorePending,
} from "@/lib/db/repository";
import type { Pending } from "@/lib/domain/types";
import { HelpTip } from "./help-tip";

function newPendingId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PendingView({
  focusComposer = 0,
  message = null,
  onStart,
}: {
  focusComposer?: number;
  message?: string | null;
  onStart: (pending: Pending) => Promise<void>;
}) {
  const t = useTranslations("pending");
  const reduceMotion = useReducedMotion();
  const errors = useTranslations("errors");
  const common = useTranslations("common");
  const toast = useTranslations("toast");
  const toastManager = Toast.useToastManager();
  const [items, setItems] = useState<Pending[]>([]);
  const [showComposer, setShowComposer] = useState(focusComposer > 0);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const addingRef = useRef(false);
  const actionBusyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const db = await openDatabase();
        try {
          const next = await listPendings(db);
          if (!cancelled) setItems(next);
        } finally {
          db.close();
        }
      } catch (error) {
        if (cancelled) return;
        console.error("No se pudieron cargar los pendientes", error);
        setLoadError(errors("loadPending"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadKey, errors]);

  useEffect(() => {
    if (focusComposer > 0) {
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [focusComposer]);

  function openComposer() {
    setShowComposer(true);
    setActionError(null);
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function closeComposer() {
    setShowComposer(false);
    setTitle("");
    setMinutes("25");
    setFormErrors({});
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addingRef.current) return;
    addingRef.current = true;
    const cleanTitle = title.trim();
    const value = Number(minutes);
    const nextErrors: Record<string, string> = {};
    if (!cleanTitle) nextErrors.title = t("nameError");
    if (!Number.isSafeInteger(value) || value < 1) nextErrors.minutes = t("minutesError");
    if (Object.keys(nextErrors).length > 0) {
      addingRef.current = false;
      setFormErrors(nextErrors);
      (nextErrors.title ? titleRef : minutesRef).current?.focus();
      return;
    }
    setFormErrors({});
    setAdding(true);
    setActionError(null);
    try {
      const db = await openDatabase();
      try {
        const pending = await createPending(
          db,
          newPendingId(),
          { title: cleanTitle, durationMin: value },
          Date.now(),
        );
        setItems((previous) => [pending, ...previous]);
        setTitle("");
        setMinutes("25");
        setShowComposer(false);
        toastManager.add({ title: t("added"), type: "success", timeout: 3500 });
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo agregar el pendiente", error);
      setActionError(errors("savePending"));
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  }

  async function start(pending: Pending) {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setBusyId(pending.id);
    setActionError(null);
    try {
      await onStart(pending);
    } catch (error) {
      console.error("No se pudo empezar el pendiente", error);
      setActionError(errors("startPending"));
    } finally {
      actionBusyRef.current = false;
      setBusyId(null);
    }
  }

  async function markDone(pending: Pending) {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setBusyId(pending.id);
    setActionError(null);
    try {
      const db = await openDatabase();
      try {
        await completePendingDirect(db, pending.id, Date.now());
      } finally {
        db.close();
      }
      setItems((previous) => previous.filter((item) => item.id !== pending.id));
      toastManager.add({ title: t("completed"), type: "success", timeout: 3500 });
    } catch (error) {
      console.error("No se pudo completar el pendiente", error);
      setActionError(errors("completePending"));
    } finally {
      actionBusyRef.current = false;
      setBusyId(null);
    }
  }

  async function restoreRemoved(pending: Pending) {
    try {
      const db = await openDatabase();
      try {
        const restored = await restorePending(db, pending.id, Date.now());
        setItems((previous) => [
          restored,
          ...previous.filter((item) => item.id !== restored.id),
        ].sort((a, b) => b.createdAt - a.createdAt));
      } finally {
        db.close();
      }
      toastManager.add({ title: t("restored"), type: "success", timeout: 4000 });
    } catch (error) {
      console.error("No se pudo deshacer el borrado", error);
      toastManager.add({ title: toast("undoFailed"), type: "error", timeout: 5000 });
    }
  }

  async function remove(pending: Pending) {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setBusyId(pending.id);
    setActionError(null);
    try {
      const db = await openDatabase();
      try {
        await deletePending(db, pending.id, Date.now());
      } finally {
        db.close();
      }
      setItems((previous) => previous.filter((item) => item.id !== pending.id));
      setDeleteId(null);
      const toastId = toastManager.add({
        title: t("removed"),
        type: "success",
        timeout: 8000,
        actionProps: {
          children: toast("undo"),
          onClick() {
            toastManager.close(toastId);
            void restoreRemoved(pending);
          },
        },
      });
    } catch (error) {
      console.error("No se pudo quitar el pendiente", error);
      setActionError(errors("removePending"));
    } finally {
      actionBusyRef.current = false;
      setBusyId(null);
    }
  }

  return (
    <motion.section
      aria-labelledby="pending-title"
      className="border-y border-line py-8 sm:py-10"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: "easeOut" }}
    >
      <p className="pending-eyebrow text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {t("eyebrow")}
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="pending-title" className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")} <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
          </h2>
        </div>
        {!showComposer ? (
          <button
            type="button"
            aria-label={t("newAria")}
            onClick={openComposer}
            className="min-h-11 whitespace-nowrap border border-control px-3 text-sm font-semibold"
          >
            {t("new")}
          </button>
        ) : null}
      </div>

      {message ? (
        <p role="status" className="mt-4 border-l-2 border-accent pl-4 text-sm leading-6">
          {message}
        </p>
      ) : null}

      {showComposer ? (
      <Form
        noValidate
        errors={formErrors}
        onSubmit={submit}
        className="mt-7 border-y border-line py-5"
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <Field.Root name="title" className="form-field min-w-0">
            <Field.Label className="form-label">{t("what")}</Field.Label>
            <Field.Control
              ref={titleRef}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setFormErrors((current) => {
                  if (!current.title) return current;
                  const next = { ...current };
                  delete next.title;
                  return next;
                });
              }}
              className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
              placeholder={t("placeholder")}
            />
            <Field.Error className="form-error" />
          </Field.Root>
          <Field.Root name="minutes" className="form-field">
            <Field.Label className="form-label">{t("minutes")}</Field.Label>
            <Field.Control
              ref={minutesRef}
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => {
                setMinutes(event.target.value);
                setFormErrors((current) => {
                  if (!current.minutes) return current;
                  const next = { ...current };
                  delete next.minutes;
                  return next;
                });
              }}
              className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
            />
            <Field.Error className="form-error" />
          </Field.Root>
        </div>
        <ToggleGroup
          value={[minutes]}
          onValueChange={(values) => {
            const value = values[0];
            if (!value) return;
            setMinutes(value);
            setFormErrors((current) => {
              if (!current.minutes) return current;
              const next = { ...current };
              delete next.minutes;
              return next;
            });
          }}
          className="mt-3 flex flex-wrap gap-2"
          aria-label={t("minutesAria")}
        >
          {[5, 15, 25, 30].map((value) => (
            <Toggle
              key={value}
              value={String(value)}
              className="day-toggle justify-center"
            >
              {value} min
            </Toggle>
          ))}
        </ToggleGroup>
        <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={closeComposer}
            disabled={adding}
            className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60 sm:order-1"
          >
            {common("cancel")}
          </button>
          <motion.button
            type="submit"
            disabled={adding}
            className="min-h-11 w-full rounded-none bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-60 sm:order-2 sm:w-auto"
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            {adding ? t("saving") : t("add")}
          </motion.button>
        </div>
      </Form>
      ) : null}

      {actionError ? (
        <p role="alert" className="mt-4 border-l-2 border-accent pl-4 text-sm leading-6">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="mt-7 text-sm text-muted">
          {t("loading")}
        </p>
      ) : null}

      {!loading && loadError ? (
        <div className="mt-7 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{loadError}</p>
          <button
            type="button"
            onClick={() => setLoadKey((key) => key + 1)}
            className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : null}

      {!loading && !loadError && items.length === 0 ? (
        <p className="mt-7 border-t border-line pt-5 text-base leading-7 text-muted">
          {t("empty")}
        </p>
      ) : null}

      {!loading && !loadError && items.length > 0 ? (
        <div className="mt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-3">
            <h3 className="min-w-0 text-sm font-semibold">{t("listTitle")}</h3>
            <p className="whitespace-nowrap text-xs text-muted">
              {t("count", { count: items.length })}
            </p>
          </div>
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
            {items.map((pending) => (
              <motion.li
                key={pending.id}
                layout
                className="py-5"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.18, ease: "easeOut" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold leading-snug break-words">
                      {pending.title}
                    </h4>
                    <p className="mt-1 text-sm text-muted">{pending.durationMin} min</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">{t("badge")}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <motion.button
                    type="button"
                    onClick={() => void start(pending)}
                    disabled={busyId !== null}
                    className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                  >
                    {busyId === pending.id ? t("starting") : t("start")}
                  </motion.button>
                  {deleteId !== pending.id ? (
                    <Menu.Root
                      open={menuOpenId === pending.id}
                      onOpenChange={(open) => setMenuOpenId(open ? pending.id : null)}
                    >
                      <Menu.Trigger
                        type="button"
                        className="first-more"
                        disabled={busyId !== null}
                        aria-label={common("moreOptions")}
                      >
                        ⋯
                      </Menu.Trigger>
                      <Menu.Portal>
                        <Menu.Positioner
                          className="first-menu-positioner"
                          sideOffset={8}
                          align="end"
                        >
                          <Menu.Popup className="first-menu">
                            <Menu.Item
                              className="first-menu-item"
                              disabled={busyId !== null}
                              onClick={() => {
                                setMenuOpenId(null);
                                void markDone(pending);
                              }}
                            >
                              {t("done")}
                            </Menu.Item>
                            <Menu.Item
                              className="first-menu-item"
                              disabled={busyId !== null}
                              onClick={() => {
                                setMenuOpenId(null);
                                setDeleteId(pending.id);
                              }}
                            >
                              {t("remove")}
                            </Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.Root>
                  ) : null}
                </div>

                {deleteId === pending.id ? (
                  <div className="mt-3 border-l-2 border-accent pl-4" role="alert">
                    <p className="text-sm leading-6">{t("removeConfirm")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(pending)}
                        disabled={busyId !== null}
                        className="min-h-11 rounded-none bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
                      >
                        {t("yesRemove")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        disabled={busyId !== null}
                        className="min-h-11 rounded-none border border-control px-4 text-sm font-semibold disabled:opacity-60"
                      >
                        {t("no")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}
    </motion.section>
  );
}
