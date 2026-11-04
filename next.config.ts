import type { NextConfig } from "next";

/**
 * Static response headers. A nonce-based CSP is intentionally absent: it needs
 * `proxy.ts`, makes pages dynamic, and must be measured against the theme
 * bootstrap script, the loading curtain, and the service worker first.
 */
const securityHeaders = [
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
  // Allow dev assets and HMR from this machine's LAN address, without a wildcard.
  allowedDevOrigins: ["192.168.68.109"],
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
