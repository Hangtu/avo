# 006 — E4.8 device and browser coverage

id: 006
updated: 2026-11-04

## Goal

Validate the journeys that local tests cannot prove on a physical phone and
Safari: PWA install/offline/reconnect, one timer session with audio and wake
lock, and the pending-item recovery flow.

## Out of scope

- Authenticated E2E automation; this is manual device evidence.
- Native apps or push notifications.

## Next step

On a real phone and in Safari, install the PWA, run one session with audio and
wake lock, go offline, reload, and confirm the pending item syncs on reconnect.
Record device, browser, viewport and result. Do not change behavior from a
single observation; file findings first.

## Checklist

- [ ] Install the PWA on a physical phone.
- [ ] Run a session with audio and wake lock.
- [ ] Go offline, reload and confirm local data survives.
- [ ] Reconnect and confirm the pending item syncs.
- [ ] Repeat the shell and legal pages in Safari.
- [ ] Record evidence and close.

## Files

- `components/use-session-audio.ts` — session audio.
- `components/use-wake-lock.ts` — wake lock.
- `components/service-worker-register.tsx` — PWA registration.
- `scripts/generate-service-worker.mjs` — precache generation.
- `e2e/public.spec.ts` — public browser coverage.
