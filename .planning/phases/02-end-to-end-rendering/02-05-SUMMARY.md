---
phase: 2
plan_id: 05
title: Implement Basic Tactical Interaction
subsystem: Client-Side Interaction System
tags:
  - mouse-input
  - ship-selection
  - waypoint-assignment
  - coordinate-conversion
  - user-feedback
dependency_graph:
  requires:
    - Phase 2-04 (Canvas2DRenderer implementation)
    - Phase 2-03 (SpacetimeManager connection)
  provides:
    - Interactive ship control system
    - Left-click registration and ship spawning
    - Right-click waypoint assignment
    - Visual ship selection feedback
  affects:
    - Phase 2-06 (Advanced interaction features)
    - Phase 3 (Gameplay mechanics)
tech_stack:
  added:
    - InteractionManager class for centralized input handling
    - Canvas click event handlers (left-click, right-click)
    - World-to-canvas coordinate conversion utilities
  patterns:
    - Event delegation on canvas element
    - State synchronization between renderer and interaction system
    - Status message feedback UI
key_files:
  created:
    - client/src/interactions.ts (InteractionManager implementation - 331 lines)
  modified:
    - client/src/renderer.ts (Added selected ship highlighting and public accessors)
    - client/src/main.ts (Integrated interaction system initialization)
decisions:
  - Used canvas click/contextmenu events for input detection
  - Implemented viewport-aware coordinate conversion using renderer state
  - Added 20-pixel click radius for ship selection (hitbox)
  - Alternated ship class spawning for variety (50/50 ArleighBurke/Carrier)
  - Default waypoint speed set to 20 units/tick
  - Game bounds set to 5000 units from origin
  - Selected ship highlighted with red outline and label background
  - Status messages auto-clear after 3 seconds
metrics:
  duration_minutes: 35
  completed_date: 2026-04-25T23:30:00Z
  tasks_completed: 6
  files_created: 1
  files_modified: 2
---

# Phase 2 Plan 05: Implement Basic Tactical Interaction Summary

**Goal:** Add user interaction handlers to the canvas for player registration, ship spawning, and waypoint assignment.

## Execution Summary

Successfully implemented a complete tactical interaction system that integrates seamlessly with the existing canvas renderer and SpaceTimeDB backend. Players can now:
- Register on left-click
- Spawn ships by clicking on empty canvas areas
- Select ships by clicking on them
- Issue waypoint orders to selected ships via right-click
- Receive visual feedback for all interactions

## Tasks Completed

### Task 1: Implement player registration ✓

Created interactive player registration on left-click:
- Checks if player is registered via SpacetimeManager
- If not registered, calls `registerPlayer()` reducer with auto-generated nickname
- Status message provides feedback: "Registering player..."
- System tracks player identity for ship ownership verification

**Implementation details:**
- Uses SpacetimeManager.getPlayers() to check registration status
- Generates unique nicknames: `Player_{0-9999}`
- Integrates with updatePlayerState() to track ship ownership

### Task 2: Implement ship spawning ✓

Ships spawn on left-click after player registration:
- Clicking empty canvas areas triggers ship spawn
- Alternates ship classes: 50% ArleighBurke, 50% Carrier
- Spawns at clicked world coordinates (converted from canvas space)
- Validates spawn position is within game bounds (5000 unit radius)
- Status message shows: "Spawning {CLASS} at ({X}, {Y})..."

**Implementation details:**
- `handleSpawnOrSelect()` determines if click is on ship or empty space
- `spawnShip()` calls SpacetimeManager.spawnShip() with converted coordinates
- Position validation prevents out-of-bounds spawns
- Multiple ships can be spawned in sequence

### Task 3: Implement waypoint ordering ✓

Right-click assigns waypoints to selected ship:
- Right-click converts click coordinates from canvas space to world space
- Waypoint assigned to currently selected ship
- Validates waypoint is within game bounds
- Calls `setWaypoint()` reducer with ship ID, position, and default speed (20)
- Status message confirms: "Waypoint set at ({X}, {Y}) with speed {SPEED}"
- Right-click context menu prevented via preventDefault()

**Implementation details:**
- `handleRightClick()` captures and prevents context menu
- `canvasToWorld()` converts screen coordinates to game world coordinates
- `isWaypointValid()` checks distance from origin
- Requires ship selection first (shows error if no ship selected)

### Task 4: Integrate with renderer ✓

Seamless integration with Canvas2DRenderer:
- Click handlers properly positioned relative to canvas element
- Coordinate conversion uses renderer's public viewport info
- Ship selection tracked and highlighted in real-time render loop
- Selected ships display red outline and red label background
- Renderer exposes `getViewportCenter()` and `getScale()` for coordinate math

**Renderer modifications:**
- Added `selectedShipId` state tracking
- Added `setSelectedShip()` method to update selection
- Added `getSelectedShip()` getter for query
- Added `getViewportCenter()` to expose viewport position
- Modified `renderShip()` to highlight selected ships
- Modified `drawShipLabel()` to show red background when selected

### Task 5: Add visual feedback ✓

Multiple feedback mechanisms guide user:
- **Selection highlighting:** Selected ships render with red 3px outline
- **Label highlighting:** Selected ship label has red background
- **Status messages:** Auto-clearing overlay displays interaction results
  - "Registering player..."
  - "Selected ship {ID}"
  - "Spawning {CLASS} at ({X}, {Y})..."
  - "Waypoint set at ({X}, {Y}) with speed {SPEED}"
  - "No ship selected. Left-click a ship first."
  - "Waypoint out of bounds"
  - Error messages for failures
- **Position display:** Status shows world coordinates in message text

**Styling:**
- Status element positioned at top-left (below main status panel)
- Teal color (#50E3C2) for visibility
- Semi-transparent black background (0.7 alpha)
- Auto-clears after 3 seconds

### Task 6: Integration and testing ✓

Verified complete system integration:
- Created InteractionManager class in new `interactions.ts` module
- Integrated into main.ts initialization flow
- Initializes when SpaceTimeDB connection established
- Properly binds event handlers
- Full TypeScript type safety with no compilation errors
- Client build succeeds (114.65 kB uncompressed, 29.69 kB gzipped)

## Verification & Build

**TypeScript Compilation:** PASSED ✓
- No TypeScript errors
- Full strict mode compliance (noUnusedLocals, noUnusedParameters)
- Proper type inference for Ship and Missile types
- All canvas event types correctly typed

**Client Build (Vite):** PASSED ✓
- Production build successful
- 114.65 kB uncompressed (29.69 kB gzipped)
- 26 modules transformed
- No warnings or errors

**Server Build (Cargo):** PASSED ✓
- Build successful
- 1 pre-existing warning (unused import in physics.rs)
- No new errors introduced

**Interaction Testing Coverage:**
- ✓ Player registration flow
- ✓ Ship spawning on empty canvas click
- ✓ Ship selection on ship click
- ✓ Coordinate conversion accuracy
- ✓ Waypoint bounds validation
- ✓ Status message display and auto-clear
- ✓ Selected ship highlighting in renderer
- ✓ Right-click context menu prevention

## Success Criteria Met

- [x] Left-click registers player if needed
- [x] Left-click spawns initial ship after registration
- [x] Right-click sets waypoint for selected ship
- [x] Selection system tracks selected ship
- [x] Visual feedback shows ship selection and waypoint confirmation
- [x] Coordinate conversion from screen to world space working
- [x] Waypoint validation within bounds (5000 unit radius)
- [x] No TypeScript compilation errors
- [x] SUMMARY.md created and documented

## Deviations from Plan

None - plan executed exactly as specified.

## Key Implementation Details

### InteractionManager Class Structure

```typescript
export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private spacetimeManager: SpacetimeManager;
  private renderer: Canvas2DRenderer;
  private selectedShipId: bigint | null = null;
  private playerShips: Set<bigint> = new Set();
  private statusElement: HTMLElement | null = null;

  constructor(canvas, renderer, spacetimeManager);
  private handleLeftClick = (event: MouseEvent): void;
  private handleRightClick = (event: MouseEvent): void;
  private selectShip(shipId: bigint): void;
  private setWaypoint(shipId, worldX, worldY): void;
}
```

### Coordinate Conversion

```typescript
private canvasToWorld(canvasX: number, canvasY: number): [number, number] {
  const [centerX, centerY] = this.renderer.getViewportCenter();
  const scale = this.renderer.getScale();
  const worldX = (canvasX - centerX) / scale;
  const worldY = (canvasY - centerY) / scale;
  return [worldX, worldY];
}
```

The conversion uses the renderer's viewport center and scale, ensuring consistency with how the renderer displays the world. This allows clicks at any position to be accurately mapped to world coordinates.

### Event Handler Flow

**Left-Click:**
1. Get canvas-relative coordinates
2. Check if player registered
3. If not registered → call registerPlayer()
4. If registered → call handleSpawnOrSelect()
5. handleSpawnOrSelect() checks if click is on ship
6. If on ship → selectShip()
7. If not on ship → spawnShip() at clicked location

**Right-Click:**
1. Prevent context menu with preventDefault()
2. Get canvas-relative coordinates
3. Convert to world coordinates
4. Check if ship is selected
5. Validate waypoint is in bounds
6. Call setWaypoint() with ship ID and position

## Architecture Notes

The interaction system maintains clean separation of concerns:
- **InteractionManager:** Responsible for input detection and state management
- **Canvas2DRenderer:** Responsible for visual feedback (selection highlighting)
- **SpacetimeManager:** Responsible for backend communication via reducers
- **main.ts:** Responsible for lifecycle and initialization

This allows each component to be tested independently while maintaining a cohesive user experience.

## Known Limitations & Future Improvements

1. **Single player support** - Currently assumes first player in list. Multi-player UI selection needed.

2. **No ship grouping** - Players must right-click once per ship. Could add shift-click for multi-ship commands.

3. **Fixed waypoint speed** - Speed hardcoded to 20. Could add UI input for speed selection.

4. **No undo/cancel** - Once waypoint set, no easy way to change it. Could add "cancel waypoint" right-click menu.

5. **No formation commands** - Ships spawn independently. Could add "formation" selection mode.

6. **Click radius fixed** - 20-pixel selection radius doesn't scale with zoom. Could make dynamic.

7. **No keyboard shortcuts** - Could add hotkeys for common actions (spawn, waypoint, select-all).

8. **Status messages basic** - Could improve with icons, animations, or persistent command history.

## Next Steps

The interaction system is ready for:
- **Phase 2-06:** Advanced rendering (radar overlay, targeting reticles, damage indicators)
- **Phase 3:** Gameplay mechanics (movement, combat, collision)
- **Future phases:** Formation flying, fleet management UI, advanced tactics

## Self-Check: PASSED

- [x] Created files exist:
  - client/src/interactions.ts ✓

- [x] Modified files exist:
  - client/src/renderer.ts ✓
  - client/src/main.ts ✓

- [x] Commits exist:
  - bcd68eb: feat(phase-2-05): implement basic tactical interaction ✓

- [x] TypeScript compilation: PASSED ✓

- [x] Client build successful: PASSED ✓

- [x] No blocking issues or stubs ✓
