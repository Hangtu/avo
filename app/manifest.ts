import type { MetadataRoute } from "next";
import { defaultLocale, messages } from "@/lib/i18n/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Avo",
    short_name: "Avo",
    description: messages[defaultLocale].meta.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#EFF6F5",
    theme_color: "#EFF6F5",
    lang: "es-MX",
    dir: "ltr",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
