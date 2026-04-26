---
phase: 03-closed-loop-e2e-testing-current
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - .github/workflows/ci.yml
  - client/e2e/connection.spec.ts
  - client/e2e/gameplay.spec.ts
  - client/src/interactions.ts
  - client/src/main.ts
  - client/src/spacetime.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the CI/CD workflow, two Playwright E2E test specs, and three TypeScript source modules (`interactions.ts`, `main.ts`, `spacetime.ts`). The implementation establishes a SpacetimeManager singleton, an InteractionManager for canvas input, and an E2E harness wired into GitHub Actions.

Three critical issues were found: a missing failure-exit in the CI startup readiness loop that silently lets tests run against a dead server; a reducer argument mismatch where `setWaypoint` is called with positional args against a schema that requires an object; and a singleton leak in `SpacetimeManager` that allows stale connection state to persist across test runs when the browser context is reused. Five warnings cover logic gaps around state races, a silent no-op on connection guard bypass, unhandled promise rejections in `InteractionManager`, a console leak into CI logs, and an off-by-one risk in the spawning test assumption. Three info items address minor code quality concerns.

---

## Critical Issues

### CR-01: CI readiness loop never fails — tests run against a dead server

**File:** `.github/workflows/ci.yml:175-181`

**Issue:** The polling loop waits up to 60 seconds for SpacetimeDB but uses `break` to exit on success and falls through silently on timeout. If SpacetimeDB never starts (install failure, port conflict, etc.) the loop exits after 60 seconds without setting a non-zero exit code, the next step (`spacetime publish`) runs and also likely fails silently, and Playwright then runs against no server. Failures surface as cryptic "connection refused" test errors with no indication the server never came up, making the root cause invisible.

**Fix:**
```bash
- name: Start SpacetimeDB (local)
  run: |
    spacetime start --in-memory &
    echo "SPACETIME_PID=$!" >> $GITHUB_ENV
    READY=0
    for i in $(seq 1 60); do
      if curl -sf http://127.0.0.1:3000/v1/ping >/dev/null 2>&1; then
        echo "SpacetimeDB is up after ${i}s"
        READY=1
        break
      fi
      sleep 1
    done
    if [ "$READY" -ne 1 ]; then
      echo "ERROR: SpacetimeDB did not start within 60 seconds" >&2
      exit 1
    fi
```

---

### CR-02: `setWaypoint` reducer called with positional args but schema expects object

**File:** `client/src/spacetime.ts:359`

**Issue:** The generated `SetWaypointReducer` schema (in `set_waypoint_reducer.ts`) defines four named fields: `shipId`, `targetX`, `targetY`, `targetSpeed`. The `fireMissile` call at line 321 correctly spreads positional args matching its own schema. However, `registerPlayer` at line 337 wraps args in an object (`{ name: nickname }`), and `spawnShip` at lines 397-401 also uses an object. The `setWaypoint` call at line 359 is called with four positional arguments instead of an object:

```typescript
this.connection.reducers.setWaypoint(shipId, x, y, targetSpeed);
```

The SpaceTimeDB SDK uses the reducer schema for argument serialization. If the SDK dispatches via the schema's field names (as it does for `registerPlayer` and `spawnShip`), this positional call may silently serialize incorrectly — the field `shipId` is a `u64` but `shipId` (a `bigint`) is passed first, while `targetX` and `targetY` are `f32`. Whether this works depends on SDK internals, but the calling convention is inconsistent with every other object-style reducer in this file and is a latent correctness bug.

**Fix:**
```typescript
// Replace line 359:
this.connection.reducers.setWaypoint({ shipId, targetX: x, targetY: y, targetSpeed });
```

---

### CR-03: Singleton `SpacetimeManager` leaks state across Playwright test files

**File:** `client/src/spacetime.ts:21-41` / `client/e2e/gameplay.spec.ts:17-28`

**Issue:** `SpacetimeManager` is a singleton (`SpacetimeManager.instance`) held on the module scope. When `playwright.config.ts` runs tests with `fullyParallel: true` (in non-CI mode) or with retries, each test file navigates to `/` which re-runs `main.ts`. The module-level singleton is NOT reset between page navigations within the same browser context because it lives in the browser's JavaScript module registry. The `connect()` method guards on `isConnected || isConnecting` (line 50), so a second navigation attempt silently returns without reconnecting. If the first test closes a page or the connection drops mid-test, `isConnected` may be `true` while `this.connection` is stale — all subsequent `getShips()` / `getPlayers()` calls succeed structurally but return data from a dead iterator, and no error is thrown because the `try/catch` blocks swallow the failure and return `[]`.

In `gameplay.spec.ts`, line 31, the test calls `parseInt(initialCountText || '0')` and assumes it will see `initialCount + 1`. If the singleton is in a degraded state from a prior test, ship spawn calls silently throw (swallowed at line 402-405 of `spacetime.ts`), the count never increments, and the test times out at 10 seconds with no actionable error.

**Fix:** The singleton pattern is fundamentally incompatible with fresh-state-per-test requirements. Options in increasing robustness:
1. Short-term: set `workers: 1` unconditionally in `playwright.config.ts` and add `page.reload()` before each test assertion to force module re-init.
2. Correct fix: expose a `SpacetimeManager.reset()` static that nulls `instance`, `connection`, and resets all flags; call it in a `beforeEach` hook via `page.evaluate(() => window.spacetimeManager.constructor.reset())`.

---

## Warnings

### WR-01: `isConnected` set to `true` before `onConnect` callback fires

**File:** `client/src/spacetime.ts:122-124`

**Issue:** `this.isConnected = true` is set synchronously at line 122 (after `await DbConnection.builder()...build()` returns), but the `onConnect` callback (line 64) is an async event fired by the SDK after the handshake completes. The `localIdentity` is only set inside `onConnect`. Between line 122 and the `onConnect` firing, `isOnline()` returns `true` but `getUserIdentity()` returns `null`. Code in `InteractionManager.handleLeftClick` (line 124 of `interactions.ts`) calls `getUserIdentity()` immediately after connecting and treats `null` as "not registered" — this is safe by accident, but any caller that guards on `isOnline()` before calling `getUserIdentity()` will get a null that it may not expect.

**Fix:** Set `this.isConnected = true` inside the `onConnect` callback alongside `localIdentity` assignment, not after `build()` returns:
```typescript
.onConnect((_conn: DbConnection, identity: Identity) => {
  this.localIdentity = identity;
  this.isConnected = true;   // <-- move here
  this.isConnecting = false; // <-- and here
  this.handleConnectionEstablished();
})
```
Then remove lines 122-123 from the `try` block.

---

### WR-02: `connect()` guard silently swallows re-connect attempts — no error surfaced

**File:** `client/src/spacetime.ts:50-53`

**Issue:** When `connect()` is called while already connected or connecting, it logs a warning and returns `undefined` (as `Promise<void>`). The caller in `main.ts` line 33 does `await spacetimeManager.connect(...)` and then immediately calls `updateStatus("Connected")` — but if the guard fired, the status was already set by a previous call. In a hot-reload development scenario or after a Playwright page re-navigate, this means the UI shows "Connected" based on a stale call path even if the underlying connection was never re-established for this page load.

**Fix:** Either throw an error if re-connecting when already connected, or return a signal that lets the caller know the guard fired:
```typescript
if (this.isConnected) {
  return; // idempotent — already connected, nothing to do
}
if (this.isConnecting) {
  throw new Error('Connection already in progress');
}
```

---

### WR-03: `registerPlayer` in `InteractionManager` silently resets `isRegistering` on error but state may be inconsistent

**File:** `client/src/interactions.ts:187-190`

**Issue:** If `spacetimeManager.registerPlayer()` throws, `isRegistering` is reset to `false` at line 189 and a status message is shown. However, `spacetimeManager.registerPlayer()` is `async` (line 331 of `spacetime.ts`) but is called without `await` at line 184 of `interactions.ts`:

```typescript
this.spacetimeManager.registerPlayer(nickname);  // line 184 — no await
```

The `try/catch` block in `registerPlayer` (lines 187-191 of `interactions.ts`) catches only synchronous throws from the async call initiation — not the actual async rejection. If the reducer call rejects asynchronously (e.g., not connected, network error), the rejection is silently swallowed as an unhandled promise rejection. `isRegistering` stays `true` forever, permanently locking out further registration attempts until page reload.

**Fix:**
```typescript
private registerPlayer = async (): Promise<void> => {
  try {
    const nickname = `Player_${Math.floor(Math.random() * 10000)}`;
    this.isRegistering = true;
    await this.spacetimeManager.registerPlayer(nickname);
    this.showStatus('Registering player...');
  } catch (error) {
    console.error('[InteractionManager] Error registering player:', error);
    this.isRegistering = false;
    this.showStatus('Failed to register player');
  }
};
```
And update `handleLeftClick` to `await this.registerPlayer()` or handle the returned promise.

---

### WR-04: `gameplay.spec.ts` assumes test isolation with a shared, persistent SpacetimeDB instance

**File:** `client/e2e/gameplay.spec.ts:10-12`

**Issue:** The comment at line 10 states "Initial count should be 0 (assuming a fresh local SpacetimeDB instance)". The test uses `--in-memory` in CI (line 172 of `ci.yml`), but `CLAUDE.md` instructs local developers to use `spacetime start --local` (persistent storage). If local storage has leftover ships from prior runs, `initialCount` will not be 0. The test handles this with `parseInt(initialCountText || '0')` and expects `initialCount + 1`, which is sound for a count increment, but the test does not account for the possibility that `registerPlayer` fails (the player may already be registered from a prior run with the same identity). If the player is already registered, `registerPlayer` may be a no-op or error, and `spawnShip` requires an existing player — the test may then fail in an unexpected way.

**Fix:** Add a guard or use `--in-memory` consistently for local dev. At minimum, wrap the `page.evaluate` in a try/catch and surface errors in the test:
```typescript
const error = await page.evaluate(async () => {
  try {
    const manager = window.spacetimeManager;
    await manager.registerPlayer('TestPlayer');
    await new Promise(resolve => setTimeout(resolve, 500));
    await manager.spawnShip('ArleighBurke', 100, 100);
    return null;
  } catch (e) {
    return String(e);
  }
});
expect(error).toBeNull(); // surfaces reducer errors instead of silently timing out
```

---

### WR-05: `isWaypointValid` uses radial distance — rectangular canvas spawn rejected near corners

**File:** `client/src/interactions.ts:310-315`

**Issue:** Validity is checked as `sqrt(x² + y²) <= 5000`. The coordinate origin in `canvasToWorld` is the viewport center (lines 289-294), so clicks at large canvas coordinates near corners (e.g., a 1920x1080 viewport with scale=1 yields world coords up to ~(960, 540)) are accepted. However, the magic constant `5000` appears with no relationship to actual game world bounds defined anywhere in the reviewed code. If the server enforces different bounds (e.g., a 1000x1000 world), the client will call `spawnShip` and `setWaypoint` with out-of-bounds coordinates that the server silently rejects, while the UI shows "Spawning..." with no error feedback. The user is left confused.

**Fix:** Extract the bound as a named constant that matches the server-side world bounds, or read it from a shared config. At minimum, document the source of the magic number:
```typescript
/** World radius in units — must match the server's WORLD_RADIUS constant in lib.rs */
private static readonly WORLD_RADIUS = 5000;

private isWaypointValid = (worldX: number, worldY: number): boolean => {
  const d = Math.sqrt(worldX * worldX + worldY * worldY);
  return d <= InteractionManager.WORLD_RADIUS;
};
```

---

## Info

### IN-01: `console.log` in E2E test leaks browser logs into CI output

**File:** `client/e2e/connection.spec.ts:4`

**Issue:** `page.on('console', msg => console.log(...))` forwards all browser console messages to the test runner's stdout. In CI this means every SpaceTimeDB SDK log, heartbeat, and subscription event is printed in the GitHub Actions log, making failures harder to diagnose. The listener is only present in `connection.spec.ts` and not `gameplay.spec.ts`, which is inconsistent.

**Fix:** Remove the console listener or scope it to warnings/errors only:
```typescript
page.on('console', msg => {
  if (msg.type() === 'error') console.error(`BROWSER ERROR: ${msg.text()}`);
});
```

---

### IN-02: `destroy()` in `InteractionManager` does not unsubscribe from `spacetimeManager`

**File:** `client/src/interactions.ts:342-345`

**Issue:** `destroy()` removes the canvas event listeners but does not call the unsubscribe function returned by `spacetimeManager.subscribe()` at line 73-75. The subscription function closure captures `this`, so when `InteractionManager` is destroyed (e.g., hot-reload or test teardown), the listener remains in the `SpacetimeManager.listeners` Set indefinitely, preventing garbage collection and calling `this.updatePlayerState()` on a destroyed instance.

**Fix:** Store and call the returned unsubscribe function:
```typescript
private unsubscribe: (() => void) | null = null;

constructor(...) {
  // ...
  this.unsubscribe = this.spacetimeManager.subscribe(() => {
    this.updatePlayerState();
  });
}

public destroy = (): void => {
  this.canvas.removeEventListener('click', this.handleLeftClick);
  this.canvas.removeEventListener('contextmenu', this.handleRightClick);
  this.unsubscribe?.();
};
```

---

### IN-03: Magic number `500ms` delay in E2E test is fragile

**File:** `client/e2e/gameplay.spec.ts:25`

**Issue:** `await new Promise(resolve => setTimeout(resolve, 500))` is used to wait for server registration to process. This is a time-based wait with no condition check. On a slow CI runner (high load, cold start), 500ms may not be enough; on a fast machine it wastes time. Playwright's `waitForFunction` or polling the `#ships-count` element is more reliable.

**Fix:** Replace the fixed sleep with a condition-based wait:
```typescript
// After registerPlayer, poll until the player appears in manager state
await page.waitForFunction(
  () => {
    const mgr = (window as any).spacetimeManager;
    const id = mgr.getUserIdentity();
    return id != null && mgr.getPlayer(id) != null;
  },
  { timeout: 5000 }
);
```

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
