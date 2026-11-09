import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import type { OutboxItem } from "@/lib/sync/protocol";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { AccountControl } from "./account-control";
import { AccountSyncPanel } from "./account-sync-panel";
import { WorkspaceContext, type WorkspaceValue } from "./workspace-context";

// Session boundary only: no real login, logout, cookies or account network calls.
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
  signOutAccount: async () => ({ error: null }),
}));

function renderPanel(
  locale: "es" | "en",
  overrides: Partial<WorkspaceValue> = {},
  includeAccountControl = false,
) {
  const workspace: WorkspaceValue = {
    available: true,
    accountId: "synthetic-actions-account",
    identity: null,
    status: "saved",
    revision: 0,
    queued: 0,
    conflicts: [],
    rejected: [],
    issues: [],
    preferences: { pending: 0, failed: 0 },
    retry: () => {},
    refresh: () => {},
    unlock: () => {},
    retryPreferences: () => {},
    recover: async () => {},
    resolve: async () => {},
    ...overrides,
  };
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "es" ? es : en}
      timeZone="America/Mexico_City"
    >
      <WorkspaceContext value={workspace}>
        {includeAccountControl ? <AccountControl /> : null}
        <AccountSyncPanel />
      </WorkspaceContext>
    </NextIntlClientProvider>,
  );
}

function outboxItem(state: OutboxItem["state"]): OutboxItem {
  return {
    operationId: "00000000-0000-4000-8000-000000000002",
    kind: "pending",
    id: "synthetic-actions-pending",
    key: "pending:synthetic-actions-pending",
    baseRevision: 0,
    state,
    value: {
      id: "synthetic-actions-pending",
      title: "Synthetic actions pending",
      durationMin: 5,
      createdAt: 1,
      updatedAt: 1,
      completedAt: null,
      deletedAt: null,
    },
  };
}

describe.each(["es", "en"] as const)("Settings sync actions in %s", (locale) => {
  const messages = (locale === "es" ? es : en).sync;

  it.each(["saved", "error", "syncing", "offline", "expired", "guest"] as const)(
    "removes guest actions and offers connection retry only on error (status: %s)",
    (status) => {
      const html = renderPanel(locale, { status, ...(status === "guest" ? { accountId: null } : {}) });
      expect(html).not.toContain(messages.useGuest);
      expect(html).not.toContain(messages.importOpen);
      if (status === "error") {
        expect(html).toContain(messages.error);
        expect(html).toContain(messages.retry);
        expect(html.match(/<button\b/g)).toHaveLength(1);
      } else {
        expect(html).not.toContain(messages.retry);
      }
    },
  );

  it("renders no empty panel or action row when backup is healthy", () => {
    expect(renderPanel(locale)).toBe("");
  });

  it("preserves the separate signed-in account control and its sign-out button", () => {
    const html = renderPanel(
      locale,
      {
        identity: { id: "synthetic-actions-account", name: "Synthetic account" },
      },
      true,
    );
    expect(html).toContain((locale === "es" ? es : en).account.signOut);
    expect(html).not.toContain(messages.useGuest);
    expect(html).not.toContain(messages.importOpen);
    expect(html).not.toContain(messages.retry);
    expect(html).not.toContain(messages.saved);
  });

  it("does not offer account retry in an unselected workspace", () => {
    const html = renderPanel(locale, { status: "error", accountId: null });
    expect(html).toContain(messages.error);
    expect(html).not.toContain(messages.retry);
  });

  it("does not render a panel before a workspace is available", () => {
    expect(renderPanel(locale, { available: false, status: "error" })).toBe("");
  });

  it("keeps local preference retry separate from cloud connection retry", () => {
    const html = renderPanel(locale, { preferences: { pending: 0, failed: 1 } });
    expect(html).toContain(messages.localSaveError);
    expect(html).toContain(messages.retryLocal);
    expect(html).not.toContain(messages.retry);
  });

  it("keeps queued-backup guidance without offering a retry before failure", () => {
    const html = renderPanel(locale, { queued: 2 });
    expect(html).toContain(locale === "es" ? "2 cambios por enviar." : "2 changes waiting to send.");
    expect(html).not.toContain(messages.retry);
  });

  it("preserves both conflict resolution choices without a generic connection retry", () => {
    const html = renderPanel(locale, { conflicts: [outboxItem("conflict")] });
    expect(html).toContain(messages.conflictTitle);
    expect(html).toContain(messages.keepLocal);
    expect(html).toContain(messages.keepRemote);
    expect(html).not.toContain(messages.retry);
  });

  it.each(["rejected", "local-only"] as const)("preserves per-item recovery for %s changes", (state) => {
    const html = renderPanel(locale, { rejected: [outboxItem(state)] });
    expect(html).toContain(messages.retryItem);
    expect(html).toContain(state === "rejected" ? messages.rejectedCopy : messages.localOnly);
    if (state === "rejected") expect(html).toContain(messages.keepLocalOnly);
    else expect(html).not.toContain(messages.keepLocalOnly);
    expect(html).not.toContain(messages.retry);
  });

  it("preserves unreadable remote-data guidance and details without generic connection retry", () => {
    const html = renderPanel(locale, {
      issues: [
        {
          key: "pending:synthetic-actions-pending",
          kind: "pending",
          id: "synthetic-actions-pending",
          code: "invalid_record",
        },
      ],
    });
    expect(html).toContain(messages.remoteIssue);
    expect(html).toContain(messages.details);
    expect(html).not.toContain(messages.retry);
  });
});
