"use client";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { firstNameFromFullName } from "@/lib/domain/person-name";

export function AccountGreeting() {
  const t = useTranslations("account");
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending || !user) return null;

  const name = firstNameFromFullName(user.name);

  return (
    <p className="max-w-48 truncate text-sm font-medium text-muted">
      {name ? t("greeting", { name }) : t("greetingFallback")}
    </p>
  );
}
