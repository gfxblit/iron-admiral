# Project: Iron Admiral

## Overview
Top-Down Tactical Naval Simulation with authoritative SpaceTimeDB backend and Vite/TypeScript frontend.

## Goals
- Authoritative real-time physics and kinematics.
- Tactical naval combat (missiles, radar, CIWS).
- Reactive 2D canvas visualization.
- **Milestone 3: Closed-Loop Reliability.** Enable agents to verify E2E behavior automatically.

## Tech Stack
- **Backend:** SpaceTimeDB (Rust)
- **Frontend:** TypeScript + HTML5 Canvas (Vite)
- **Communication:** SpaceTimeDB SDK (WebSockets)
- **E2E Testing:** Playwright

## Current State
Phase 4 complete (2026-05-02) — Touch-first UI controls in place: floating action overlay (RADAR/FIRE/DESEL buttons, 60×60px iOS targets), radar ring visualization on canvas, fire mode targeting highlight, keyboard shortcuts (R/F/Escape), iOS touch interception. SpaceTimeDB reducer bug fixed (object-form args). 9/9 E2E tests passing.

Next: Phase 5 — Advanced Mechanics & UI.

## Validated Requirements
- E2E Playwright tests run on every PR via GitHub Actions (validated in Phase 3)
- `pnpm test:e2e` is the GSD verification gate for all agents (validated in Phase 3)
- Player registration uses local identity check, not global player count (validated in Phase 3)
- UI controls surface radar toggle and missile firing without browser devtools (validated in Phase 4)
- SpaceTimeDB SDK reducers require object-form args matching reducer schema (validated in Phase 4)

_Last updated: 2026-05-02_
