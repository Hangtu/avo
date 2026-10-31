"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  archiveTask,
  createTask,
  listTasks,
  updateTask,
} from "@/lib/db/repository";
import type { ClockTime, Weekday } from "@/lib/domain/time";
import type { Task, TaskInput } from "@/lib/domain/types";

const WEEKDAYS: Array<{ value: Weekday; label: string; full: string }> = [
  { value: 1, label: "Lun", full: "Lunes" },
  { value: 2, label: "Mar", full: "Martes" },
  { value: 3, label: "Mié", full: "Miércoles" },
  { value: 4, label: "Jue", full: "Jueves" },
  { value: 5, label: "Vie", full: "Viernes" },
  { value: 6, label: "Sáb", full: "Sábado" },
  { value: 0, label: "Dom", full: "Domingo" },
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

function taskTime(task: Task): string | null {
  return task.fixedTime ?? task.window?.start ?? null;
}

function timeMinutes(time: string | null): number {
  if (!time) return 24 * 60;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function taskBlock(task: Task): "morning" | "afternoon" | "night" | "any" {
  const time = taskTime(task);
  if (!time) return "any";
  const hour = Number(time.slice(0, 2));
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}

export function TaskEditor({ initialTaskId }: { initialTaskId?: string | null }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [customWindow, setCustomWindow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Weekday>(
    () => new Date().getDay() as Weekday,
  );
  const openedInitialTask = useRef(false);

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
          if (initialTaskId && !openedInitialTask.current) {
            const target = list.find((task) => task.id === initialTaskId);
            if (target) {
              openedInitialTask.current = true;
              setCategoryMode("existing");
              setCustomWindow(false);
              setForm(formFromTask(target));
            }
          }
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
  }, [initialTaskId, reloadKey]);

  function startNew() {
    setFormError(null);
    setNotice(null);
    const next = emptyForm();
    next.days = [selectedDay];
    setCategoryMode("existing");
    setCustomWindow(false);
    setForm(next);
  }

  function startEdit(task: Task) {
    setFormError(null);
    setNotice(null);
    setCategoryMode("existing");
    setCustomWindow(false);
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
  const categories = Array.from(
    new Set((tasks ?? []).map((task) => task.category.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  function formBlock(): "any" | "morning" | "afternoon" | "night" | "custom" {
    if (!form?.useWindow) return "any";
    if (customWindow) return "custom";
    const { windowStart: start, windowEnd: end } = form;
    if (start < end && start >= "05:00" && end <= "12:00") return "morning";
    if (start < end && start >= "12:00" && end <= "19:00") return "afternoon";
    if (start < end && start >= "19:00" && end <= "23:59") return "night";
    if (start < end && start < "05:00" && end <= "05:00") return "night";
    return "custom";
  }

  function chooseBlock(block: "any" | "morning" | "afternoon" | "night" | "custom") {
    if (!form) return;
    if (block === "any") {
      setCustomWindow(false);
      patch({ useWindow: false });
      return;
    }
    if (block === "custom") {
      setCustomWindow(true);
      patch({ useWindow: true });
      return;
    }
    setCustomWindow(false);
    const ranges = {
      morning: { start: "05:00", end: "12:00" },
      afternoon: { start: "12:00", end: "19:00" },
      night: { start: "19:00", end: "23:59" },
    } as const;
    patch({
      useWindow: true,
      windowStart: ranges[block].start,
      windowEnd: ranges[block].end,
    });
  }
  const dayTasks = active.filter((task) => task.days.includes(selectedDay));
  const unscheduled = active.filter((task) => task.days.length === 0);
  const dayCounts = WEEKDAYS.map((day) => ({
    ...day,
    count: active.filter((task) => task.days.includes(day.value)).length,
  }));
  const selectedDayInfo = WEEKDAYS.find((day) => day.value === selectedDay) ?? WEEKDAYS[0];

  const blocks = [
    { key: "morning", label: "Mañana" },
    { key: "afternoon", label: "Tarde" },
    { key: "night", label: "Noche" },
    { key: "any", label: "Sin hora" },
  ].map((block) => ({
    ...block,
    tasks: dayTasks
      .filter((task) => taskBlock(task) === block.key)
      .sort((a, b) =>
        timeMinutes(taskTime(a)) - timeMinutes(taskTime(b)) || a.title.localeCompare(b.title),
      ),
  }));
  const editingTask = form?.id ? active.find((task) => task.id === form.id) ?? null : null;

  function compactRow(task: Task) {
    const time = taskTime(task);
    return (
      <li key={task.id} className="border-b border-line">
        <button
          type="button"
          onClick={() => startEdit(task)}
          className="flex min-h-14 w-full items-center gap-3 py-3 text-left"
        >
          <span className="w-14 shrink-0 text-xs tabular-nums text-muted">
            {time ?? "—"}
          </span>
          <span className="min-w-0 flex-1 truncate text-base font-semibold">
            {task.title}
          </span>
          <span className="shrink-0 text-xs text-muted">{task.durationMin} min</span>
          <span aria-hidden className="text-lg text-muted">›</span>
        </button>
      </li>
    );
  }

  return (
    <section aria-labelledby="tasks-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Configuración
          </p>
          <h2 id="tasks-title" className="mt-1 text-3xl font-semibold tracking-tight">
            Tus tareas
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            Elige un día y toca una tarea para editarla.
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
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-semibold">
              {form.id ? "Editar tarea" : "Nueva tarea"}
            </h3>
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={saving}
              className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60"
            >
              ← Volver
            </button>
          </div>

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
            <div className="block">
              <label className="block">
                <span className="text-sm font-medium">Categoría</span>
                {categoryMode === "existing" ? (
                  <select
                    value={form.category}
                    onChange={(event) => {
                      if (event.target.value === "__new__") {
                        setCategoryMode("new");
                        patch({ category: "" });
                      } else {
                        patch({ category: event.target.value });
                      }
                    }}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="__new__">+ Nueva categoría…</option>
                  </select>
                ) : (
                  <input
                    required
                    autoFocus
                    value={form.category}
                    onChange={(event) => patch({ category: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                    placeholder="Ej. casa, salud, trabajo"
                  />
                )}
              </label>
              {categoryMode === "new" ? (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryMode("existing");
                    patch({ category: categories[0] ?? "personal" });
                  }}
                  className="mt-2 min-h-11 text-sm font-semibold text-muted underline underline-offset-4"
                >
                  Elegir una categoría existente
                </button>
              ) : null}
            </div>
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
              {WEEKDAYS.map((day) => {
                const selected = form.days.includes(day.value);
                return (
                  <label
                    key={day.value}
                    className="day-toggle"
                    data-on={selected}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleDay(day.value)}
                      className="sr-only"
                    />
                    <span>{selected ? "✓ " : ""}{day.label}</span>
                  </label>
                );
              })}
            </div>
            {form.days.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Sin días: queda en el Mazo y no se propone automáticamente.
              </p>
            ) : null}
          </fieldset>

          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">¿Cuándo?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ["any", "Sin bloque"],
                  ["morning", "Mañana"],
                  ["afternoon", "Tarde"],
                  ["night", "Noche"],
                  ["custom", "Personalizado"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    data-on={formBlock() === value}
                    aria-pressed={formBlock() === value}
                    onClick={() => chooseBlock(value)}
                    className="day-toggle justify-center"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {formBlock() === "custom" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              <p className="mt-2 text-sm leading-6 text-muted">
                El bloque es opcional; si necesitas una hora exacta, actívala abajo.
              </p>
            </fieldset>

            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useFixedTime}
                onChange={(event) => patch({ useFixedTime: event.target.checked })}
                className="h-6 w-6"
              />
              Hora exacta
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

            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useShortStep}
                onChange={(event) => patch({ useShortStep: event.target.checked })}
                className="h-6 w-6"
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
            {editingTask ? (
              <button
                type="button"
                onClick={() => {
                  setForm(null);
                  void archive(editingTask);
                }}
                disabled={saving}
                className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60"
              >
                Archivar tarea
              </button>
            ) : null}
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
          <div className="mt-5" role="tablist" aria-label="Días de la semana">
            <div className="grid grid-cols-7 gap-1">
              {dayCounts.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  role="tab"
                  aria-selected={selectedDay === day.value}
                  onClick={() => setSelectedDay(day.value)}
                  className={`min-h-14 min-w-0 rounded-none border px-1 py-2 text-xs font-semibold ${
                    selectedDay === day.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-control bg-background text-foreground"
                  }`}
                >
                  <span className="block">{day.label}</span>
                  <span className="mt-1 block tabular-nums opacity-70">{day.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <h3 className="text-2xl font-semibold tracking-tight">{selectedDayInfo.full}</h3>
            <p className="text-sm text-muted">
              {dayTasks.length} {dayTasks.length === 1 ? "tarea" : "tareas"}
            </p>
          </div>

          {dayTasks.length === 0 ? (
            <div className="mt-4 border-l-2 border-line pl-4">
              <p className="text-sm leading-6 text-muted">No tienes tareas este día.</p>
              <button
                type="button"
                onClick={startNew}
                className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4"
              >
                Agregar tarea para {selectedDayInfo.full.toLowerCase()}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              {blocks.map((block) =>
                block.tasks.length > 0 ? (
                  <section key={block.key} className="task-plain mt-5" aria-label={block.label}>
                    <div className="flex items-baseline justify-between border-b-2 border-control pb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {block.label}
                      </h4>
                      <span className="text-xs tabular-nums text-muted">{block.tasks.length}</span>
                    </div>
                    <ul className="task-list">{block.tasks.map((task) => compactRow(task))}</ul>
                  </section>
                ) : null,
              )}
            </div>
          )}

          {unscheduled.length > 0 ? (
            <section className="task-plain mt-8" aria-labelledby="unscheduled-title">
              <div className="flex items-baseline justify-between border-b border-line pb-2">
                <h3 id="unscheduled-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Sin programar
                </h3>
                <span className="text-xs tabular-nums text-muted">{unscheduled.length}</span>
              </div>
              <ul className="task-list">{unscheduled.map((task) => compactRow(task))}</ul>
            </section>
          ) : null}

          {archived.length > 0 ? (
            <section className="task-plain mt-8" aria-labelledby="archived-title">
              <h3 id="archived-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                Archivadas
              </h3>
              <ul className="task-list mt-3 space-y-2">
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
