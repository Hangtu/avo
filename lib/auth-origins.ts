/** Explicit full origins; HMR allowlists never implicitly authorize account mutations. */
export function authOrigins(): string[] {
  const base = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").origin;
  if (process.env.NODE_ENV !== "development") return [base];
  const extra = (process.env.AVO_DEV_AUTH_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean).map(value => {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password) throw new Error("Invalid AVO_DEV_AUTH_ORIGINS");
    return url.origin;
  });
  return [...new Set([base, ...extra])];
}
