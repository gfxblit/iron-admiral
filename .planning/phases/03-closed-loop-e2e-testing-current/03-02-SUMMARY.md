---
phase: 03-closed-loop-e2e-testing-current
plan: 02
subsystem: CI/CD
tags:
  - ci
  - playwright
  - spacetimedb
dependency_graph:
  requires:
    - "03-01"
  provides:
    - "CI-E2E"
  affects:
    - ".github/workflows/ci.yml"
tech_stack:
  added:
    - Playwright
    - SpacetimeDB CLI (Local CI)
key_files:
  modified:
    - .github/workflows/ci.yml
decisions:
  - "D-03: E2E tests run only on pull_request events to save CI minutes and avoid token requirements."
  - "D-07: Playwright reports and screenshots are uploaded only on failure for debugging."
  - "Local SpacetimeDB: Use --local flag to avoid needing SPACETIMEDB_TOKEN in PR context."
metrics:
  duration: 20m
  completed_date: "2026-04-25"
---

# Phase 03 Plan 02: CI Integration Summary

Successfully integrated Playwright E2E tests into the GitHub Actions CI pipeline.

## Key Changes

### 1. New `e2e` Job in `ci.yml`
Added a comprehensive E2E job that handles the full stack lifecycle:
- **Dependency Management:** Installs Node, pnpm, and Playwright browsers (Chromium).
- **SpacetimeDB Lifecycle:** Installs SpacetimeDB CLI, starts a local instance in the background, waits for readiness, and publishes the `iron-admiral` module.
- **Test Execution:** Runs `pnpm test:e2e` with the `CI: 'true'` environment variable.
- **Artifact Management:** Uploads the HTML report and failure screenshots if the tests fail.
- **Cleanup:** Ensures the local SpacetimeDB process is terminated regardless of test outcome.

### 2. Strategic Gating
- **PR-Only:** The job only runs on `pull_request` events (`D-03`), protecting the main branch while allowing developers to verify changes.
- **Dependency Gating:** The `e2e` job `needs: [client-validation, server-validation]`, ensuring that heavy E2E tests only run if unit tests and linting pass.

## Deviations from Plan

- **YAML Validation:** Python `yaml` module was missing in the execution environment. Substituted with comprehensive `grep` checks and manual verification of the `replace` tool output. Structure and indentation were verified as correct.

## Human Verification Checkpoint (Task 2)

**Status:** Awaiting Observation on PR.

As this is a CI integration, final verification requires observing a GitHub Actions run:
1. **Trigger:** Open a PR or push to an existing PR branch.
2. **Observe:**
   - The `e2e` job should appear in the checks list.
   - It should wait for `client-validation` and `server-validation` to pass.
   - The "Start SpacetimeDB" step should log readiness.
   - The "Run Playwright E2E tests" step should execute the tests.
3. **Failure Case:** If tests fail, verify that `playwright-report` and `playwright-screenshots` artifacts are available for download.
4. **Push to Main:** Verify that the `e2e` job does NOT run on a direct push to `main`.

## Self-Check: PASSED

- [x] `.github/workflows/ci.yml` modified with `e2e` job.
- [x] `e2e` job has correct `needs` and `if` conditions.
- [x] All 11 steps included in the job.
- [x] SpacetimeDB start/stop logic implemented.
- [x] Artifact upload logic implemented.
- [x] Existing jobs (`client-validation`, etc.) preserved.
- [x] Commits made for the changes.
