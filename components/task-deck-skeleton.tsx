"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { DECK_BACK_SCALE } from "@/lib/ui/task-deck";
import { useStartupLoadingVisible } from "./startup-loading-provider";

export function TaskDeckSkeleton() {
  const t = useTranslations("home");
  const franja = useTranslations("franja");
  const labelId = useId();
  const visible = useStartupLoadingVisible();
  return (
    <div
      role="status"
      aria-labelledby={labelId}
      aria-hidden={!visible || undefined}
      style={{ visibility: visible ? "visible" : "hidden" }}
    >
      <span id={labelId} className="sr-only">
        {t("loading")}
      </span>
      <p className="first-prompt" aria-hidden="true">
        {franja("prompt")}
      </p>
      <div className="peek-layout" data-has-alternative="true">
        <section className="peek-card z-10" data-deck-role="front" aria-hidden="true">
          <div className="first-experience peek-front">
            <div className="first-eyebrow flex h-[1.5em] items-center">
              <Skeleton className="h-[0.6em] w-12 opacity-60" />
            </div>
            <div className="first-title">
              <div className="flex h-[1.05em] items-center">
                <Skeleton className="h-[0.3em] w-4/5 opacity-60" />
              </div>
              <div className="flex h-[1.05em] items-center sm:hidden">
                <Skeleton className="h-[0.3em] w-3/5 opacity-60" />
              </div>
            </div>
            <div className="first-duration flex h-[1.5em] items-center">
              <Skeleton className="h-[0.5em] w-14 opacity-60" />
            </div>
            <div className="first-actions">
              <div className="overflow-hidden rounded-full">
                <Skeleton className="h-11 w-28 opacity-60" />
              </div>
            </div>
          </div>
        </section>
        <section
          className="peek-card"
          data-deck-role="back"
          aria-hidden="true"
          style={{
            transform: `translateY(calc(var(--peek-reveal) + ${(1 - DECK_BACK_SCALE) * 100}%)) scale(${DECK_BACK_SCALE})`,
          }}
        >
          <div className="peek-back">
            <div className="peek-back-top">
              <Skeleton className="h-2 w-16 opacity-40" />
            </div>
            <div className="peek-back-title flex h-[1.2em] items-center">
              <Skeleton className="h-[0.5em] w-1/2 opacity-40" />
            </div>
            <div className="peek-back-duration flex h-[1.5em] items-center">
              <Skeleton className="h-[0.5em] w-10 opacity-40" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
