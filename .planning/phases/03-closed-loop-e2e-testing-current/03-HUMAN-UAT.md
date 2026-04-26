---
status: passed
phase: 03-closed-loop-e2e-testing-current
source: [03-VERIFICATION.md]
started: 2026-04-26T18:35:00Z
updated: 2026-04-26T20:35:00Z
---

## Current Test

PR-only gating confirmation (item 2) — pending manual observation.

## Tests

### 1. E2E job execution on a real PR
expected: Open a PR targeting main. The `e2e` job appears alongside other jobs, waits for `client-validation` and `server-validation`, then runs. SpacetimeDB start step logs `SpacetimeDB is up after Ns`. Publish step succeeds. Playwright runs and reports results. If tests fail, `playwright-report` and `playwright-screenshots` artifacts appear on the run summary page.
result: PASSED — PR #5 (ci/verify-e2e-gate). e2e job passed (1m16s). SpacetimeDB up after 2s. 3 Playwright tests passed (4.6s). Artifact upload step present with if:failure() guard.

### 2. PR-only gating confirmation
expected: Push a commit directly to main (not via a PR) and observe the GitHub Actions workflow run. The `e2e` job does NOT appear in the workflow run. Only client-validation, server-validation, client-deployment, and server-deployment are triggered.
result: PASSED — run 24966350582 (push event on main). e2e job shows `-` (skipped). Only client-validation, server-validation, client-deployment, server-deployment ran. PR-only guard confirmed.

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
