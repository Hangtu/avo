# Forms and Validation

> **Read when:** forms/submissions exist.
> **Scope:** native forms for simple flows; React Hook Form/Base UI for selected complex interactions. Translation examples below require i18n; otherwise map safe codes to approved monolingual copy. Preserve equivalent existing form/action tooling.
> **Related:** [server-actions.md](../backend/server-actions.md), [accessibility.md](../quality/accessibility.md), [i18n.md](../discoverability/i18n.md), [error-handling.md](error-handling.md).

## Choose the smallest suitable pattern

| Form type | Pattern |
|---|---|
| **Complex interactive form** (dependent fields, dynamic arrays, rich validation/state) | React Hook Form + `zodResolver(schema)` + shadcn `Field` components → calls a Server Action with a typed object inside `startTransition` |
| **Trivial form** (one input or one button: newsletter, delete confirmation, sign out, toggle) | Native `<form action={…}>` + `useActionState` → Server Action receives `FormData` |
| **Search / filter inputs** | Use native URL navigation/parsers, or `nuqs` when the URL-state capability is selected; see [state-management.md](state-management.md) |

New-app Server Actions use `createAction()` and `ActionResult`; preserve an approved equivalent boundary. Public submissions need no auth module. See [server-actions.md](../backend/server-actions.md).

## Rules

- **FORM-1 (MUST)** Define the Zod schema **once** in `features/<feature>/schemas.ts`. The client uses it for instant feedback; the Server Action uses the **same** schema as the source of truth. Client validation is UX only, never security.
- **FORM-2 (MUST)** Every field has a visible `<label>` (`FieldLabel`) linked by `htmlFor`/`id`. Placeholders are hints, never labels.
- **FORM-3 (MUST)** Mark invalid fields with `aria-invalid` and connect the error text to the input (shadcn `Field` does this; with native inputs use `aria-describedby`). Show errors next to the field, in text, not only in color.
- **FORM-4 (MUST)** On a failed submit, move focus to the first invalid field (React Hook Form does this by default with `shouldFocusError`). Show form-level errors (not tied to a field) in an alert at the top of the form (`role="alert"`).
- **FORM-5 (MUST)** Use the right `type`, `inputMode` and `autoComplete` for each input (`type="email" autoComplete="email"`, `autoComplete="new-password"`, `inputMode="numeric"`). Required for WCAG 1.3.5 and for password managers.
- **FORM-6 (MUST)** Disable the submit button and show progress while pending (`isPending`); prevent double submits. Mutations must also be safe if submitted twice (idempotent or guarded by unique constraints).
- **FORM-7 (MUST)** Keep user input on failure. Never clear a form because the server returned an error.
- **FORM-8 (MUST)** Never show raw server/untrusted validation errors. Map controlled validation/server codes to friendly copy. With i18n, translate keys; without it, use an explicit monolingual mapping.
- **FORM-9 (MUST NOT)** Block paste in any field, or use cognitive puzzles in auth flows (WCAG 3.3.8). Use bot protection that is invisible to users (see [security.md](../quality/security.md)).

## Validation codes and optional translations

- **FORM-10 (MUST)** Give user-facing constraints controlled error codes and map them consistently. With i18n, these are keys in the selected `Validation` catalogs. Without i18n, use approved monolingual messages; do not create catalogs/providers solely for a simple form.

The examples below demonstrate the selected i18n variant:

```ts
// src/features/projects/schemas.ts
import { z } from "zod";

import { PROJECT_NAME_MAX_LENGTH } from "./constants";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "required" })
    .max(PROJECT_NAME_MAX_LENGTH, { error: "projectNameTooLong" }),
  description: z.string().trim().max(500, { error: "descriptionTooLong" }).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

```json
// messages/en.json (excerpt)
{
  "Validation": {
    "required": "This field is required.",
    "invalid": "This value is not valid.",
    "email": "Enter a valid email address.",
    "projectNameTooLong": "Project name must be 80 characters or fewer.",
    "descriptionTooLong": "Description must be 500 characters or fewer."
  }
}
```

Two shared components do the translating, so forms never call `t()` on error strings themselves:

- `TranslatedFieldError` (`@/components/shared/translated-field-error`): translates a field error key from `Validation`, falling back to `Validation.invalid`.
- `TranslatedFormError` (`@/components/shared/translated-form-error`): translates a form-level error code from `Errors` and renders it with `role="alert"`.

## Interactive form (reference)

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { TranslatedFieldError } from "@/components/shared/translated-field-error";
import { TranslatedFormError } from "@/components/shared/translated-form-error";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { applyActionErrors } from "@/lib/forms";

import { createProjectSchema, type CreateProjectInput } from "../schemas";
import { createProjectAction } from "../server/actions";

export function CreateProjectForm() {
  const t = useTranslations("Projects.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  function handleSubmit(values: CreateProjectInput) {
    startTransition(async () => {
      const result = await createProjectAction(values);
      if (!result.ok) {
        applyActionErrors(form, result); // field errors → fields, other errors → root
        return;
      }
      toast.success(t("created"));
      router.push(`/projects/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="space-y-6">
      <TranslatedFormError error={form.formState.errors.root?.server} />

      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>{t("nameLabel")}</FieldLabel>
            <Input {...field} id={field.name} aria-invalid={fieldState.invalid} autoComplete="off" />
            <TranslatedFieldError error={fieldState.error} />
          </Field>
        )}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
```

> The exact helper signatures (`applyActionErrors`, `TranslatedFieldError`, `TranslatedFormError`) live in the codebase. Read them before using them, and mirror the reference feature in [reference-feature.md](../architecture/reference-feature.md).

## Trivial form (reference)

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

import { subscribeToNewsletterAction } from "../server/actions";

export function NewsletterForm() {
  const t = useTranslations("Newsletter");
  const tErrors = useTranslations("Errors");
  const [email, setEmail] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (_previous: ActionResult<void> | null, formData: FormData) => {
      const result = await subscribeToNewsletterAction(formData);
      if (result.ok) setEmail("");
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex gap-2">
      <label htmlFor="newsletter-email" className="sr-only">{t("emailLabel")}</label>
      <input id="newsletter-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Button type="submit" disabled={isPending}>{t("subscribe")}</Button>
      <p aria-live="polite" className="text-sm">
        {state?.ok ? t("success") : null}
        {state && !state.ok ? tErrors(state.code) : null}
      </p>
    </form>
  );
}
```

> React can reset uncontrolled fields after an action. This simple example controls the email value and clears it only after success, preserving it on errors without requiring React Hook Form.

## FormData parsing

When a Server Action receives `FormData`, `createAction` converts it to an object before validation. In the schema:

- Numbers: `z.coerce.number()`.
- Checkboxes and "true"/"false" strings: `z.stringbool()`.
- Optional text inputs arrive as `""`: use `.trim()` plus `.optional()` or a transform to `undefined` (`z.string().trim().transform((v) => v || undefined)`).
- Files: `z.instanceof(File)` with size and type checks; see the upload rules in [security.md](../quality/security.md).
