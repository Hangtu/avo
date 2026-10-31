import type { Locale } from "./config";

type Messages = typeof import("@/messages/en.json");

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
