"use client";

import { useState, type FormEvent } from "react";

export function QuickTaskForm({
  busy = false,
  autoFocus = false,
  onStart,
  onCancel,
}: {
  busy?: boolean;
  autoFocus?: boolean;
  onStart: (title: string, durationMin: number) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [formError, setFormError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const value = Number(minutes);
    if (!cleanTitle) {
      setFormError("Escribe qué vas a hacer.");
      return;
    }
    if (!Number.isSafeInteger(value) || value < 1) {
      setFormError("Usa un número entero de minutos mayor que cero.");
      return;
    }
    setFormError(null);
    void onStart(cleanTitle, value);
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <label className="block">
        <span className="text-sm font-medium">¿Qué vas a hacer?</span>
        <input
          required
          autoFocus={autoFocus}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
          placeholder="Ej. Pagar las cuentas del banco"
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
      <div className="flex flex-wrap gap-2" aria-label="Duraciones rápidas">
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
        <p className="border-l-2 border-accent pl-4 text-sm" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
        >
          {busy ? "Empezando…" : "Empezar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
