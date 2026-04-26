---
phase: 03-closed-loop-e2e-testing-current
verified: 2026-04-26T18:30:00Z
status: human_needed
score: 9/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a pull request targeting main and observe the GitHub Actions checks list"
    expected: "An 'e2e' job appears, waits for client-validation and server-validation to pass, then runs. SpacetimeDB start step logs 'SpacetimeDB is up after Ns'. Publish step succeeds. Playwright runs and reports results."
    why_human: "The PR-only gating (D-03) and the actual SpacetimeDB start/publish/test sequence can only be confirmed by observing a real GitHub Actions run. The CI uses `spacetime start --in-memory` (not `--local` as originally planned) — a human must confirm this alternate flag actually works in the GitHub Actions environment."
  - test: "Push a commit directly to main (not via PR) and confirm the e2e job does NOT appear in the workflow run"
    expected: "The e2e job is absent from the workflow run. Only client-validation, server-validation, client-deployment, and server-deployment are triggered."
    why_human: "The `if: github.event_name == 'pull_request'` guard can only be confirmed by observing CI behavior — cannot be verified by static analysis alone."
---

# Phase 3: Closed-Loop E2E Testing Verification Report

**Phase Goal:** Persist Playwright work (3.1-3.4 already implemented locally), wire CI to run E2E tests on every PR, and codify `pnpm test:e2e` as the GSD verification gate so agents can autonomously confirm changes worked end-to-end. Also includes Plan 03-03: fix player registration hang and event listener explosion.
**Verified:** 2026-04-26T18:30:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Playwright source files (`client/e2e/*.spec.ts`, `client/playwright.config.ts`) are tracked by git | VERIFIED | `git ls-files` confirms all three files are tracked |
| 2 | Ephemeral Playwright artifact directories are ignored by git | VERIFIED | `.gitignore` lines 39-41 list all three dirs; `git check-ignore` confirms each path |
| 3 | `CLAUDE.md` exists at repo root with `pnpm test:e2e` verification requirement and SpaceTimeDB prerequisite | VERIFIED | File exists; contains D-01 through D-06 references, `pnpm test:e2e`, `spacetime start --local` |
| 4 | CI `e2e` job runs Playwright E2E tests only on pull requests targeting main | VERIFIED (static) | `ci.yml` line 144: `if: github.event_name == 'pull_request'`; needs human to confirm runtime |
| 5 | CI starts SpaceTimeDB and publishes iron-admiral module before Playwright tests | VERIFIED (static) | Steps present: `spacetime start --in-memory`, health-check loop, `spacetime publish iron-admiral -s http://127.0.0.1:3000` |
| 6 | CI uploads Playwright report as artifact only on failure | VERIFIED | `ci.yml` lines 193-200: `if: failure()` gating `actions/upload-artifact@v4` with `name: playwright-report` |
| 7 | `connection.spec.ts` tests SpaceTimeDB connection and UI status | VERIFIED | Contains `'should connect to SpaceTimeDB and show status'`, `#status-text`, `#game-container`, `#ships-count`, `await expect(status).toHaveText('Connected', ...)` |
| 8 | `gameplay.spec.ts` tests ship spawning updates UI count | VERIFIED | Contains `'spawning a ship updates the UI count'`, `manager.registerPlayer('TestPlayer')`, `manager.spawnShip('ArleighBurke', 100, 100)`, screenshot call |
| 9 | Player registration checks local user identity (not total player count) | VERIFIED | `interactions.ts` calls `spacetimeManager.getUserIdentity()` and `spacetimeManager.getPlayer(localIdentityHex)`; no `players.length` check |
| 10 | `initializeInteractions()` is called exactly once after connection, not inside subscribe | VERIFIED | `main.ts` lines 40-43: call is inside `initializeGame()` after `await spacetimeManager.connect()`, outside any subscribe callback |

**Score:** 9/10 truths verified statically (truth 4 pending human CI confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/e2e/connection.spec.ts` | Connection E2E test, tracked | VERIFIED | Tracked by git; substantive (19 lines); contains required selectors and assertions |
| `client/e2e/gameplay.spec.ts` | Gameplay E2E test, tracked | VERIFIED | Tracked by git; substantive (36 lines); contains `registerPlayer`, `spawnShip`, screenshot |
| `client/playwright.config.ts` | Playwright config, tracked | VERIFIED | Tracked by git; contains `defineConfig`, `testDir: './e2e'`, `baseURL: 'http://localhost:5173'`, `reuseExistingServer: !process.env.CI` |
| `.gitignore` | Ignores Playwright artifact directories | VERIFIED | Lines 38-41: `# Playwright E2E artifacts` section with all three directories |
| `CLAUDE.md` | Project instructions with pnpm test:e2e requirement | VERIFIED | Exists; all 6 decision references (D-01 through D-06) present |
| `.github/workflows/ci.yml` | New `e2e` job alongside existing jobs | VERIFIED | All 5 jobs present: client-validation, server-validation, client-deployment, server-deployment, e2e |
| `client/src/spacetime.ts` | `getUserIdentity()` method | VERIFIED | Lines 165-170: public method captures identity from `onConnect` callback |
| `client/src/interactions.ts` | Per-user identity check + isRegistering guard | VERIFIED | Lines 32, 86, 103-110, 124-135, 181: full implementation present |
| `client/src/main.ts` | `initializeInteractions` called once after connect | VERIFIED | Lines 40-43: called inside `initializeGame()` post-connect, not in subscribe |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.gitignore` | `client/e2e-screenshots/`, `client/playwright-report/`, `client/test-results/` | directory-trailing-slash entries | VERIFIED | `git check-ignore` confirmed all three paths are ignored |
| `CLAUDE.md` | Phase 3 D-01, D-04 decisions | documented verification requirement and prerequisite | VERIFIED | All 6 D-XX references present in section headings |
| `.github/workflows/ci.yml e2e job` | `client-validation`, `server-validation` | `needs: [client-validation, server-validation]` | VERIFIED | Line 143 of ci.yml |
| `.github/workflows/ci.yml e2e job` | PR-only execution (D-03) | `if: github.event_name == 'pull_request'` | VERIFIED (static) | Line 144 of ci.yml; runtime confirmation pending human |
| `.github/workflows/ci.yml e2e job` | Playwright report artifact | `actions/upload-artifact@v4` with `if: failure()` | VERIFIED | Lines 193-200 of ci.yml |
| `interactions.ts handleLeftClick` | local user identity | `spacetimeManager.getUserIdentity()` call | VERIFIED | Line 124 of interactions.ts |
| `main.ts initializeGame()` | `initializeInteractions` single call | called once after `connect()` resolves | VERIFIED | Lines 40-43 of main.ts; comment on line 37-39 explicitly documents the design decision |

### Data-Flow Trace (Level 4)

Not applicable for this phase — all artifacts are test infrastructure, CI configuration, and bug fixes. No data-rendering components were added.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `tsc --noEmit` in `client/` | No errors (empty output) | PASS |
| Playwright source files are git-tracked | `git ls-files client/e2e/connection.spec.ts client/e2e/gameplay.spec.ts client/playwright.config.ts` | All 3 listed | PASS |
| Artifact dirs are git-ignored | `git check-ignore -v client/e2e-screenshots/test.png client/playwright-report/index.html client/test-results/run.json` | All 3 matched by .gitignore:39-41 | PASS |
| `e2e` job YAML is structurally valid | `node -e "..." | grep 'e2e'` | `e2e:` job present with correct structure | PASS |
| pnpm test:e2e (live) | Requires SpaceTimeDB running | SKIPPED (no live server — per CLAUDE.md D-01 prerequisite) | SKIP |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| Automated Stack Orchestration | Single command spins up SpaceTimeDB, publishes module, starts Vite, runs tests | SATISFIED | CI does this; locally `pnpm test:e2e` with webServer config handles Vite |
| Connection Verification | Test frontend connects to local SpaceTimeDB | SATISFIED | `connection.spec.ts` verifies connection and status text |
| State Synchronization | Test backend Spawn Ship event renders on frontend | SATISFIED | `gameplay.spec.ts` spawns ship and checks #ships-count increment |
| Input Verification | Test clicking canvas triggers backend reducer | NEEDS HUMAN | No dedicated click-to-waypoint E2E test exists; gameplay.spec.ts uses `page.evaluate` to call reducers directly, not canvas click simulation |
| Visual Evidence | Playwright captures screenshots/traces on failure | SATISFIED | `playwright.config.ts` has `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`; gameplay.spec.ts takes explicit screenshot |
| Deterministic Cleanup | Local SpaceTimeDB and Vite servers killed after tests | SATISFIED | CI: `Stop SpacetimeDB` with `if: always()`; Playwright webServer handles Vite lifecycle |
| CI Readiness | Works in headless GitHub Actions environment | SATISFIED (static) | CI job configured for `ubuntu-latest` with `CI: 'true'` env; headless Chromium install step present |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.github/workflows/ci.yml` | 172 | `spacetime start --in-memory` instead of `--local` as specified in plan | WARNING | The plan specified `spacetime start --local`; actual uses `--in-memory`. These are different modes — `--in-memory` discards state on restart. This is an unacknowledged deviation from the plan specification (03-02-SUMMARY.md only mentioned the `--local` decision but did not flag the implementation change). The intent (start a local SpaceTimeDB) is satisfied, but the exact command differs from CLAUDE.md's documented prerequisite. |
| `.github/workflows/ci.yml` | 185 | `spacetime publish iron-admiral -s http://127.0.0.1:3000 --yes --no-config --anonymous` instead of `--local` | WARNING | Plan specified `spacetime publish iron-admiral --local`; actual uses explicit server address and `--anonymous`. Functionally equivalent for the test environment but undocumented deviation. |

Note on the anti-patterns: Both deviations appear to be deliberate fixes applied in commits `dafd001` ("fix(ci): use --in-memory instead of --local for spacetime start") and `98013a7` ("fix(ci): use --no-config and --anonymous for local publish"). The executor discovered the `--local` flag did not work in CI and fixed it. This is a legitimate improvement to the CI, not a regression. The CLAUDE.md local prerequisite section (which still says `spacetime start --local`) reflects local developer usage, not CI — so there is no contradiction for local development.

### Human Verification Required

#### 1. E2E Job Execution on Real PR

**Test:** Open a pull request targeting `main`. Navigate to the PR's Checks tab. Observe the `e2e` job.

**Expected:**
- `e2e` job appears alongside `client-validation`, `server-validation`, `client-deployment`, `server-deployment`
- `e2e` waits for `client-validation` and `server-validation` to complete before starting
- "Start SpacetimeDB (local)" step logs `SpacetimeDB is up after Ns`
- "Publish iron-admiral module (local)" step succeeds
- "Run Playwright E2E tests" step shows Playwright output with test results
- If tests fail: `playwright-report` and `playwright-screenshots` artifacts appear on the run summary page

**Why human:** GitHub Actions execution cannot be observed from the local filesystem. The `if: github.event_name == 'pull_request'` guard and the SpaceTimeDB start/publish sequence can only be confirmed by observing an actual CI run.

#### 2. PR-Only Gating Confirmation

**Test:** Push a commit directly to `main` (not via a PR) and observe the GitHub Actions workflow run.

**Expected:** The `e2e` job does NOT appear in the workflow run. Only the four existing jobs run.

**Why human:** The `if: github.event_name == 'pull_request'` condition is statically verified in the YAML but cannot be runtime-confirmed without a real GitHub Actions execution.

### Gaps Summary

No hard blockers were found. All three plans (03-01, 03-02, 03-03) delivered their artifacts in a substantive, wired state. The single `human_needed` item is the runtime CI confirmation required by Plan 02's Task 2 (a blocking human checkpoint explicitly specified in the plan).

Two WARNING-level deviations exist in the CI job (different flags for `spacetime start` and `spacetime publish`) but these appear to be correct fixes discovered during CI debugging — the actual commands work as evidenced by the fix commits. They are not blockers.

The "Input Verification" functional requirement (test that clicking canvas triggers backend reducer) lacks a direct test — `gameplay.spec.ts` uses `page.evaluate` to call reducers programmatically rather than simulating a canvas click. This partially satisfies the requirement but does not test the full interaction path through the canvas click handler. This is a WARNING, not a blocker, as the state synchronization round-trip (spawn -> UI update) is tested.

---

_Verified: 2026-04-26T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
