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
Phase 3 complete (2026-04-26) — E2E test infrastructure in place: Playwright specs tracked, CI `e2e` job wired (PR-only), interaction loop stabilized (listener explosion + per-user identity check fixed).

Next: Phase 4 — UI Controls for Existing Features.

## Validated Requirements
- E2E Playwright tests run on every PR via GitHub Actions (validated in Phase 3)
- `pnpm test:e2e` is the GSD verification gate for all agents (validated in Phase 3)
- Player registration uses local identity check, not global player count (validated in Phase 3)

_Last updated: 2026-04-26_
