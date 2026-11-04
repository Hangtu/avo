import type { MetadataRoute } from "next";

import { publicRoutes, toAbsoluteUrl } from "@/lib/config/routes";
import { siteUrl } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: toAbsoluteUrl(siteUrl, route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
