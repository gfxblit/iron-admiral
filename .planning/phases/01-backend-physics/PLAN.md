# Phase 1: Backend & Physics

## Goal
Implement the core game state, movement, and combat mechanics on the SpaceTimeDB backend.

## Status
- [x] Task 1: Commit current refactoring and cleanup
- [x] Task 2: Implement Missile System (Table, Reducer, Physics)
- [x] Task 3: Add Ship Classes and Radar/EMCON states
- [x] Task 4: Implement Combat Logic (CIWS intercept probability)
- [x] Task 5: Initial Verification
- [ ] Task 6: Address Missile Tunneling (Review Feedback)
- [ ] Task 7: Balance CIWS (Review Feedback)
- [ ] Task 8: Final Verification and Tests

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

### Task 5: Initial Verification
- [x] Run `cargo test` and ensure all physics tests pass.
- [x] Verify `spacetime build` works.

### Task 6: Address Missile Tunneling
- Implement a Distance of Closest Approach (DCA) check for missiles.
- Instead of checking distance at $T_{end}$, check if the segment $(P_{start}, P_{end})$ passes within `ARRIVAL_DISTANCE` of the target.

### Task 7: Balance CIWS
- Limit CIWS attempts. A missile should only be "interceptable" by one ship per tick to prevent the "Fleet Wall" effect.

### Task 8: Final Verification and Tests
- Add a test case specifically for a missile that would "tunnel" through a ship at high speed.
- Verify all physics tests pass.
