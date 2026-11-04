import type { MetadataRoute } from "next";

import { publicRoutes } from "@/lib/config/routes";
import { siteUrl } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: publicRoutes.map((route) => route.path),
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
