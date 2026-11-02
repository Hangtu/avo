"use client";

import { useTranslations } from "next-intl";

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.6V8l2.4 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A derived, unresolved state: the window ended, but the task can still be
 * started or resolved. It is intentionally not styled as completed or skipped.
 */
export function MissedBadge({ className = "" }: { className?: string }) {
  const common = useTranslations("common");

  return (
    <span className={`task-missed-badge${className ? ` ${className}` : ""}`}>
      <ClockIcon />
      {common("stillPossible")}
    </span>
  );
}
