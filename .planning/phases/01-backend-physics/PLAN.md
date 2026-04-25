# Phase 1: Backend & Physics

## Goal
Implement the core game state, movement, and combat mechanics on the SpaceTimeDB backend.

## Status
- [x] Task 1: Commit current refactoring and cleanup
- [x] Task 2: Implement Missile System (Table, Reducer, Physics)
- [x] Task 3: Add Ship Classes and Radar/EMCON states
- [x] Task 4: Implement Combat Logic (CIWS intercept probability)
- [x] Task 5: Final Verification and Tests

## Tasks

### Task 1: Commit current refactoring and cleanup
- [x] Review and commit the unstaged changes in `server/spacetimedb/`.
- [x] Clean up untracked files (`test_tmux.log`).

### Task 2: Implement Missile System
- [x] Define `Missile` struct in `tables.rs`.
- [x] Add `fire_missile` reducer in `reducers/ship.rs`.
- [x] Update `physics_tick` in `reducers/physics.rs` to move missiles (3x ship speed).
- [x] Update `types.rs` for `Waypoint` and other types.

### Task 3: Add Ship Classes and Radar/EMCON
- [x] Update `Ship` table in `tables.rs` with `ship_class` and `radar_on`.
- [x] Implement `toggle_radar` reducer.
- [x] Update `spawn_ship` to accept `ship_class`.
- [x] Implement `ShipClass` with max speed and CIWS probability.

### Task 4: Implement Combat Logic
- [x] In `physics_tick`, check for missiles within range of ships.
- [x] Apply CIWS intercept probability using `ctx.rng()`.
- [x] Handle missile impact and ship destruction.

### Task 5: Final Verification
- [x] Run `cargo test` and ensure all physics tests pass.
- [x] Verify `spacetime build` works.
