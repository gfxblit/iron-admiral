/**
 * Interaction System for Iron Admiral
 *
 * Handles user input (left-click for registration and ship spawning,
 * right-click for waypoint assignment) and integrates with the renderer
 * and SpacetimeManager.
 */

import { SpacetimeManager } from './spacetime';
import { Canvas2DRenderer } from './renderer';
import type { Ship } from './module_bindings/types';

/**
 * InteractionManager
 *
 * Manages all user interaction with the canvas:
 * - Left-click: Register player and spawn ships
 * - Right-click: Set waypoints for selected ship
 * - Ship selection tracking
 * - Visual feedback
 */
export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private spacetimeManager: SpacetimeManager;
  private renderer: Canvas2DRenderer;

  // Interaction state
  private selectedShipId: bigint | null = null;
  private playerShips: Set<bigint> = new Set();

  // Guard to prevent duplicate registration calls from rapid clicks
  private isRegistering: boolean = false;

  // UI feedback elements
  private statusElement: HTMLElement | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Canvas2DRenderer,
    spacetimeManager: SpacetimeManager
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.spacetimeManager = spacetimeManager;

    // Get status element for feedback
    this.statusElement = document.getElementById('interaction-status');
    if (!this.statusElement) {
      // Create it if it doesn't exist
      this.statusElement = document.createElement('div');
      this.statusElement.id = 'interaction-status';
      this.statusElement.style.cssText = `
        position: absolute;
        top: 80px;
        left: 10px;
        color: #50E3C2;
        font-family: monospace;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 5px;
        z-index: 11;
        max-width: 250px;
        word-wrap: break-word;
      `;
      document.body.appendChild(this.statusElement);
    }

    // Bind event handlers
    this.canvas.addEventListener('click', this.handleLeftClick);
    this.canvas.addEventListener('contextmenu', this.handleRightClick);

    // Subscribe to state updates to track player identity and ships
    this.spacetimeManager.subscribe(() => {
      this.updatePlayerState();
    });

    console.log('[InteractionManager] Initialized');
  }

  /**
   * Update player state from SpacetimeManager.
   * Uses the local user's identity to correctly identify the current player's ships
   * even when multiple players are present in the session.
   */
  private updatePlayerState = (): void => {
    const localIdentityHex = this.spacetimeManager.getUserIdentity();
    const ships = this.spacetimeManager.getShips();

    if (!localIdentityHex) {
      return;
    }

    // Clear and rebuild the local player's ship set using the authoritative local identity
    this.playerShips.clear();
    for (const ship of ships) {
      const ownerIdentity = ship.ownerId as unknown as { toHexString?: () => string };
      const shipOwnerHex = ownerIdentity.toHexString?.() || String(ship.ownerId);
      if (shipOwnerHex === localIdentityHex) {
        this.playerShips.add(ship.id);
      }
    }

    // Clear the isRegistering guard once the local player appears in the table
    if (this.isRegistering) {
      const localPlayer = this.spacetimeManager.getPlayer(localIdentityHex);
      if (localPlayer) {
        this.isRegistering = false;
        console.log('[InteractionManager] Local Player Registered');
      }
    }
  };

  /**
   * Handle left-click events
   */
  private handleLeftClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Use the local user's identity to determine registration status.
    // Checking players.length would incorrectly treat other players' presence
    // as meaning the local user is already registered.
    const localIdentityHex = this.spacetimeManager.getUserIdentity();
    const localPlayer = localIdentityHex
      ? this.spacetimeManager.getPlayer(localIdentityHex)
      : undefined;

    if (!localPlayer) {
      // Local user is not yet registered — register once, guard against rapid clicks
      if (!this.isRegistering) {
        this.registerPlayer();
      } else {
        this.showStatus('Registering... please wait');
      }
    } else {
      // Local user is registered — spawn a ship or select one
      this.handleSpawnOrSelect(canvasX, canvasY);
    }
  };

  /**
   * Handle right-click events (waypoint assignment)
   */
  private handleRightClick = (event: MouseEvent): void => {
    event.preventDefault(); // Prevent context menu

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Convert canvas coordinates to world coordinates
    const [worldX, worldY] = this.canvasToWorld(canvasX, canvasY);

    // Check if we have a selected ship
    if (this.selectedShipId === null) {
      this.showStatus('No ship selected. Left-click a ship first.');
      return;
    }

    // Validate waypoint is within reasonable bounds
    if (!this.isWaypointValid(worldX, worldY)) {
      this.showStatus('Waypoint out of bounds');
      return;
    }

    // Set waypoint for selected ship
    this.setWaypoint(this.selectedShipId, worldX, worldY);
  };

  /**
   * Register the player.
   * Sets isRegistering to prevent duplicate calls until the server confirms registration.
   * Async so that async reducer rejections are caught and isRegistering is reset on failure.
   */
  private registerPlayer = async (): Promise<void> => {
    try {
      // Generate a nickname for the player
      const nickname = `Player_${Math.floor(Math.random() * 10000)}`;

      // Set guard before calling the reducer to block rapid duplicate clicks
      this.isRegistering = true;

      // Await the async reducer call so rejections propagate to the catch block
      await this.spacetimeManager.registerPlayer(nickname);

      this.showStatus('Registering player...');
    } catch (error) {
      console.error('[InteractionManager] Error registering player:', error);
      this.isRegistering = false;
      this.showStatus('Failed to register player');
    }
  };

  /**
   * Handle spawn ship or select existing ship
   */
  private handleSpawnOrSelect = (canvasX: number, canvasY: number): void => {
    // Check if clicking on an existing ship
    const clickedShip = this.getShipAtCanvasPosition(canvasX, canvasY);

    if (clickedShip) {
      // Select the clicked ship
      this.selectShip(clickedShip.id);
      this.showStatus(`Selected ship ${clickedShip.id}`);
    } else {
      // No ship clicked - spawn a new one
      const [worldX, worldY] = this.canvasToWorld(canvasX, canvasY);
      this.spawnShip(worldX, worldY);
    }
  };

  /**
   * Spawn a new ship at the clicked location
   */
  private spawnShip = (worldX: number, worldY: number): void => {
    try {
      // Validate position
      if (!this.isWaypointValid(worldX, worldY)) {
        this.showStatus('Spawn position out of bounds');
        return;
      }

      // Alternate between ship classes for variety
      const shipClass = Math.random() > 0.5 ? 'ArleighBurke' : 'Carrier';

      this.spacetimeManager.spawnShip(shipClass, worldX, worldY);
      this.showStatus(`Spawning ${shipClass} at (${worldX.toFixed(0)}, ${worldY.toFixed(0)})...`);
    } catch (error) {
      console.error('[InteractionManager] Error spawning ship:', error);
      this.showStatus('Failed to spawn ship');
    }
  };

  /**
   * Select a ship (for waypoint commands)
   */
  private selectShip = (shipId: bigint): void => {
    this.selectedShipId = shipId;
    // Update renderer to highlight the selected ship
    this.renderer.setSelectedShip(shipId);
  };

  /**
   * Set waypoint for selected ship
   */
  private setWaypoint = (shipId: bigint, worldX: number, worldY: number): void => {
    try {
      // Use a reasonable default speed
      const targetSpeed = 20;

      this.spacetimeManager.setWaypoint(shipId, worldX, worldY, targetSpeed);
      this.showStatus(
        `Waypoint set at (${worldX.toFixed(0)}, ${worldY.toFixed(0)}) with speed ${targetSpeed}`
      );
    } catch (error) {
      console.error('[InteractionManager] Error setting waypoint:', error);
      this.showStatus('Failed to set waypoint');
    }
  };

  /**
   * Get ship at canvas position (for selection)
   */
  private getShipAtCanvasPosition = (canvasX: number, canvasY: number): Ship | null => {
    const ships = this.spacetimeManager.getShips();
    const clickRadius = 20; // Pixels

    for (const ship of ships) {
      const [shipCanvasX, shipCanvasY] = this.worldToCanvas(ship.x, ship.y);

      // Simple distance check
      const dx = canvasX - shipCanvasX;
      const dy = canvasY - shipCanvasY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= clickRadius) {
        return ship;
      }
    }

    return null;
  };

  /**
   * Convert canvas coordinates to world coordinates
   * (Inverse of renderer's worldToCanvas)
   */
  private canvasToWorld = (canvasX: number, canvasY: number): [number, number] => {
    const [centerX, centerY] = this.renderer.getViewportCenter();
    const scale = this.renderer.getScale();
    const worldX = (canvasX - centerX) / scale;
    const worldY = (canvasY - centerY) / scale;
    return [worldX, worldY];
  };

  /**
   * Convert world coordinates to canvas coordinates
   */
  private worldToCanvas = (worldX: number, worldY: number): [number, number] => {
    const [centerX, centerY] = this.renderer.getViewportCenter();
    const scale = this.renderer.getScale();
    const canvasX = centerX + worldX * scale;
    const canvasY = centerY + worldY * scale;
    return [canvasX, canvasY];
  };

  /**
   * Validate waypoint is within bounds
   */
  private isWaypointValid = (worldX: number, worldY: number): boolean => {
    // Define reasonable game bounds
    const maxDistance = 5000; // World units from origin
    const distanceFromOrigin = Math.sqrt(worldX * worldX + worldY * worldY);
    return distanceFromOrigin <= maxDistance;
  };

  /**
   * Show status message to user
   */
  private showStatus = (message: string): void => {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      // Auto-clear after 3 seconds
      setTimeout(() => {
        if (this.statusElement) {
          this.statusElement.textContent = '';
        }
      }, 3000);
    }
  };

  /**
   * Get currently selected ship ID
   */
  public getSelectedShipId = (): bigint | null => {
    return this.selectedShipId;
  };

  /**
   * Cleanup and destroy
   */
  public destroy = (): void => {
    this.canvas.removeEventListener('click', this.handleLeftClick);
    this.canvas.removeEventListener('contextmenu', this.handleRightClick);
  };
}

/**
 * Initialize interaction manager
 */
export function initializeInteractions(
  canvas: HTMLCanvasElement,
  renderer: Canvas2DRenderer,
  spacetimeManager: SpacetimeManager
): InteractionManager {
  return new InteractionManager(canvas, renderer, spacetimeManager);
}
