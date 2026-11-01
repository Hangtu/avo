"use client";

import { useRef, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { motion, useReducedMotion } from "motion/react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("quick");
  const common = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("25");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  function clearError(key: string) {
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const value = Number(minutes);
    const next: Record<string, string> = {};
    if (!cleanTitle) next.title = t("nameError");
    if (!Number.isSafeInteger(value) || value < 1) next.minutes = t("minutesError");
    if (Object.keys(next).length > 0) {
      setErrors(next);
      (next.title ? titleRef : minutesRef).current?.focus();
      return;
    }
    setErrors({});
    void onStart(cleanTitle, value);
  }

  return (
    <Form
      noValidate
      errors={errors}
      onSubmit={submit}
      className="mt-3 space-y-3"
    >
      <Field.Root name="title" className="form-field">
        <Field.Label className="form-label">{t("what")}</Field.Label>
        <Field.Control
          ref={titleRef}
          autoFocus={autoFocus}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            clearError("title");
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
            clearError("minutes");
          }}
          className="mt-1 min-h-11 w-full rounded-none border border-control bg-background px-3 text-base"
        />
        <Field.Error className="form-error" />
      </Field.Root>

      <ToggleGroup
        value={[minutes]}
        onValueChange={(values) => {
          const value = values[0];
          if (!value) return;
          setMinutes(value);
          clearError("minutes");
        }}
        className="flex flex-wrap gap-2"
        aria-label={t("minutesAria")}
      >
        {[5, 15, 25, 30].map((value) => (
          <Toggle
            key={value}
            value={String(value)}
            className="day-toggle justify-center"
          >
            {common("minutes", { count: value })}
          </Toggle>
        ))}
      </ToggleGroup>

      <div className="flex flex-col gap-2 sm:flex-row">
        <motion.button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-none bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-60"
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          transition={{ duration: 0.12 }}
        >
          {busy ? t("starting") : t("start")}
        </motion.button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-none border border-control px-5 text-sm font-semibold disabled:opacity-60"
        >
          {t("cancel")}
        </button>
      </div>
    </Form>
  );
}
