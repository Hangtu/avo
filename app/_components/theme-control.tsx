"use client";

import type { ThemeMode } from "@/lib/domain/theme";

export function ThemeControl({
  mode,
  ready,
  busy,
  error,
  onChange,
}: {
  mode: ThemeMode;
  ready: boolean;
  busy: boolean;
  error: string | null;
  onChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex min-h-11 flex-wrap items-center gap-2 text-sm text-muted">
        <span>Modo</span>
        <select
          value={mode}
          disabled={!ready || busy}
          onChange={(event) => onChange(event.target.value as ThemeMode)}
          className="min-h-11 max-w-full border border-control bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="auto">Automático</option>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
      </label>
      {error ? (
        <span role="status" className="text-xs leading-5">
          {error}
        </span>
      ) : null}
    </div>
  );
}
