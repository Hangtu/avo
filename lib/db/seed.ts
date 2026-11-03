import type { RunoDatabase } from "./database";
import type { Task, TaskInput } from "@/lib/domain/types";
import { assertTimestamp } from "@/lib/domain/time";
import { defaultSettings, validateTaskInput } from "@/lib/domain/validation";

const SEED_MARKER = "initial-tasks-v1";
const EVERY_DAY: TaskInput["days"] = [0, 1, 2, 3, 4, 5, 6];

interface SeedTask { id: string; input: TaskInput }
const INITIAL_TASKS: SeedTask[] = [
  { id: "seed:brush-teeth", input: {
    title: "Cepillarme los dientes", days: EVERY_DAY, durationMin: 3, priority: 3, category: "personal",
    shortStep: { title: "Preparar el cepillo", durationMin: 1 },
  } },
  { id: "seed:shower", input: {
    title: "Bañarme", days: EVERY_DAY, durationMin: 15, priority: 2, category: "personal",
    shortStep: { title: "Preparar ropa y toalla", durationMin: 1 },
  } },
];

/** Copy-on-read: an editor cannot accidentally mutate the shared seed definitions. */
export function initialTaskTemplates(): SeedTask[] {
  return structuredClone(INITIAL_TASKS);
}

/** One transaction across tabs/retries; a seed is not a recurring import or a reset. */
export async function seedDatabase(
  db: RunoDatabase, now: number,
): Promise<{ createdTaskCount: number }> {
  assertTimestamp(now);
  return db.transaction("rw", db.tasks, db.settings, db.metadata, async () => {
    if (!await db.settings.get("preferences")) {
      await db.settings.add(defaultSettings(now));
    }
    // Accounts start empty; defaults are suggestions for guests, not owner data.
    if (db.accountId || await db.metadata.get(SEED_MARKER)) return { createdTaskCount: 0 };

    const tasks: Task[] = [];
    for (const template of initialTaskTemplates()) {
      if (await db.tasks.get(template.id)) continue;
      tasks.push({
        ...validateTaskInput(template.input),
        id: template.id, createdAt: now, updatedAt: now, archivedAt: null,
      });
    }
    if (tasks.length) await db.tasks.bulkAdd(tasks);
    await db.metadata.add({ key: SEED_MARKER, value: { completedAt: now } });
    return { createdTaskCount: tasks.length };
  });
}
