import "./style.css";
import { initializeRenderer } from "./renderer";
import { SpacetimeManager } from "./spacetime";
import { initializeInteractions } from "./interactions";

// Set up basic HTML structure
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div id="game-container" style="width: 100vw; height: 100vh; margin: 0; padding: 0; overflow: hidden;">
    <canvas id="game-canvas"></canvas>
    <div id="status" style="position: absolute; top: 10px; left: 10px; color: white; font-family: monospace; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; z-index: 10;">
      <div>Status: <span id="status-text">Connecting...</span></div>
      <div>Ships: <span id="ships-count">0</span></div>
      <div>Missiles: <span id="missiles-count">0</span></div>
    </div>
  </div>
`;

// Initialize renderer and store reference for lifecycle management
const renderer = initializeRenderer("app");

// Initialize SpaceTimeDB connection
const spacetimeManager = SpacetimeManager.getInstance();
// @ts-expect-error - Expose to window for console debugging and E2E tests
window.spacetimeManager = spacetimeManager;

// Get canvas element for interaction setup
const canvas = document.querySelector('canvas') as HTMLCanvasElement;

async function initializeGame() {
  try {
    updateStatus("Connecting...");
    // Connect to SpaceTimeDB
    const stdbParam = new URLSearchParams(window.location.search).get("stdb");
    // If no explicit host given, route through Vite's /v1/ proxy so
    // non-localhost clients (iPad on LAN) reach SpaceTimeDB via Vite rather than directly.
    const stdbUrl = stdbParam
      ? `ws://${stdbParam}`
      : `ws://${window.location.host}`;
    await spacetimeManager.connect(stdbUrl);
    updateStatus("Connected");
    console.log("[Main] Connected to SpaceTimeDB");

    // Initialize the interaction system exactly once, after the connection is live.
    // Placing this inside spacetimeManager.subscribe() would re-initialize on every
    // server tick (10Hz), causing listener explosion.
    if (canvas) {
      const interactionManager = initializeInteractions(canvas, renderer, spacetimeManager);
      // @ts-expect-error - Expose to window for console debugging and E2E tests
      window.interactionManager = interactionManager;
      console.log('[Main] Interaction system initialized');
    }
  } catch (error) {
    console.error("[Main] Connection error:", error);
    updateStatus("Connection Failed - Check server is running on port 3000");
  }
}

function updateStatus(text: string): void {
  const statusEl = document.getElementById("status-text");
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function updateCounts(): void {
  const shipsCountEl = document.getElementById("ships-count");
  const missilesCountEl = document.getElementById("missiles-count");

  if (shipsCountEl) {
    shipsCountEl.textContent = String(spacetimeManager.getShips().length);
  }

  if (missilesCountEl) {
    missilesCountEl.textContent = String(spacetimeManager.getMissiles().length);
  }
}

// Subscribe to state updates to refresh counts
spacetimeManager.subscribe(() => {
  updateCounts();
});

// Initialize game on load
initializeGame();
