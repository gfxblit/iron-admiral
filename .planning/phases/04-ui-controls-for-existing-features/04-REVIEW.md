---
phase: 04-ui-controls-for-existing-features
reviewed: 2026-05-02T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - client/e2e/ui_controls.spec.ts
  - client/src/renderer.ts
  - client/src/interactions.ts
  - client/src/main.ts
  - client/src/spacetime.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-02
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase adds the mobile action overlay (RADAR, FIRE, DESEL buttons), keyboard shortcuts, fire-mode targeting visuals, and radar ring rendering. The overlay wiring and keyboard handler logic are generally sound. Two blockers were found: a stale-selection bug when a ship is destroyed, and a premature "Connected" status display caused by `connect()` resolving before the WebSocket handshake completes. Four warnings cover a timer race in the status element, an opaque fire-target highlight that obscures the ship beneath, an unsanitized URL query parameter, and a flaky hardcoded sleep in the E2E beforeEach. Three info-level items cover dead code.

---

## Critical Issues

### CR-01: Stale `selectedShipId` when selected ship is destroyed server-side

**File:** `client/src/interactions.ts:192-217`

**Issue:** `updatePlayerState()` is invoked on every SpaceTimeDB table notification, including `ship.onDelete`. It rebuilds `playerShips` but never checks whether `selectedShipId` still refers to an existing ship. If a missile destroys the currently-selected ship, `selectedShipId` retains the dead ship's ID. The mobile action overlay stays visible (`updateMobileActionsVisibility` only reads `selectedShipId !== null`), and clicking RADAR or FIRE then submits reducer calls with the stale ID. The server silently rejects them; the UI has no recovery path.

**Fix:** In `updatePlayerState`, after rebuilding `playerShips`, verify that `selectedShipId` is still present in the live ship list, and call `deselectShip()` if not:

```typescript
private updatePlayerState = (): void => {
  const localIdentityHex = this.spacetimeManager.getUserIdentity();
  const ships = this.spacetimeManager.getShips();

  if (!localIdentityHex) return;

  const shipIds = new Set(ships.map(s => s.id));

  // Clear stale selection when the selected ship no longer exists
  if (this.selectedShipId !== null && !shipIds.has(this.selectedShipId)) {
    this.deselectShip();
    this.showStatus('Selected ship was destroyed');
  }

  this.playerShips.clear();
  for (const ship of ships) {
    const ownerIdentity = ship.ownerId as unknown as { toHexString?: () => string };
    const shipOwnerHex = ownerIdentity.toHexString?.() || String(ship.ownerId);
    if (shipOwnerHex === localIdentityHex) {
      this.playerShips.add(ship.id);
    }
  }
  // ... rest unchanged
};
```

---

### CR-02: `connect()` resolves and shows "Connected" before WebSocket handshake completes

**File:** `client/src/spacetime.ts:68-131` / `client/src/main.ts:39-40`

**Issue:** `SpacetimeManager.connect()` is declared `async` and builds the `DbConnection` synchronously via `build()`. It returns (resolves its promise) immediately after `build()` completes — before the `onConnect` callback fires. `main.ts` then calls `updateStatus("Connected")` on line 40, displaying "Connected" in the HUD while `isConnected` is still `false`. The E2E `beforeEach` waits for `#status-text` to read "Connected" as its signal that setup is safe to proceed; it receives that signal while the connection is only _initiating_, not established. Any reducer call made in the window between `connect()` returning and `onConnect` firing will proceed (the `connection` object exists) but the WebSocket channel may not yet be open; the SDK may silently discard or error these calls.

**Fix:** `connect()` must not resolve until `onConnect` fires. Wrap the connection in a `Promise` that resolves from inside the callback:

```typescript
public async connect(wsUrl: string = 'ws://localhost:3000'): Promise<void> {
  if (this.isConnected) return;
  if (this.isConnecting) {
    throw new Error('[SpacetimeManager] Connection already in progress');
  }
  this.isConnecting = true;

  return new Promise<void>((resolve, reject) => {
    try {
      this.connection = DbConnection.builder()
        .withUri(wsUrl)
        .withDatabaseName('iron-admiral')
        .onConnect((_conn: DbConnection, identity: Identity) => {
          this.localIdentity = identity;
          this.isConnected = true;
          this.isConnecting = false;
          this.handleConnectionEstablished();
          resolve();   // <-- resolves only when truly connected
        })
        .onConnectError((error) => {
          this.isConnecting = false;
          this.isConnected = false;
          reject(error);  // <-- propagates to main.ts catch block
        })
        // ... rest of builder chain
        .build();
    } catch (error) {
      this.isConnecting = false;
      reject(error);
    }
  });
}
```

---

## Warnings

### WR-01: `showStatus()` timer race — earlier timers silently clear later messages

**File:** `client/src/interactions.ts:583-593`

**Issue:** Each `showStatus()` call schedules a `setTimeout` after 3 seconds to blank the status element. The handle is never stored, so previous timers cannot be cancelled. When multiple actions fire in quick succession (e.g., user clicks FIRE then DESEL within 3 seconds), the timer from the first call clears the text set by the second call, leaving the status blank before the intended 3-second window for the second message has elapsed. This can cause E2E tests to miss status text that was just set.

**Fix:**

```typescript
private statusTimerId: ReturnType<typeof setTimeout> | null = null;

private showStatus = (message: string): void => {
  if (this.statusElement) {
    this.statusElement.textContent = message;
    if (this.statusTimerId !== null) {
      clearTimeout(this.statusTimerId);
    }
    this.statusTimerId = setTimeout(() => {
      if (this.statusElement) this.statusElement.textContent = '';
      this.statusTimerId = null;
    }, 3000);
  }
};
```

---

### WR-02: Fire-mode targeting circle uses opaque fill — obscures ship beneath

**File:** `client/src/renderer.ts:175-181`

**Issue:** The fire-mode targeting highlight is drawn with `fillStyle = this.colors.fireModeTarget` (`'#FF6B6B'` — fully opaque red). The 28 px circle is drawn on top of ships and completely covers the ship triangle, making it impossible to identify the targeted ship type. The same color is also used as the selected-ship outline color (`this.colors.selected`), creating ambiguity between "this ship is selected" and "this ship is a fire target."

**Fix:** Use a semi-transparent fill and a distinct stroke color:

```typescript
// In colors definition:
fireModeTarget: 'rgba(255, 107, 107, 0.35)',   // semi-transparent red
fireModeTargetStroke: '#FF0000',
```

---

### WR-03: Unsanitized `stdb` query parameter passed directly into WebSocket URL

**File:** `client/src/main.ts:33-38`

**Issue:** The `stdb` query parameter is taken verbatim and concatenated into `ws://${stdbParam}` without any validation. An attacker who can control the URL (e.g., via phishing) can redirect the client's WebSocket connection to an arbitrary host. While this is a development convenience feature (LAN/iPad access), there is no guard (allowlist of hosts, hostname-only validation, or stripping of path/port manipulation characters) preventing abuse.

**Fix:** Validate that the parameter contains only a `host[:port]` pattern before use:

```typescript
const stdbParam = new URLSearchParams(window.location.search).get("stdb");
const hostPortPattern = /^[a-zA-Z0-9.\-]+(:\d+)?$/;
const stdbUrl = stdbParam && hostPortPattern.test(stdbParam)
  ? `ws://${stdbParam}`
  : `ws://${window.location.host}`;
```

---

### WR-04: Hardcoded 500 ms sleep between `registerPlayer` and `spawnShip` in E2E `beforeEach` is flaky

**File:** `client/e2e/ui_controls.spec.ts:20-22`

**Issue:** `registerPlayer` and `spawnShip` are both fire-and-forget reducer calls (their `async` wrappers in `spacetime.ts` do not await the server acknowledgement). The test inserts a fixed 500 ms delay and then calls `spawnShip`. If the server is under load, 500 ms may not be enough for the `registerPlayer` reducer to commit before `spawnShip` is dispatched; the server may reject `spawnShip` with "player not registered." The subsequent `await expect(#ships-count).not.toHaveText('0', { timeout: 10000 })` then times out.

**Fix:** Poll for the player to appear in the local state before calling `spawnShip`, rather than sleeping for a fixed duration:

```typescript
await page.evaluate(async () => {
  const manager = (window as any).spacetimeManager;
  await manager.registerPlayer('UIControlsTester');
  // Poll until local player is confirmed, up to 5 s
  const localHex: string = manager.getUserIdentity();
  for (let i = 0; i < 50; i++) {
    if (manager.getPlayer(localHex)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await manager.spawnShip('ArleighBurke', 0, 0);
});
```

---

## Info

### IN-01: Dead ternary branch in `drawShipLabel` — both arms are identical

**File:** `client/src/renderer.ts:340`

**Issue:** `this.ctx.fillStyle = isSelected ? 'white' : 'white'` — both branches evaluate to `'white'`. The conditional adds no value.

**Fix:** Replace with a direct assignment:
```typescript
this.ctx.fillStyle = 'white';
```

---

### IN-02: `radarButton` and `deselectButton` stored as class fields but never read after assignment

**File:** `client/src/interactions.ts:45-47`

**Issue:** `this.radarButton` and `this.deselectButton` are declared as `HTMLButtonElement | null` instance fields, assigned in `createMobileActions`, but never subsequently read. Only `this.fireButton` is read (in `updateFireButtonStyle`). The two fields consume memory and mislead readers into expecting future style updates similar to the fire button.

**Fix:** Remove the `private radarButton` and `private deselectButton` fields. Use local variables inside `createMobileActions` instead. If visual state updates for these buttons are planned (e.g., highlighting when radar is active), retain the fields but document that intent.

---

### IN-03: `initializeRenderer` adds a `resize` event listener that is never removed

**File:** `client/src/renderer.ts:535`

**Issue:** `window.addEventListener('resize', resizeCanvas)` is called in `initializeRenderer` but the listener is never stored or exposed for removal. There is no `destroy()` method on `Canvas2DRenderer` analogous to `InteractionManager.destroy()`. If the renderer is ever re-initialized (e.g., in a test scenario where the page is re-used without a full navigation), listeners accumulate.

**Fix:** Expose the resize handler reference and clean it up:
```typescript
renderer.stop(); // stop the animation loop
window.removeEventListener('resize', resizeCanvas);
```
Or add a `destroy()` method to `Canvas2DRenderer` that cancels the animation frame and removes the resize listener.

---

_Reviewed: 2026-05-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
