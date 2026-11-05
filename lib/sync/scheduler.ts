export type SyncRunResult = { status: "ok" | "stop" } | { status: "retry"; delayMs: number };

/** One foreground-only, coalesced network loop. No browser globals at import time. */
export function createSyncScheduler({
  run,
  available,
  now = Date.now,
  cooldown,
}: {
  cooldown?: { read: () => number; write: (until: number) => void };
  run: (pull: boolean) => Promise<SyncRunResult>;
  available: () => boolean;
  now?: () => number;
}): { wake: (pull?: boolean) => void; availabilityChanged: () => void; stop: () => void } {
  let stopped = false,
    running = false,
    pending = false,
    pullNext = false,
    notBefore = 0;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  function armPoll() {
    clearTimeout(pollTimer);
    if (stopped || !available()) return;
    pollTimer = setTimeout(() => wake(true), 60_000);
  }
  function wake(pull = false) {
    if (stopped) return;
    pending = true;
    pullNext ||= pull;
    if (running || !available()) return;
    clearTimeout(wakeTimer);
    clearTimeout(pollTimer);
    wakeTimer = setTimeout(
      () => {
        void drain();
      },
      Math.max(250, Math.max(notBefore, cooldown?.read() ?? 0) - now()),
    );
  }
  async function drain() {
    if (stopped || !available()) return;
    if (now() < Math.max(notBefore, cooldown?.read() ?? 0)) {
      wake();
      return;
    }
    running = true;
    pending = false;
    const pull = pullNext;
    pullNext = false;
    try {
      const result = await run(pull);
      if (result.status === "retry") {
        notBefore = now() + Math.min(900_000, Math.max(1_000, result.delayMs));
        cooldown?.write(notBefore);
        pending = true;
        pullNext ||= pull;
      } else if (result.status === "stop") pending = false;
    } catch {
      // A runner must report its UI error; never spin on an unexpected rejection.
      pending = false;
    } finally {
      running = false;
      if (!stopped && pending) wake();
      else armPoll();
    }
  }
  function availabilityChanged() {
    clearTimeout(wakeTimer);
    clearTimeout(pollTimer);
    if (available()) wake(true);
  }
  return {
    wake,
    availabilityChanged,
    stop: () => {
      stopped = true;
      clearTimeout(wakeTimer);
      clearTimeout(pollTimer);
    },
  };
}
