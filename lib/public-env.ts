import { z } from "zod";

/**
 * Values that are intentionally visible in the browser bundle. Only
 * `NEXT_PUBLIC_*` names belong here; never add a secret.
 */
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalOrigin = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.url({ protocol: /^https?$/ }).optional(),
);

export const publicEnv = z
  .object({
    NEXT_PUBLIC_SITE_URL: optionalOrigin,
    NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME: optionalText,
    NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS: optionalText,
  })
  .parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME: process.env.NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME,
    NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS: process.env.NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS,
  });
