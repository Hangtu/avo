"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export function HelpTip({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const lastPointerType = useRef<string | null>(null);
  const id = useId();

  const close = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const button = buttonRef.current;
      const panel = panelRef.current;
      if (!button || !panel) return;
      const anchor = button.getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      const gap = 8;
      const left = Math.min(
        Math.max(gap, anchor.left + anchor.width / 2 - box.width / 2),
        window.innerWidth - box.width - gap,
      );
      const below = anchor.bottom + gap;
      const top = below + box.height > window.innerHeight - gap
        ? Math.max(gap, anchor.top - box.height - gap)
        : below;
      setCoords({ left, top });
    }

    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", close, true);
    document.addEventListener("scroll", close, true);
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("scroll", close, true);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [close, open]);

  function toggleOnTouch() {
    if (lastPointerType.current === "mouse" || lastPointerType.current === null) return;
    if (open) close();
    else setOpen(true);
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-flex align-middle"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        close();
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        className="help-tip-button"
        data-open={open}
        aria-label={label ?? t("moreInfo")}
        aria-describedby={open ? id : undefined}
        onPointerDown={(event) => {
          lastPointerType.current = event.pointerType;
        }}
        onClick={toggleOnTouch}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !rootRef.current?.contains(next)) close();
        }}
      >
        <span aria-hidden>i</span>
      </button>
      <span
        ref={panelRef}
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className="help-tip-panel"
        style={{
          left: coords?.left ?? 0,
          top: coords?.top ?? 0,
          visibility: coords ? "visible" : "hidden",
        }}
      >
        {children}
      </span>
    </span>
  );
}
