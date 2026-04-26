---
status: partial
phase: 03-closed-loop-e2e-testing-current
source: [03-VERIFICATION.md]
started: 2026-04-26T18:35:00Z
updated: 2026-04-26T18:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. E2E job execution on a real PR
expected: Open a PR targeting main. The `e2e` job appears alongside other jobs, waits for `client-validation` and `server-validation`, then runs. SpacetimeDB start step logs `SpacetimeDB is up after Ns`. Publish step succeeds. Playwright runs and reports results. If tests fail, `playwright-report` and `playwright-screenshots` artifacts appear on the run summary page.
result: [pending]

### 2. PR-only gating confirmation
expected: Push a commit directly to main (not via a PR) and observe the GitHub Actions workflow run. The `e2e` job does NOT appear in the workflow run. Only client-validation, server-validation, client-deployment, and server-deployment are triggered.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
