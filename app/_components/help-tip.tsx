"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const id = useId();

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
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPinned(false);
      setOpen(false);
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggle() {
    setPinned((value) => {
      const next = !value;
      setOpen(next);
      return next;
    });
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-flex align-middle"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !pinned) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={buttonRef}
        className="help-tip-button"
        aria-label={label ?? t("moreInfo")}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={toggle}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!pinned && !rootRef.current?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <span aria-hidden>i</span>
      </button>
      <span
        ref={panelRef}
        id={id}
        role="tooltip"
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
