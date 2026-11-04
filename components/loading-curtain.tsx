"use client";

import Image from "next/image";
import { motion } from "motion/react";

/** Ink from the liquid theme; the loader is fixed so it reads in both themes. */
export const LOADER_INK = "#17252a";
/** Only animate when the loader was visible long enough for the reveal to read. */
export const CURTAIN_MIN_VISIBLE_MS = 350;
export const CURTAIN_DURATION_MS = 1800;

/** Brand at the same position as the app header, so the hand-off does not jump. */
export function LoaderBrand() {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
      <Image src="/icon-192.png" alt="" width={28} height={28} unoptimized className="size-18 shrink-0" />
      <span>Avo</span>
    </p>
  );
}

/**
 * The loader closes from the edges into a centre line and disappears, revealing
 * the app that is already mounted beneath. `clip-path` only wraps this overlay,
 * so the app's fixed elements (dock, timer) are never clipped.
 */
export function LoadingCurtain({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      aria-hidden
      data-curtain="1"
      className="fixed inset-0 z-50"
      style={{ backgroundColor: LOADER_INK, position: "fixed", inset: 0, zIndex: 50 }}
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={{
        clipPath: [
          "inset(0% 0% 0% 0%)",
          "inset(0% 33% 0% 33%)",
          "inset(0% 49.9% 0% 49.9%)",
          "inset(50% 49.9% 50% 49.9%)",
        ],
      }}
      transition={{
        duration: CURTAIN_DURATION_MS / 1000,
        times: [0, 0.35, 0.68, 1],
        ease: ["easeInOut", "easeInOut", "easeInOut"],
      }}
      onAnimationComplete={onDone}
    >
      <div className="runo-shell mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-10 sm:px-10 sm:py-16">
        <LoaderBrand />
      </div>
    </motion.div>
  );
}
