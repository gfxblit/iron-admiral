# Game Design: Iron Admiral

## Project Overview
**Version:** 0.1.0 (MVP)
**Genre:** Top-Down Tactical Naval Simulation
**Core Hook:** Players act as Theater Commanders issuing continuous-space vector commands to modern naval fleets. Authoritative real-time physics, radar geometries, and missile intercepts are handled by a SpaceTimeDB backend.

---

## 1. Core Game Mechanics (MVP Scope)
The MVP focuses on the interactions between Surface Ships (Destroyers/Carriers) in continuous 2D space. Movement is purely vector-based.

### Ship Types
- **The Arleigh Burke (DDG):** Fast, heavily armed, relies on active radar.
- **The Carrier (CVN):** Future scope for aircraft, currently high-value target.

### Movement & Kinematics
- Players issue `SetWaypoint(X, Y, Speed)` commands.
- Ships turn based on a maximum turn radius and accelerate toward the target.
- No grid; continuous coordinate system.

### Radar (The Illumination Cone)
- **Active Radar (ON):** Reveals a massive cone of the map, exposing enemies.
- **EMCON (OFF):** Ship is stealthy but blinded (Fog of War active).

### Weapons (VLS Missiles)
- Players target an X, Y coordinate.
- A missile entity spawns, calculates an intercept vector, and travels at 3x ship speed toward the target.

### Point Defense (CIWS)
- **Close-In Weapon System:** Automatic probability check (e.g., 75%) to destroy incoming missiles within a 2-mile inner radius.

---

## 2. Aesthetic Direction
- **Initial:** CRT terminal / vector graphics style.
- **Future:** Potential for high-fidelity pixel art.
- **Focus:** Information density and tactical clarity.

---

## 3. Success Criteria for MVP
- [ ] Functional multiplayer server (SpaceTimeDB).
- [ ] Vector-based ship movement with turn rates.
- [ ] Radar-based visibility (Fog of War).
- [ ] Missile firing and CIWS intercepts.
- [ ] Responsive canvas-based tactical display.
