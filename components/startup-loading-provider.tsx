"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const StartupLoadingContext = createContext(true);
const STARTUP_SKELETON_DELAY_MS = 150;

/** One presentation clock across workspace selection and home initialization. */
export function StartupLoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), STARTUP_SKELETON_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, []);
  return <StartupLoadingContext value={visible}>{children}</StartupLoadingContext>;
}

export function useStartupLoadingVisible() {
  return useContext(StartupLoadingContext);
}
