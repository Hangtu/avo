import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncScheduler, type SyncRunResult } from "./scheduler";
import { retryAfterMs } from "./retry-after";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());
describe("foreground sync scheduler", () => {
  it("coalesces wakes, polls while available and stops all work", async () => {
    const run = vi.fn(async (): Promise<SyncRunResult> => ({ status: "ok" }));
    const scheduler = createSyncScheduler({ run, available: () => true });
    scheduler.wake();
    scheduler.wake(true);
    scheduler.wake();
    await vi.advanceTimersByTimeAsync(250);
    expect(run).toHaveBeenCalledExactlyOnceWith(true);
    await vi.advanceTimersByTimeAsync(60_250);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).toHaveBeenCalledTimes(2);
  });
  it("retains pending work without timers/network while hidden or offline", async () => {
    let available = false;
    const run = vi.fn(async (): Promise<SyncRunResult> => ({ status: "ok" }));
    const scheduler = createSyncScheduler({ run, available: () => available });
    scheduler.wake(true);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(run).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    available = true;
    scheduler.availabilityChanged();
    await vi.advanceTimersByTimeAsync(250);
    expect(run).toHaveBeenCalledExactlyOnceWith(true);
    available = false;
    scheduler.availabilityChanged();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    scheduler.stop();
  });
  it("honors Retry-After despite manual wakes and availability changes", async () => {
    const run = vi
      .fn<() => Promise<SyncRunResult>>()
      .mockResolvedValueOnce({ status: "retry", delayMs: 60_000 })
      .mockResolvedValue({ status: "ok" });
    const scheduler = createSyncScheduler({ run, available: () => true });
    scheduler.wake(true);
    await vi.advanceTimersByTimeAsync(250);
    scheduler.wake();
    scheduler.availabilityChanged();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith(true);
    scheduler.stop();
  });
  it("preserves account-scoped cooldown across effect/scheduler recreation", async () => {
    let until = 0;
    const cooldown = {
      read: () => until,
      write: (value: number) => {
        until = value;
      },
    };
    const run = vi
      .fn<() => Promise<SyncRunResult>>()
      .mockResolvedValueOnce({ status: "retry", delayMs: 60_000 })
      .mockResolvedValue({ status: "ok" });
    const first = createSyncScheduler({ run, cooldown, available: () => true });
    first.wake(true);
    await vi.advanceTimersByTimeAsync(250);
    first.stop();
    const second = createSyncScheduler({ run, cooldown, available: () => true });
    second.wake(true);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    second.stop();
  });
  it("does not overlap in-flight requests and retains a wake during them", async () => {
    let finish: (value: SyncRunResult) => void = () => {};
    const run = vi
      .fn<() => Promise<SyncRunResult>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ status: "ok" });
    const scheduler = createSyncScheduler({ run, available: () => true });
    scheduler.wake();
    await vi.advanceTimersByTimeAsync(250);
    scheduler.wake(true);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run).toHaveBeenCalledTimes(1);
    finish({ status: "ok" });
    await vi.advanceTimersByTimeAsync(250);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });
});
describe("Retry-After boundary", () => {
  it("parses delta seconds, HTTP dates and caps untrusted values", () => {
    expect(retryAfterMs("42", 0)).toBe(42_000);
    expect(retryAfterMs(new Date(90_000).toUTCString(), 0)).toBe(90_000);
    expect(retryAfterMs(null, 0)).toBe(60_000);
    expect(retryAfterMs("invalid", 0)).toBe(60_000);
    expect(retryAfterMs("9999999999", 0)).toBe(900_000);
    expect(retryAfterMs("0", 0)).toBe(1_000);
  });
});
