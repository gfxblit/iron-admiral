# Project Instructions

These instructions apply to all agents working in this repository.
<!-- ci-verify: e2e gate check -->

## Verification Requirement (per Phase 3 D-04)

After every `/gsd-execute-phase`, the executor MUST run `pnpm test:e2e` from the `client/` directory as the primary E2E verification gate. Playwright is the proof that frontend changes correctly interact with the backend state and vice-versa.

Run command:

```
cd client && pnpm test:e2e
```

A passing run is required before marking a plan complete. On failure, inspect the Playwright report at `client/playwright-report/` and screenshots at `client/e2e-screenshots/`.

## Local Prerequisite (per Phase 3 D-01)

SpaceTimeDB does NOT auto-start for local development. Before running `pnpm test:e2e`, the developer (or agent) MUST start a local SpaceTimeDB instance on port 3000:

```
spacetime start --local
spacetime publish iron-admiral --local
```

Tests assume the backend is already running and the `iron-admiral` module is published. Tests will fail with connection-timeout errors if these steps are skipped.

## CI Behavior (per Phase 3 D-02, D-03)

On CI, the E2E job (`.github/workflows/ci.yml`) installs the SpaceTimeDB CLI, starts a local instance, publishes the module, and runs `pnpm test:e2e` automatically. The E2E job runs only on `pull_request` events targeting `main` — not on every commit or push to feature branches.

On CI failure, the Playwright report is uploaded as the `playwright-report` artifact for diagnosis without re-running.

## Tracked vs. Ignored Files (per Phase 3 D-05, D-06)

Tracked (commit changes here):
- `client/e2e/*.spec.ts`
- `client/playwright.config.ts`

Ignored (ephemeral, never commit):
- `client/e2e-screenshots/`
- `client/playwright-report/`
- `client/test-results/`
