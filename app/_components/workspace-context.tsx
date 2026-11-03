"use client";

import { createContext, useContext } from "react";
import type { OutboxItem, RemoteIssue } from "@/lib/sync/protocol";
import type { PreferenceWriteState } from "@/lib/sync/preference-writer";

export type SyncState = "guest" | "syncing" | "saved" | "offline" | "error" | "expired";
export interface AccountIdentity { id: string; name?: string; email?: string }
export interface WorkspaceValue {
  available: boolean;
  accountId: string | null;
  identity: AccountIdentity | null;
  status: SyncState;
  revision: number;
  queued: number;
  conflicts: OutboxItem[];
  rejected: OutboxItem[];
  issues: RemoteIssue[];
  preferences: PreferenceWriteState;
  retry: () => void;
  refresh: () => void;
  unlock: () => void;
  retryPreferences: () => void;
  recover: (key: string, choice: "retry" | "local-only") => Promise<void>;
  resolve: (key: string, choice: "local" | "remote") => Promise<void>;
}
export const WorkspaceContext = createContext<WorkspaceValue>({
  available: false, accountId: null, identity: null, status: "guest", revision: 0, queued: 0, conflicts: [], rejected: [], issues: [], preferences: { pending: 0, failed: 0 },
  retry: () => {}, refresh: () => {}, unlock: () => {}, retryPreferences: () => {}, recover: async () => {}, resolve: async () => {},
});
export const useWorkspace = () => useContext(WorkspaceContext);
