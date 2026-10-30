"use client";

import { useEffect, useState, type FormEvent } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  archiveTask,
  createTask,
  listTasks,
  updateTask,
} from "@/lib/db/repository";
import type { ClockTime, Weekday } from "@/lib/domain/time";
import type { Task, TaskInput } from "@/lib/domain/types";

const WEEKDAYS: Array<{ value: Weekday; label: string }> = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

const PRIORITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Baja",
  2: "Media",
  3: "Alta",
};

interface FormState {
  id: string | null;
  title: string;
  category: string;
  durationMin: string;
  days: Weekday[];
  priority: 1 | 2 | 3;
  useWindow: boolean;
  windowStart: string;
  windowEnd: string;
  useFixedTime: boolean;
  fixedTime: string;
  useShortStep: boolean;
  shortStepTitle: string;
  shortStepDuration: string;
}

function emptyForm(): FormState {
  return {
    id: null,
    title: "",
    category: "personal",
    durationMin: "10",
    days: [],
    priority: 2,
    useWindow: false,
    windowStart: "06:00",
    windowEnd: "12:00",
    useFixedTime: false,
    fixedTime: "18:00",
    useShortStep: false,
    shortStepTitle: "",
    shortStepDuration: "1",
  };
}

function formFromTask(task: Task): FormState {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    durationMin: String(task.durationMin),
    days: [...task.days],
    priority: task.priority,
    useWindow: task.window !== undefined,
    windowStart: task.window?.start ?? "06:00",
    windowEnd: task.window?.end ?? "12:00",
    useFixedTime: task.fixedTime !== undefined,
    fixedTime: task.fixedTime ?? "18:00",
    useShortStep: task.shortStep !== undefined,
    shortStepTitle: task.shortStep?.title ?? "",
    shortStepDuration: String(task.shortStep?.durationMin ?? 1),
  };
}

function toInput(form: FormState): TaskInput {
  const input: TaskInput = {
    title: form.title,
    category: form.category,
    durationMin: Number(form.durationMin),
    days: [...form.days].sort((a, b) => a - b),
    priority: form.priority,
  };
  if (form.useWindow) {
    input.window = {
      start: form.windowStart as ClockTime,
      end: form.windowEnd as ClockTime,
    };
  }
  if (form.useFixedTime) input.fixedTime = form.fixedTime as ClockTime;
  if (form.useShortStep) {
    input.shortStep = {
      title: form.shortStepTitle,
      durationMin: Number(form.shortStepDuration),
    };
  }
  return input;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function daysLabel(days: Weekday[]): string {
  if (days.length === 0) return "Sin programar";
  return WEEKDAYS.filter((day) => days.includes(day.value))
    .map((day) => day.label)
    .join(" · ");
}

export function TaskEditor() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let db: RunoDatabase | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const list = await listTasks(db, true);
        if (!cancelled) {
          setTasks(list);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las tareas", error);
          setLoadError("No se pudieron cargar tus tareas.");
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
  }, [reloadKey]);

  function startNew() {
    setFormError(null);
    setNotice(null);
    setForm(emptyForm());
  }

  function startEdit(task: Task) {
    setFormError(null);
    setNotice(null);
    setForm(formFromTask(task));
  }

  function patch(changes: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...changes } : current));
  }

  function toggleDay(day: Weekday) {
    setForm((current) => {
      if (!current) return current;
      const days = current.days.includes(day)
        ? current.days.filter((value) => value !== day)
        : [...current.days, day];
      return { ...current, days };
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const now = Date.now();
        const input = toInput(form);
        if (form.id) {
          await updateTask(db, form.id, input, now, `edit:${form.id}:${newId()}`);
        } else {
          await createTask(db, `task:${newId()}`, input, now);
        }
      } finally {
        db.close();
      }
      setForm(null);
      setNotice("Guardada.");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo guardar la tarea.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archive(task: Task) {
    if (archivingId) return;
    setArchivingId(task.id);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        await archiveTask(db, task.id, Date.now());
      } finally {
        db.close();
      }
      setArchiveId(null);
      setNotice("Archivada.");
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("No se pudo archivar", error);
      setNotice("No se pudo archivar la tarea.");
    } finally {
      setArchivingId(null);
    }
  }

  const active = tasks?.filter((task) => task.archivedAt === null) ?? [];
  const archived = tasks?.filter((task) => task.archivedAt !== null) ?? [];

  return (
    <section aria-labelledby="tasks-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Configuración
          </p>
          <h2 id="tasks-title" className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tus tareas
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Agrega, edita o archiva cualquier día. Las tareas sin días quedan en el Mazo,
            pero no entran solas en una franja.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background"
        >
          Nueva tarea
        </button>
      </div>

      {notice ? (
        <p className="mt-4 border-l-2 border-line pl-4 text-sm" role="status">
          {notice}
        </p>
      ) : null}

      {form ? (
        <form
          onSubmit={save}
          className="mt-5 border-y border-line py-6"
        >
          <h3 className="text-xl font-semibold">
            {form.id ? "Editar tarea" : "Nueva tarea"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Nombre</span>
              <input
                required
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                placeholder="Ej. Tomar creatina"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Categoría</span>
              <input
                required
                value={form.category}
                onChange={(event) => patch({ category: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                placeholder="personal"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Duración (min)</span>
              <input
                required
                type="number"
                min={1}
                step={1}
                value={form.durationMin}
                onChange={(event) => patch({ durationMin: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Prioridad</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  patch({ priority: Number(event.target.value) as 1 | 2 | 3 })
                }
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
              >
                {[3, 2, 1].map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABEL[priority as 1 | 2 | 3]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Días</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={form.days.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                  className={`min-h-11 rounded-none border border-control px-4 text-sm font-semibold ${
                    form.days.includes(day.value)
                      ? "border-foreground bg-foreground text-background"
                      : "border-control bg-background"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {form.days.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Sin días: queda en el Mazo y no se propone automáticamente.
              </p>
            ) : null}
          </fieldset>

          <div className="mt-5 space-y-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useWindow}
                onChange={(event) => patch({ useWindow: event.target.checked })}
                className="h-5 w-5"
              />
              Usar franja horaria
            </label>
            {form.useWindow ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-muted">Desde</span>
                  <input
                    type="time"
                    value={form.windowStart}
                    onChange={(event) => patch({ windowStart: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-muted">Hasta</span>
                  <input
                    type="time"
                    value={form.windowEnd}
                    onChange={(event) => patch({ windowEnd: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                  />
                </label>
              </div>
            ) : null}

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useFixedTime}
                onChange={(event) => patch({ useFixedTime: event.target.checked })}
                className="h-5 w-5"
              />
              Hora fija
            </label>
            {form.useFixedTime ? (
              <label className="block max-w-40">
                <span className="text-sm text-muted">Hora</span>
                <input
                  type="time"
                  value={form.fixedTime}
                  onChange={(event) => patch({ fixedTime: event.target.value })}
                  className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                />
              </label>
            ) : null}

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useShortStep}
                onChange={(event) => patch({ useShortStep: event.target.checked })}
                className="h-5 w-5"
              />
              Primer paso corto
            </label>
            {form.useShortStep ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="block">
                  <span className="text-sm text-muted">Acción concreta</span>
                  <input
                    value={form.shortStepTitle}
                    onChange={(event) => patch({ shortStepTitle: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                    placeholder="Ej. Preparar el cepillo"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-muted">Minutos</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.shortStepDuration}
                    onChange={(event) => patch({ shortStepDuration: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                  />
                </label>
              </div>
            ) : null}
          </div>

          {formError ? (
            <p className="mt-4 border-l-2 border-accent pl-4 text-sm" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-none bg-foreground px-6 text-sm font-semibold text-background disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={saving}
              className="min-h-11 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {loadError ? (
        <div className="mt-6 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            Reintentar
          </button>
        </div>
      ) : tasks === null ? (
        <p className="mt-6 text-sm text-muted">Cargando tareas…</p>
      ) : (
        <>
          <ul className="mt-4 border-t border-line">
            {active.map((task) => (
              <li
                key={task.id}
                className="border-b border-line py-5"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {daysLabel(task.days)} · {task.durationMin} min ·{" "}
                      {PRIORITY_LABEL[task.priority]} · {task.category}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {task.window
                        ? `Franja ${task.window.start}–${task.window.end}`
                        : "Sin franja horaria"}
                      {task.fixedTime ? ` · Hora fija ${task.fixedTime}` : ""}
                      {task.shortStep
                        ? ` · Paso: ${task.shortStep.title} (${task.shortStep.durationMin} min)`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 sm:justify-self-end">
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="min-h-11 text-sm font-semibold underline underline-offset-4"
                    >
                      Editar
                    </button>
                    {archiveId === task.id ? (
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">¿Archivar?</span>
                        <button
                          type="button"
                          onClick={() => void archive(task)}
                          disabled={archivingId === task.id}
                          className="min-h-11 rounded-none bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-60"
                        >
                          {archivingId === task.id ? "Archivando…" : "Sí"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchiveId(null)}
                          className="min-h-11 text-sm font-semibold underline underline-offset-4"
                        >
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setArchiveId(task.id)}
                        className="min-h-11 text-sm font-semibold underline underline-offset-4"
                      >
                        Archivar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {active.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No hay tareas activas. Crea la primera.</p>
          ) : null}

          {archived.length > 0 ? (
            <section className="mt-8" aria-labelledby="archived-title">
              <h3 id="archived-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                Archivadas
              </h3>
              <ul className="mt-3 space-y-2">
                {archived.map((task) => (
                  <li key={task.id} className="border-b border-line py-3 text-sm text-muted">
                    {task.title} · archivada
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
