import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const now = Date.now();
  const ownerId = process.env.RUNO_OWNER_ID ?? "owner";
  const timeZone = process.env.RUNO_TIME_ZONE ?? "America/Mexico_City";

  const { db, pool } = await import("../lib/db/client");
  const { initialTaskTemplates } = await import("../lib/db/seed");
  const { defaultSettings } = await import("../lib/domain/validation");
  const { metadata, settings, tasks, users } = await import("../lib/db/schema");
  const defaults = defaultSettings(now);

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({ id: ownerId, timeZone })
        .onConflictDoNothing();

      await tx
        .insert(settings)
        .values({
          userId: ownerId,
          audioEnabled: defaults.audioEnabled,
          sound: defaults.sound,
          maxTone: defaults.maxTone,
          theme: defaults.theme,
          showWallet: defaults.showWallet,
          updatedAt: new Date(now),
        })
        .onConflictDoNothing();

      for (const template of initialTaskTemplates()) {
        await tx
          .insert(tasks)
          .values({
            id: template.id,
            userId: ownerId,
            title: template.input.title,
            category: template.input.category,
            durationMin: template.input.durationMin,
            priority: template.input.priority,
            days: template.input.days,
            windowStart: template.input.window?.start ?? null,
            windowEnd: template.input.window?.end ?? null,
            fixedTime: template.input.fixedTime ?? null,
            shortStepTitle: template.input.shortStep?.title ?? null,
            shortStepDurationMin: template.input.shortStep?.durationMin ?? null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          })
          .onConflictDoNothing();
      }

      await tx
        .insert(metadata)
        .values({
          userId: ownerId,
          key: "initial-tasks-v1",
          value: { completedAt: now },
          updatedAt: new Date(now),
        })
        .onConflictDoNothing();
    });

    console.log(`Seed listo para ${ownerId}: ${initialTaskTemplates().length} plantillas.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
