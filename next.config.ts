import type { NextConfig } from "next";
import { developmentHosts, reportOnlyCsp } from "./lib/config/security";

// A static report-only CSP preserves the prerendered shell. Inline framework,
// theme and motion violations must be measured before any enforcement (ADR 0002).
const securityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: reportOnlyCsp(process.env.NODE_ENV === "development"),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const productionHeaders =
  process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: developmentHosts(process.env.AVO_DEV_HOSTS, process.env.NODE_ENV),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...productionHeaders],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
