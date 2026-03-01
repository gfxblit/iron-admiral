# Architecture Guide: Iron Admiral

## High-Level System Design
Iron Admiral uses a client-server architecture where the **SpaceTimeDB server is the source of truth** for all game state and physics.

---

## 1. Backend: SpaceTimeDB (Rust)
The backend acts as both the multiplayer server and the database. It handles all authoritative logic.

### Core Components
- **Kinematics Engine:** Authoritative calculation of ship movement, heading updates, and turn radius limits.
- **Combat System:** Missile tracking and CIWS (Close-In Weapon System) probability checks.

### Key Tables
- `Player`: Stores identity and player-specific metadata.
- `Ship`: Stores ship class, coordinates, heading, speed, and current orders.
- `Missile`: Stores missile coordinates, target vector, and owner ID.

### Reducers (Actions)
- `register_player`: Initialize a new player in the system.
- `spawn_ship`: Deploy a ship at a given coordinate.
- `set_waypoint`: Update a ship's target destination and speed.
- `physics_tick`: Scheduled reducer (100ms / 10Hz) that updates kinematics and checks for intercepts.

---

## 2. Frontend: Vite + TypeScript + HTML5 Canvas
A purely reactive client that listens to SpaceTimeDB state changes and visualizes the world.

### Features
- **SpaceTimeDB TS SDK:** Automatically generated bindings for real-time state synchronization.
- **Canvas Renderer:** High-performance 2D drawing loop for ships, UI overlays, and orders.
- **Tactical UI:** Input handling for issuing waypoint and weapon commands.

---

## 3. Communication Flow
1. **Client** dispatches a **Reducer** (e.g., `set_waypoint`).
2. **SpaceTimeDB** executes the reducer and updates the table state.
3. **SpaceTimeDB** pushes the state change to all subscribed **Clients**.
4. **Client** rerenders the tactical view based on the updated state.

---

## 4. Implementation Phases

### Phase 1: Database & Physics (Backend)
- Initialize the SpaceTimeDB project.
- Implement the core schema in `server/src/lib.rs`.
- Implement trigonometry in the `physics_tick` reducer (movement, heading, turn limits).

### Phase 2: End-to-End & Basic Rendering (Frontend + Backend)
- Generate TypeScript SDK bindings for the client.
- Connect the Vite client to the SpaceTimeDB server.
- Build a basic Canvas loop to draw the `Ship` table entities as simple shapes.
- Implement basic interaction to dispatch `set_waypoint`.

### Phase 3: Advanced Mechanics & UI
- Implement Radar and Fog of War (geometric cone-based visibility).
- Add Missile firing and CIWS intercepts.
- Enhance the tactical UI with specialized overlays and status indicators.
- Add sound effects and advanced visual styling.
