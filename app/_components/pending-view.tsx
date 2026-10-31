"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { openDatabase } from "@/lib/db/database";
import {
  completePendingDirect,
  createPending,
  deletePending,
  listPendings,
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
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
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
        setLoadError("No pude abrir tus pendientes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  useEffect(() => {
    if (focusComposer > 0) {
      titleRef.current?.focus();
    }
  }, [focusComposer]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addingRef.current) return;
    addingRef.current = true;
    const cleanTitle = title.trim();
    const value = Number(minutes);
    if (!cleanTitle) {
      addingRef.current = false;
      setFormError("Escribe qué quieres hacer.");
      return;
    }
    if (!Number.isSafeInteger(value) || value < 1) {
      addingRef.current = false;
      setFormError("Escribe cuántos minutos.");
      return;
    }
    setFormError(null);
    setAdding(true);
    setActionError(null);
    setStatus(null);
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
        setStatus("Listo, lo agregué.");
        titleRef.current?.focus();
      } finally {
        db.close();
      }
    } catch (error) {
      console.error("No se pudo agregar el pendiente", error);
      setFormError(error instanceof Error ? error.message : "No pude guardarlo.");
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
    setStatus(null);
    try {
      await onStart(pending);
    } catch (error) {
      console.error("No se pudo empezar el pendiente", error);
      setActionError(error instanceof Error ? error.message : "No pude empezar el pendiente.");
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
    setStatus(null);
    try {
      const db = await openDatabase();
      try {
        await completePendingDirect(db, pending.id, Date.now());
      } finally {
        db.close();
      }
      setItems((previous) => previous.filter((item) => item.id !== pending.id));
      setStatus("Listo, ya no está en la lista.");
    } catch (error) {
      console.error("No se pudo completar el pendiente", error);
      setActionError(error instanceof Error ? error.message : "No pude marcarlo como hecho.");
    } finally {
      actionBusyRef.current = false;
      setBusyId(null);
    }
  }

  async function remove(pending: Pending) {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setBusyId(pending.id);
    setActionError(null);
    setStatus(null);
    try {
      const db = await openDatabase();
      try {
        await deletePending(db, pending.id, Date.now());
      } finally {
        db.close();
      }
      setItems((previous) => previous.filter((item) => item.id !== pending.id));
      setDeleteId(null);
      setStatus("Listo, lo quité.");
    } catch (error) {
      console.error("No se pudo quitar el pendiente", error);
      setActionError(error instanceof Error ? error.message : "No pude quitarlo.");
    } finally {
      actionBusyRef.current = false;
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="pending-title" className="border-y border-line py-8 sm:py-10">
      <p className="pending-eyebrow text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Pendientes
      </p>
      <div className="mt-3 flex items-start gap-2">
        <h2 id="pending-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Lo que quieres hacer después.
        </h2>
        <HelpTip label="Para qué sirven los pendientes">
          Aquí guardas cosas para hacer después. Se quedan hasta que las termines.
        </HelpTip>
      </div>

      {message && !status ? (
        <p role="status" className="mt-4 border-l-2 border-accent pl-4 text-sm leading-6">
          {message}
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-7 border-y border-line py-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <label className="block min-w-0">
            <span className="text-sm font-medium">¿Qué quieres hacer?</span>
            <input
              ref={titleRef}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
              placeholder="Ej. Pagar las cuentas"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Minutos</span>
            <input
              required
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Minutos rápidos">
          {[5, 15, 25, 30].map((value) => (
            <button
              key={value}
              type="button"
              data-on={Number(minutes) === value}
              aria-pressed={Number(minutes) === value}
              onClick={() => setMinutes(String(value))}
              className="day-toggle justify-center"
            >
              {value} min
            </button>
          ))}
        </div>
        {formError ? (
          <p className="mt-3 border-l-2 border-accent pl-4 text-sm" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={adding}
          className="mt-4 min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {adding ? "Guardando…" : "Agregar"}
        </button>
      </form>

      {status ? (
        <p role="status" className="mt-4 border-l-2 border-accent pl-4 text-sm">
          {status}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="mt-4 border-l-2 border-accent pl-4 text-sm leading-6">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="mt-7 text-sm text-muted">
          Cargando tus pendientes…
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
          No tienes pendientes. Agrega algo que no quieras olvidar.
        </p>
      ) : null}

      {!loading && !loadError && items.length > 0 ? (
        <div className="mt-7">
          <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
            <h3 className="text-sm font-semibold">Tus pendientes</h3>
            <p className="text-xs text-muted">
              {items.length} {items.length === 1 ? "pendiente" : "pendientes"}
            </p>
          </div>
          <ul className="divide-y divide-line">
            {items.map((pending) => (
              <li key={pending.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold leading-snug break-words">
                      {pending.title}
                    </h4>
                    <p className="mt-1 text-sm text-muted">{pending.durationMin} min</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.12em] text-muted">Pendiente</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void start(pending)}
                    disabled={busyId !== null}
                    className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
                  >
                    {busyId === pending.id ? "Abriendo…" : "Empezar ▶️"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void markDone(pending)}
                    disabled={busyId !== null}
                    className="min-h-11 rounded-none border border-control px-4 text-sm font-semibold disabled:opacity-60"
                  >
                    Ya lo hice ✅
                  </button>
                  {deleteId !== pending.id ? (
                    <button
                      type="button"
                      onClick={() => setDeleteId(pending.id)}
                      disabled={busyId !== null}
                      className="min-h-11 px-2 text-sm font-semibold text-muted underline-offset-4 hover:underline disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                {deleteId === pending.id ? (
                  <div className="mt-3 border-l-2 border-accent pl-4" role="alert">
                    <p className="text-sm leading-6">¿Lo quito de la lista?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void remove(pending)}
                        disabled={busyId !== null}
                        className="min-h-11 rounded-none bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
                      >
                        Sí, quitar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(null)}
                        disabled={busyId !== null}
                        className="min-h-11 rounded-none border border-control px-4 text-sm font-semibold disabled:opacity-60"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}