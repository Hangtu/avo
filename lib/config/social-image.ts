import { defaultLocale, messages } from "@/lib/i18n/config";

export const socialImage = {
  url: "/og/avo-share.png",
  width: 1200,
  height: 630,
  alt: messages[defaultLocale].meta.socialImageAlt,
} as const;
