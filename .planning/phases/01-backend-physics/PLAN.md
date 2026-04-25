# Phase 1: Backend & Physics

## Goal
Implement the core game state, movement, and combat mechanics on the SpaceTimeDB backend.

## Status
- [ ] Task 1: Commit current refactoring and cleanup
- [ ] Task 2: Implement Missile System (Table, Reducer, Physics)
- [ ] Task 3: Add Ship Classes and Radar/EMCON states
- [ ] Task 4: Implement Combat Logic (CIWS intercept probability)
- [ ] Task 5: Final Verification and Tests

## Tasks

### Task 1: Commit current refactoring and cleanup
- Review and commit the unstaged changes in `server/spacetimedb/`.
- Clean up untracked files (`test_tmux.log`).

### Task 2: Implement Missile System
- Define `Missile` struct in `tables.rs`.
- Add `fire_missile` reducer in `reducers/ship.rs` (or a new `missile.rs`).
- Update `physics_tick` in `reducers/physics.rs` to move missiles (3x ship speed).
- Update `types.rs` if needed for missile-specific types.

### Task 3: Add Ship Classes and Radar/EMCON
- Update `Ship` table in `tables.rs` with `ship_class` and `radar_on`.
- Implement `toggle_radar` reducer.
- Update `spawn_ship` to accept `ship_class`.

### Task 4: Implement Combat Logic
- In `physics_tick`, check for missiles within range of ships.
- Apply CIWS intercept probability (e.g., 75% for DDGs).
- Handle missile impact or destruction.

### Task 5: Final Verification
- Run `cargo test` and ensure all physics tests pass.
- Verify `spacetime build` works.
