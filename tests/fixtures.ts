import type { TaskInput } from "@/lib/domain/types";

export const MONDAY = "2026-10-26" as const;
export const NOW = new Date(2026, 9, 26, 8, 0).getTime();

export function taskInput(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: "Lavar ropa",
    days: [1],
    durationMin: 15,
    priority: 2,
    category: "casa",
    shortStep: { title: "Meter ropa a la lavadora", durationMin: 1 },
    ...overrides,
  };
}
