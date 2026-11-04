export interface PublicRoute {
  readonly path: string;
  readonly changeFrequency: "yearly" | "monthly" | "weekly";
  readonly priority: number;
}

/**
 * Public, indexable routes. Single source for the sitemap and the robots
 * allowlist so a new public page cannot drift between them.
 */
export const publicRoutes = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/data-deletion", changeFrequency: "yearly", priority: 0.4 },
] as const satisfies readonly PublicRoute[];

export function toAbsoluteUrl(origin: string, path: string): string {
  return path === "/" ? `${origin}/` : `${origin}${path}`;
}
