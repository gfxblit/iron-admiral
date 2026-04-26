---
phase: "03"
plan: "03"
subsystem: client-interaction
tags: [bug-fix, interaction-loop, spacetimedb, listener, registration]
dependency-graph:
  requires: []
  provides: [stable-interaction-loop, per-user-identity-check]
  affects: [client/src/spacetime.ts, client/src/interactions.ts, client/src/main.ts]
tech-stack:
  added: []
  patterns: [identity-capture-on-connect, single-init-after-connect, registration-guard]
key-files:
  created: []
  modified:
    - client/src/spacetime.ts
    - client/src/interactions.ts
    - client/src/main.ts
decisions:
  - "Capture local identity in onConnect callback (receives identity as argument) rather than polling connection.identity property, ensuring the hex is available before any click occurs"
  - "isRegistering guard reset inside updatePlayerState subscription so it clears exactly when the server confirms the player row exists"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-26T16:03:08Z"
  tasks: 3
  files_modified: 3
---

# Phase 03 Plan 03: Interaction Loop Stabilization Summary

**One-liner:** Fixed player registration hang and listener explosion by capturing local identity on connect, adding registration guard, and moving initializeInteractions out of subscribe callback.

## What Was Done

Two bugs were diagnosed and fixed:

**Bug 1 - Listener Explosion** (`main.ts`)

`initializeInteractions()` was called inside `spacetimeManager.subscribe()`, causing a new `InteractionManager` instance (with new event listeners) to be created on every state update from the server (10Hz). Over time this caused unbounded listener accumulation.

**Fix:** Move `initializeInteractions()` to execute exactly once inside `initializeGame()`, after `await spacetimeManager.connect()` resolves. The subscribe block for counts update is retained.

**Bug 2 - Global Registration Check** (`interactions.ts` + `spacetime.ts`)

`handleLeftClick` checked `players.length === 0` to decide whether to register. As soon as any other player joined the server (or a previous session's player row persisted), this check returned `false` and the local user was never prompted to register.

**Fix:**
1. Added `getUserIdentity(): string | null` to `SpacetimeManager` — captures the `Identity` object provided by the `onConnect` builder callback and returns it as a hex string.
2. `handleLeftClick` now calls `spacetimeManager.getPlayer(localIdentityHex)` to check if the *current user* is registered, not any arbitrary player.
3. Added `isRegistering: boolean` guard that is set to `true` when `registerPlayer()` is called and cleared in `updatePlayerState()` once the server confirms the player row. Rapid clicks during the registration window show "Registering... please wait" instead of firing duplicate reducer calls.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add getUserIdentity() to SpacetimeManager | 771c903 |
| 2 | Fix identity check and add isRegistering guard in InteractionManager | 771c903 |
| 3 | Move initializeInteractions out of subscribe in main.ts | 771c903 |

(All three changes committed atomically as `fix(03-03): stabilize interaction loop registration and listener explosion`)

## Deviations from Plan

None - plan executed exactly as written. The three proposed changes (SpacetimeManager, InteractionManager, main.ts) were implemented as specified.

## Known Stubs

None.

## E2E Verification Status

SpaceTimeDB was not running in the local agent environment (prerequisite per CLAUDE.md D-01). TypeScript compilation passed clean (`tsc --noEmit` with no errors). E2E verification (`pnpm test:e2e`) will run automatically in CI when a pull request is opened targeting `main` (per D-02, D-03).

## Threat Flags

None - no new network endpoints, auth paths, or schema changes introduced.

## Self-Check

- [x] `client/src/spacetime.ts` modified with getUserIdentity() - FOUND
- [x] `client/src/interactions.ts` modified with identity check + isRegistering - FOUND
- [x] `client/src/main.ts` modified with single-init pattern - FOUND
- [x] Commit 771c903 exists - FOUND

## Self-Check: PASSED
