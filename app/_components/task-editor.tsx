"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { HelpTip } from "./help-tip";
import { openDatabase, type RunoDatabase } from "@/lib/db/database";
import {
  archiveTask,
  createTasks,
  createTask,
  listTasks,
  updateTask,
} from "@/lib/db/repository";
import { BLOCK_RANGES, blockForTime, windowPreset, type BlockKey } from "@/lib/domain/schedule";
import type { ClockTime, Weekday } from "@/lib/domain/time";
import type { Task, TaskInput } from "@/lib/domain/types";

const WEEKDAYS = [
  { value: 1, short: "daysShort.mon", full: "daysFull.mon" },
  { value: 2, short: "daysShort.tue", full: "daysFull.tue" },
  { value: 3, short: "daysShort.wed", full: "daysFull.wed" },
  { value: 4, short: "daysShort.thu", full: "daysFull.thu" },
  { value: 5, short: "daysShort.fri", full: "daysFull.fri" },
  { value: 6, short: "daysShort.sat", full: "daysFull.sat" },
  { value: 0, short: "daysShort.sun", full: "daysFull.sun" },
] as const;

const PRIORITY_LABEL = {
  1: "priorityLow",
  2: "priorityMedium",
  3: "priorityHigh",
} as const;

const BLOCKS = [
  { value: "morning", labelKey: "blocks.morning" },
  { value: "afternoon", labelKey: "blocks.afternoon" },
  { value: "night", labelKey: "blocks.night" },
] as const;

const DRAFT_KEY = "runo:task-editor-draft:v1";

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

interface EditorDraft {
  form: FormState;
  categoryMode: "existing" | "new";
  customWindow: boolean;
  newBlocks: BlockKey[];
  newCustom: boolean;
  copiedBlocks: BlockKey[];
  selectedDay: Weekday;
}

function readDraft(): EditorDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<EditorDraft>;
    if (!draft.form || typeof draft.form.title !== "string" || !Array.isArray(draft.form.days)) {
      return null;
    }
    return {
      form: draft.form,
      categoryMode: draft.categoryMode === "new" ? "new" : "existing",
      customWindow: draft.customWindow === true,
      newBlocks: Array.isArray(draft.newBlocks) ? draft.newBlocks : [],
      newCustom: draft.newCustom === true,
      copiedBlocks: Array.isArray(draft.copiedBlocks) ? draft.copiedBlocks : [],
      selectedDay: typeof draft.selectedDay === "number"
        ? draft.selectedDay as Weekday
        : new Date().getDay() as Weekday,
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: EditorDraft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable in private modes; the form still works.
  }
}

function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

function DisclosureChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="task-block-chevron h-4 w-4 shrink-0 text-muted"
    >
      <path
        d="m5 8 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TaskEditor({ initialTaskId }: { initialTaskId?: string | null }) {
  const t = useTranslations("editor");
  const common = useTranslations("common");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryMode, setCategoryMode] = useState<"existing" | "new">("existing");
  const [customWindow, setCustomWindow] = useState(false);
  const [newBlocks, setNewBlocks] = useState<BlockKey[]>([]);
  const [newCustom, setNewCustom] = useState(false);
  const [copiedBlocks, setCopiedBlocks] = useState<BlockKey[]>([]);
  const [duplicateBlock, setDuplicateBlock] = useState<BlockKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Weekday>(
    () => new Date().getDay() as Weekday,
  );
  const openedInitialTask = useRef(false);
  const draftBootstrapped = useRef(false);
  const [draftReady, setDraftReady] = useState(false);
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  const retryBatch = useRef<{ signature: string; ids: string[] } | null>(null);

  useEffect(() => {
    if (!draftReady) return;
    if (!form) {
      clearDraft();
      return;
    }
    writeDraft({ form, categoryMode, customWindow, newBlocks, newCustom, copiedBlocks, selectedDay });
  }, [draftReady, form, categoryMode, customWindow, newBlocks, newCustom, copiedBlocks, selectedDay]);

  useEffect(() => {
    let cancelled = false;
    let db: RunoDatabase | null = null;

    async function load() {
      try {
        db = await openDatabase();
        const list = await listTasks(db, true);
        if (!cancelled) {
          if (!draftBootstrapped.current) {
            draftBootstrapped.current = true;
            if (initialTaskId) {
              clearDraft();
            } else {
              const draft = readDraft();
              if (draft) {
                setForm(draft.form);
                setCategoryMode(draft.categoryMode);
                setCustomWindow(draft.customWindow);
                setNewBlocks(draft.newBlocks);
                setNewCustom(draft.newCustom);
                setCopiedBlocks(draft.copiedBlocks);
                setSelectedDay(draft.selectedDay);
                setNotice(t("notices.draft"));
              }
            }
            setDraftReady(true);
          }
          setTasks(list);
          setLoadError(null);
          if (initialTaskId && !openedInitialTask.current) {
            const target = list.find((task) => task.id === initialTaskId);
            if (target) {
              openedInitialTask.current = true;
              retryBatch.current = null;
              setCategoryMode("existing");
              setCustomWindow(false);
              setNewBlocks([]);
              setNewCustom(false);
              setCopiedBlocks([]);
              setForm(formFromTask(target));
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudieron cargar las tareas", error);
          setLoadError(t("notices.loadError"));
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
  }, [initialTaskId, reloadKey, t]);

  function closeForm() {
    setForm(null);
    setFormError(null);
    setNotice(null);
    clearDraft();
    retryBatch.current = null;
  }

  function startNew() {
    setFormError(null);
    setNotice(null);
    retryBatch.current = null;
    const next = emptyForm();
    next.days = [selectedDay];
    setCategoryMode("existing");
    setCustomWindow(false);
    setNewBlocks([]);
    setNewCustom(false);
    setCopiedBlocks([]);
    setForm(next);
  }

  function startEdit(task: Task) {
    setFormError(null);
    setNotice(null);
    retryBatch.current = null;
    setCategoryMode("existing");
    setCustomWindow(false);
    setNewBlocks([]);
    setNewCustom(false);
    setCopiedBlocks([]);
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

  function chooseNewAny() {
    setNewBlocks([]);
    setNewCustom(false);
    patch({ useWindow: false });
  }

  function toggleNewBlock(block: BlockKey) {
    const next = newBlocks.includes(block)
      ? newBlocks.filter((value) => value !== block)
      : [...newBlocks, block];
    setNewBlocks(next);
    setNewCustom(false);
    if (next.length === 0) {
      patch({ useWindow: false });
      return;
    }
    const first = BLOCK_RANGES[next[0]];
    patch({ useWindow: true, windowStart: first.start, windowEnd: first.end });
  }

  function chooseNewCustom() {
    setNewBlocks([]);
    setNewCustom(true);
    patch({ useWindow: true });
  }

  async function duplicateInto(block: BlockKey) {
    if (!form?.id || duplicateBlock || copiedBlocks.includes(block) || saving) return;
    setDuplicateBlock(block);
    setNotice(null);
    try {
      const db = await openDatabase();
      try {
        const range = BLOCK_RANGES[block];
        const input = toInput({
          ...form,
          useWindow: true,
          windowStart: range.start,
          windowEnd: range.end,
          useFixedTime: false,
        });
        await createTask(db, `task:${newId()}`, input, Date.now());
      } finally {
        db.close();
      }
      setCopiedBlocks((current) => [...current, block]);
      const copyKey = block === "morning"
        ? "notices.copyMorning"
        : block === "afternoon" ? "notices.copyAfternoon" : "notices.copyNight";
      setNotice(t(copyKey));
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("No se pudo duplicar la tarea", error);
      setNotice(t("notices.copyError"));
    } finally {
      setDuplicateBlock(null);
    }
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
        if (form.id) {
          await updateTask(db, form.id, toInput(form), now, `edit:${form.id}:${newId()}`);
        } else {
          if (newBlocks.length > 1 && form.useFixedTime) {
            throw new Error(t("notices.sameTime"));
          }
          let inputs;
          if (newCustom) {
            inputs = [toInput(form)];
          } else if (newBlocks.length > 0) {
            inputs = newBlocks.map((block) => {
              const range = BLOCK_RANGES[block];
              return toInput({
                ...form,
                useWindow: true,
                windowStart: range.start,
                windowEnd: range.end,
              });
            });
          } else {
            inputs = [toInput({ ...form, useWindow: false })];
          }
          const signature = JSON.stringify(inputs);
          const ids = retryBatch.current?.signature === signature
            ? retryBatch.current.ids
            : inputs.map(() => `task:${newId()}`);
          retryBatch.current = { signature, ids };
          await createTasks(db, inputs.map((input, index) => ({ id: ids[index], input })), now);
          setNotice(inputs.length > 1 ? t("notices.tasksCreated", { count: inputs.length }) : t("notices.saved"));
        }
      } finally {
        db.close();
      }
      setForm(null);
      clearDraft();
      retryBatch.current = null;
      if (form.id) setNotice(t("notices.saved"));
      setReloadKey((key) => key + 1);
    } catch {
      setFormError(
        t("notices.saveError"),
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
      setNotice(t("notices.savedApart"));
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("No se pudo archivar", error);
      setNotice(t("notices.archiveError"));
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
    return windowPreset(form.windowStart, form.windowEnd);
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
    patch({
      useWindow: true,
      windowStart: BLOCK_RANGES[block].start,
      windowEnd: BLOCK_RANGES[block].end,
    });
  }
  const dayTasks = active.filter((task) => task.days.includes(selectedDay));
  const unscheduled = active.filter((task) => task.days.length === 0);
  const dayCounts = WEEKDAYS.map((day) => ({
    ...day,
    count: active.filter((task) => task.days.includes(day.value)).length,
  }));
  const selectedDayInfo = WEEKDAYS.find((day) => day.value === selectedDay) ?? WEEKDAYS[0];

  const blocks = ([
    { key: "morning", labelKey: "blocks.morning" },
    { key: "afternoon", labelKey: "blocks.afternoon" },
    { key: "night", labelKey: "blocks.night" },
    { key: "any", labelKey: "blocks.none" },
  ] as const).map((block) => ({
    ...block,
    tasks: dayTasks
      .filter((task) => blockForTime(taskTime(task)) === block.key)
      .sort((a, b) =>
        timeMinutes(taskTime(a)) - timeMinutes(taskTime(b)) || a.title.localeCompare(b.title),
      ),
  }));
  const editingTask = form?.id ? active.find((task) => task.id === form.id) ?? null : null;

  function rememberSection(key: string, open: boolean) {
    setClosedSections((current) => ({ ...current, [key]: !open }));
  }

  function compactRow(task: Task) {
    const time = taskTime(task);
    return (
      <li key={task.id} className="border-b border-line">
        <button
          type="button"
          onClick={() => startEdit(task)}
          className="flex min-h-14 w-full items-start gap-3 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-base font-semibold leading-snug">
              {task.title}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {time ?? t("list.noTime")} · {common("minutes", { count: task.durationMin })}
            </span>
          </span>
          <span aria-hidden className="shrink-0 pt-0.5 text-lg text-muted">›</span>
        </button>
      </li>
    );
  }

  return (
    <section aria-labelledby="tasks-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t("eyebrow")}
          </p>
          <div className="mt-1 flex items-start gap-2">
            <h2 id="tasks-title" className="text-3xl font-semibold tracking-tight">
              {t("title")}
            </h2>
            <HelpTip label={t("helpLabel")}>{t("help")}</HelpTip>
          </div>
        </div>
        {!form ? (
          <button
            type="button"
            onClick={startNew}
            className="max-w-full min-h-11 rounded-none bg-foreground px-4 text-sm font-semibold text-background"
          >
            {t("new")}
          </button>
        ) : null}
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
              {form.id ? t("edit") : t("new")}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60"
            >
              {t("back")}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">{t("name")}</span>
              <input
                required
                value={form.title}
                onChange={(event) => patch({ title: event.target.value })}
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                placeholder={t("namePlaceholder")}
              />
            </label>
            <div className="block">
              <label className="block">
                <span className="text-sm font-medium">{t("type")}</span>
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
                    <option value="__new__">{t("newType")}</option>
                  </select>
                ) : (
                  <input
                    required
                    autoFocus
                    value={form.category}
                    onChange={(event) => patch({ category: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                    placeholder={t("typePlaceholder")}
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
                  {t("chooseType")}
                </button>
              ) : null}
            </div>
            <label className="block">
              <span className="text-sm font-medium">{t("minutes")}</span>
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
              <span className="text-sm font-medium">{t("importance")}</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  patch({ priority: Number(event.target.value) as 1 | 2 | 3 })
                }
                className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
              >
                {[3, 2, 1].map((priority) => (
                  <option key={priority} value={priority}>
                    {t(PRIORITY_LABEL[priority as 1 | 2 | 3])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="flex items-center gap-2 text-sm font-medium">
              {t("days")}
              <HelpTip label={t("daysHelp")}>{t("daysHelp")}</HelpTip>
            </legend>
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
                    <span>{selected ? "✓ " : ""}{t(day.short)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 space-y-4">
            <fieldset>
              <legend className="flex items-center gap-2 text-sm font-medium">
                {t("when")}
                <HelpTip label={form.id ? t("whenHelpEdit") : t("whenHelpNew")}>
                  {form.id ? t("whenHelpEdit") : t("whenHelpNew")}
                </HelpTip>
              </legend>
              {form.id ? (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {([
                      ["any", "anyTime"],
                      ["morning", "morning"],
                      ["afternoon", "afternoon"],
                      ["night", "night"],
                      ["custom", "chooseHours"],
                    ] as const).map(([value, key]) => (
                      <button
                        key={value}
                        type="button"
                        data-on={formBlock() === value}
                        aria-pressed={formBlock() === value}
                        onClick={() => chooseBlock(value)}
                        className="day-toggle justify-center"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                  {formBlock() === "custom" ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-muted">{t("from")}</span>
                        <input
                          type="time"
                          value={form.windowStart}
                          onChange={(event) => patch({ windowStart: event.target.value })}
                          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-muted">{t("to")}</span>
                        <input
                          type="time"
                          value={form.windowEnd}
                          onChange={(event) => patch({ windowEnd: event.target.value })}
                          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                        />
                      </label>
                    </div>
                  ) : null}
                  {form.useWindow ? (
                    <p className="mt-2 text-xs tabular-nums text-muted">
                      {t("range", { from: form.windowStart, to: form.windowEnd })}
                    </p>
                  ) : null}
                  <div className="mt-4 border-t border-line pt-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{t("copyTitle")}</p>
                      <HelpTip label={t("copyHelp")}>{t("copyHelp")}</HelpTip>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {BLOCKS.map((block) => (
                        <button
                          key={block.value}
                          type="button"
                          disabled={
                            duplicateBlock !== null ||
                            copiedBlocks.includes(block.value) ||
                            formBlock() === block.value
                          }
                          onClick={() => void duplicateInto(block.value)}
                          className="day-toggle disabled:opacity-40"
                        >
                          + {t(block.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <button
                      type="button"
                      data-on={newBlocks.length === 0 && !newCustom}
                      aria-pressed={newBlocks.length === 0 && !newCustom}
                      onClick={chooseNewAny}
                      className="day-toggle justify-center"
                    >
                      {t("anyTime")}
                    </button>
                    {BLOCKS.map((block) => (
                      <button
                        key={block.value}
                        type="button"
                        data-on={newBlocks.includes(block.value)}
                        aria-pressed={newBlocks.includes(block.value)}
                        onClick={() => toggleNewBlock(block.value)}
                        className="day-toggle justify-center"
                      >
                        {t(block.labelKey)}
                      </button>
                    ))}
                    <button
                      type="button"
                      data-on={newCustom}
                      aria-pressed={newCustom}
                      onClick={chooseNewCustom}
                      className="day-toggle justify-center"
                    >
                      {t("chooseHours")}
                    </button>
                  </div>
                  {newCustom ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm text-muted">{t("from")}</span>
                        <input
                          type="time"
                          value={form.windowStart}
                          onChange={(event) => patch({ windowStart: event.target.value })}
                          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-muted">{t("to")}</span>
                        <input
                          type="time"
                          value={form.windowEnd}
                          onChange={(event) => patch({ windowEnd: event.target.value })}
                          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                        />
                      </label>
                    </div>
                  ) : null}
                  {newCustom && form.useWindow ? (
                    <p className="mt-2 text-xs tabular-nums text-muted">
                      {t("range", { from: form.windowStart, to: form.windowEnd })}
                    </p>
                  ) : null}
                </>
              )}
            </fieldset>

            <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.useFixedTime}
                onChange={(event) => patch({ useFixedTime: event.target.checked })}
                className="h-6 w-6"
              />
              {t("exactTime")}
            </label>
            {form.useFixedTime ? (
              <label className="block max-w-40">
                <span className="text-sm text-muted">{t("hours")}</span>
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
              {t("firstStep")}
            </label>
            {form.useShortStep ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="block">
                  <span className="text-sm text-muted">{t("firstStepWhat")}</span>
                  <input
                    value={form.shortStepTitle}
                    onChange={(event) => patch({ shortStepTitle: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
                    placeholder={t("firstStepPlaceholder")}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-muted">{t("minutes")}</span>
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
              {saving ? t("saving") : t("save")}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="min-h-11 rounded-none border border-control px-6 text-sm font-semibold disabled:opacity-60"
            >
              {t("cancel")}
            </button>
            {editingTask ? (
              <button
                type="button"
                onClick={() => {
                  closeForm();
                  void archive(editingTask);
                }}
                disabled={saving}
                className="min-h-11 text-sm font-semibold text-muted underline underline-offset-4 disabled:opacity-60"
              >
                {t("saveApart")}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {form ? null : loadError ? (
        <div className="mt-6 border-l-2 border-accent pl-4" role="alert">
          <p className="text-sm leading-6">{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4"
          >
            {common("retry")}
          </button>
        </div>
      ) : tasks === null ? (
        <p className="mt-6 text-sm text-muted">{t("list.loading")}</p>
      ) : (
        <>
          <div className="mt-5" role="group" aria-label={t("list.filterAria")}>
            <div className="days-strip">
              <div className="days-strip-track">
                {dayCounts.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    data-on={selectedDay === day.value}
                    aria-pressed={selectedDay === day.value}
                    aria-controls="day-tasks"
                    onClick={() => setSelectedDay(day.value)}
                    className="day-toggle min-h-14 px-1 py-2 text-xs"
                  >
                    <span className="block">{t(day.short)}</span>
                    <span className="mt-1 block tabular-nums opacity-70">{day.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <h3 id="day-tasks-title" className="text-2xl font-semibold tracking-tight">
              {t(selectedDayInfo.full)}
            </h3>
            <p className="text-sm text-muted">
              {t("list.count", { count: dayTasks.length })}
            </p>
          </div>

          <div id="day-tasks" role="region" aria-labelledby="day-tasks-title">
          {dayTasks.length === 0 ? (
            <div className="mt-4 border-l-2 border-line pl-4">
              <p className="text-sm leading-6 text-muted">{t("list.noTasks")}</p>
              <button
                type="button"
                onClick={startNew}
                className="mt-2 min-h-11 text-sm font-semibold underline underline-offset-4"
              >
                {t("list.addFor", { day: t(selectedDayInfo.full) })}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              {blocks.map((block) =>
                block.tasks.length > 0 ? (
                  <details
                    key={block.key}
                    className="task-block task-plain mt-5"
                    open={!closedSections[block.key]}
                    onToggle={(event) => rememberSection(block.key, event.currentTarget.open)}
                  >
                    <summary className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-x-2 border-b-2 border-control pb-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        {t(block.labelKey)}
                      </span>
                      <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                        {block.tasks.length}
                        <DisclosureChevron />
                      </span>
                    </summary>
                    <ul className="task-list">{block.tasks.map((task) => compactRow(task))}</ul>
                  </details>
                ) : null,
              )}
            </div>
          )}
          </div>

          {unscheduled.length > 0 ? (
            <details
              className="task-block task-plain mt-8"
              open={!closedSections.unscheduled}
              onToggle={(event) => rememberSection("unscheduled", event.currentTarget.open)}
            >
              <summary className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-x-2 border-b border-line pb-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("list.unscheduled")}
                </span>
                <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                  {unscheduled.length}
                  <DisclosureChevron />
                </span>
              </summary>
              <ul className="task-list">{unscheduled.map((task) => compactRow(task))}</ul>
            </details>
          ) : null}

          {archived.length > 0 ? (
            <details
              className="task-block task-plain mt-8"
              open={!closedSections.archived}
              onToggle={(event) => rememberSection("archived", event.currentTarget.open)}
            >
              <summary className="flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-x-2 border-b border-line pb-2">
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  {t("list.archived")}
                </span>
                <span className="flex items-center gap-2 text-xs tabular-nums text-muted">
                  {archived.length}
                  <DisclosureChevron />
                </span>
              </summary>
              <ul className="task-list mt-3 space-y-2">
                {archived.map((task) => (
                  <li key={task.id} className="border-b border-line py-3 text-sm text-muted">
                    {task.title} · {t("list.archivedSuffix")}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}
