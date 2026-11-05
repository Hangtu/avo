import "server-only";

import { z } from "zod";

/**
 * Server-only environment inputs. Parsed once per process; a missing or
 * malformed value fails at startup instead of on the first request.
 *
 * Optional integrations stay optional so a fresh clone can run with only the
 * database and auth values declared in `.env.example`.
 */
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalOrigin = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url({ protocol: /^https?$/ }).optional(),
);

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    VERCEL: z.enum(["0", "1"]).optional(),
    DATABASE_URL: z.url("DATABASE_URL es obligatoria y debe ser una URL de Postgres."),
    BETTER_AUTH_SECRET: z
      .string("BETTER_AUTH_SECRET es obligatoria.")
      .min(32, "BETTER_AUTH_SECRET necesita al menos 32 caracteres (openssl rand -base64 32)."),
    BETTER_AUTH_URL: optionalOrigin,
    AVO_DEV_AUTH_ORIGINS: optionalText,
    GOOGLE_CLIENT_ID: optionalText,
    GOOGLE_CLIENT_SECRET: optionalText,
    FACEBOOK_CLIENT_ID: optionalText,
    FACEBOOK_CLIENT_SECRET: optionalText,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;
    if (!value.BETTER_AUTH_URL) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "BETTER_AUTH_URL es obligatoria en producción (origen HTTPS exacto).",
      });
      return;
    }
    // Synthetic loopback origins are valid for CI builds; real deployments must use HTTPS.
    const host = new URL(value.BETTER_AUTH_URL).hostname;
    const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
    if (!loopback && !value.BETTER_AUTH_URL.startsWith("https://")) {
      context.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message: "BETTER_AUTH_URL debe usar HTTPS en producción.",
      });
    }
    for (const [id, secret] of [
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    ] as const) {
      if (Boolean(value[id]) !== Boolean(value[secret])) {
        context.addIssue({
          code: "custom",
          path: [value[id] ? secret : id],
          message: `${id} y ${secret} deben configurarse juntos.`,
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Configuración de entorno inválida:\n${details}\nRevisa .env.example; no publiques secretos.`,
  );
}

export const env = parsed.data;
