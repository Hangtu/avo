import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import type { OutboxItem } from "@/lib/sync/protocol";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { PersistenceNotice } from "./account-sync-panel";
import { WorkspaceContext, type WorkspaceValue } from "./workspace-context";

function renderNotice(locale: "es" | "en", overrides: Partial<WorkspaceValue> = {}) {
  const workspace: WorkspaceValue = {
    available: true,
    accountId: "synthetic-notice-account",
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
        <PersistenceNotice />
      </WorkspaceContext>
    </NextIntlClientProvider>,
  );
}

function outboxItem(state: OutboxItem["state"]): OutboxItem {
  return {
    operationId: "00000000-0000-4000-8000-000000000001",
    kind: "pending",
    id: "synthetic-pending",
    key: "pending:synthetic-pending",
    baseRevision: 0,
    state,
    value: {
      id: "synthetic-pending",
      title: "Synthetic pending item",
      durationMin: 5,
      createdAt: 1,
      updatedAt: 1,
      completedAt: null,
      deletedAt: null,
    },
  };
}

describe.each(["es", "en"] as const)("backup notices in %s", (locale) => {
  const messages = (locale === "es" ? es : en).sync;

  it("renders nothing for a healthy saved workspace, including no empty status region", () => {
    expect(renderNotice(locale)).toBe("");
  });

  it("keeps a healthy guest workspace silent", () => {
    expect(renderNotice(locale, { status: "guest", accountId: null })).toBe("");
  });

  it("renders nothing before a workspace is available", () => {
    expect(renderNotice(locale, { available: false, status: "error" })).toBe("");
  });

  it.each(["error", "offline", "expired", "syncing"] as const)("preserves the %s notice", (status) => {
    const html = renderNotice(locale, { status });
    expect(html).toContain('role="status"');
    expect(html).toContain(messages[status]);
    expect(html).not.toContain(messages.saved);
  });

  it("keeps local-save failures and their retry control visible even with saved sync status", () => {
    const html = renderNotice(locale, { preferences: { pending: 0, failed: 1 } });
    expect(html).toContain('role="status"');
    expect(html).toContain(messages.localSaveError);
    expect(html).toContain("<button");
    expect(html).toContain(messages.retryLocal);
    expect(html).not.toContain(messages.saved);
  });

  it("keeps pending preference writes visible even with saved sync status", () => {
    const html = renderNotice(locale, { preferences: { pending: 1, failed: 0 } });
    expect(html).toContain('role="status"');
    expect(html).toContain(messages.localSaving);
    expect(html).not.toContain(messages.saved);
  });

  it("keeps queued changes visible even with saved sync status", () => {
    const html = renderNotice(locale, { queued: 2 });
    expect(html).toContain('role="status"');
    expect(html).toContain(locale === "es" ? "2 cambios por enviar." : "2 changes waiting to send.");
    expect(html).not.toContain(messages.saved);
  });

  it.each(["rejected", "local-only"] as const)(
    "keeps %s changes visible even with saved sync status",
    (state) => {
      const html = renderNotice(locale, { rejected: [outboxItem(state)] });
      expect(html).toContain('role="status"');
      expect(html).toContain(messages.rejectedTitle);
      expect(html).not.toContain(messages.saved);
    },
  );

  it("keeps conflicts visible even with saved sync status", () => {
    const html = renderNotice(locale, { conflicts: [outboxItem("conflict")] });
    expect(html).toContain('role="status"');
    expect(html).toContain(messages.conflictTitle);
    expect(html).not.toContain(messages.saved);
  });

  it("keeps unreadable remote-data warnings visible even with saved sync status", () => {
    const html = renderNotice(locale, {
      issues: [
        {
          key: "pending:synthetic-pending",
          kind: "pending",
          id: "synthetic-pending",
          code: "invalid_record",
        },
      ],
    });
    expect(html).toContain('role="status"');
    expect(html).toContain(messages.remoteIssue);
    expect(html).not.toContain(messages.saved);
  });
});
