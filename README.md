# Iron Admiral

A Top-Down Tactical Naval Simulation powered by a Rust-based SpaceTimeDB server for authoritative physics and a reactive TypeScript client.

## Project Structure

- `server/`: Rust-based SpaceTimeDB module handling game logic, kinematics, and authoritative state.
- `client/`: Vite + TypeScript + HTML5 Canvas frontend for visualization and player interaction.

## Core Stack

- **Backend:** [SpaceTimeDB](https://spacetimedb.com/) (Rust)
- **Frontend:** TypeScript + HTML5 Canvas (Vite)
- **Database:** SpaceTimeDB (Relational, authoritative, real-time)

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js / pnpm](https://pnpm.io/)
- [SpaceTimeDB CLI](https://spacetimedb.com/docs/getting-started/cli)

### Backend (Server)

```bash
cd server/spacetimedb
spacetime build
spacetime publish --local iron-admiral
```

### Frontend (Client)

```bash
cd client
pnpm install
pnpm dev
```

### Local Environment Setup

The repository includes a `server/spacetime.local.example.json` file. When initializing or publishing your local database, SpaceTimeDB will create a `server/spacetime.local.json` file (which is git-ignored) to store your unique database instance name.

To manually configure your local database:
1. Copy `server/spacetime.local.example.json` to `server/spacetime.local.json`.
2. Replace `"your-database-name-here"` with your actual database instance name.

## Documentation

- [Game Design](./GAME_DESIGN.md)
- [Architecture](./ARCHITECTURE.md)
