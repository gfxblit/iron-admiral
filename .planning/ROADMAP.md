# Roadmap: Iron Admiral

## Phase 1: Backend & Physics ✓ Complete
## Phase 2: End-to-End & Basic Rendering ✓ Complete

## Phase 3: Closed-Loop E2E Testing ✓ Complete
**Goal:** Persist Playwright work (3.1–3.4 already implemented locally), wire CI to run E2E tests on every PR, and codify `pnpm test:e2e` as the GSD verification gate so agents can autonomously confirm changes worked end-to-end.

**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md — Track Playwright source files, ignore artifacts, write CLAUDE.md verification requirement (D-01, D-04, D-05, D-06)
- [x] 03-02-PLAN.md — Add `e2e` job to GitHub Actions (PR-only trigger, SpaceTimeDB local orchestration, Playwright report artifact on failure) (D-02, D-03, D-07)

Existing milestone subtasks (work already partially completed locally — see STATE.md):
- [x] 3.1: Playwright Installation & Base Config
- [x] 3.2: SpaceTimeDB Local Orchestration (Test Runner)
- [x] 3.3: Base E2E Test (Connection & Handshake)
- [x] 3.4: Visual/Canvas Verification Test
- [x] 3.5: CI Integration (GitHub Actions update) — covered by 03-02-PLAN.md

## Phase 4: Advanced Mechanics & UI (Current)
- [ ] Fog of War
- [ ] Advanced UI Overlays
