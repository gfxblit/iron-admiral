# Requirements: Milestone 3 - Closed-Loop E2E Testing

## Goal
Implement a testing framework that allows an agent to verify that frontend changes correctly interact with the backend state and vice-versa.

## Functional Requirements
- **Automated Stack Orchestration:** A single command should spin up a local SpaceTimeDB instance, publish the backend module, start the Vite dev server, and run tests.
- **Connection Verification:** Test that the frontend successfully connects to the local SpaceTimeDB instance.
- **State Synchronization:** Test that a backend "Spawn Ship" event is correctly rendered on the frontend canvas.
- **Input Verification:** Test that clicking the canvas (e.g., to set a waypoint) triggers the correct backend reducer.

## Non-Functional Requirements
- **Visual Evidence:** Playwright must be configured to capture screenshots/traces on failure for agent diagnosis.
- **Deterministic Cleanup:** Ensure local SpaceTimeDB processes and Vite servers are killed after test completion.
- **CI Readiness:** The setup must work in a headless environment (GitHub Actions).

## Success Criteria
- [x] `pnpm test:e2e` runs successfully from the root or client directory.
- [x] A test exists that verifies a ship spawned in the backend appears in the frontend DOM/Canvas state.
- [x] Playwright Trace Viewer is configured and producing artifacts on failure.
