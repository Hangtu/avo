import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
