import { z } from "zod";

/** Static diagnostic policy: deliberately not an enforcement claim or a nonce. */
export function reportOnlyCsp(development: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const devHost = z
  .string()
  .min(1)
  .refine((value) => {
    // Exact hostnames only; reject schemes, credentials, ports, paths/wildcards.
    if (!/^[a-z\d.\-\[\]:]+$/i.test(value) || value.includes("*")) return false;
    try {
      const url = new URL(`http://${value}`);
      return url.hostname === value.toLowerCase() && !url.port && url.pathname === "/";
    } catch {
      return false;
    }
  });

/** HMR permission never grants auth permission; production ignores local input. */
export function developmentHosts(input: string | undefined, mode: string | undefined): string[] {
  if (mode !== "development" || !input?.trim()) return [];
  const result = z
    .array(devHost)
    .max(20)
    .safeParse(
      input
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
    );
  if (!result.success)
    throw new Error("Invalid AVO_DEV_HOSTS: use exact comma-separated hostnames without ports or wildcards.");
  return [...new Set(result.data.map((host) => host.toLowerCase()))];
}
