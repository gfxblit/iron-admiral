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
  /** World radius in units — must match the server's WORLD_RADIUS constant in lib.rs */
  private static readonly WORLD_RADIUS = 5000;

  private canvas: HTMLCanvasElement;
  private spacetimeManager: SpacetimeManager;
  private renderer: Canvas2DRenderer;

  // Interaction state
  private selectedShipId: bigint | null = null;
  private playerShips: Set<bigint> = new Set();

  // Guard to prevent duplicate registration calls from rapid clicks
  private isRegistering: boolean = false;

  // Fire mode state
  private fireModeActive: boolean = false;

  // UI feedback elements
  private statusElement: HTMLElement | null = null;
  private statusTimerId: ReturnType<typeof setTimeout> | null = null;

  // Mobile action overlay elements
  private mobileActions: HTMLElement | null = null;
  private radarButton: HTMLButtonElement | null = null;
  private fireButton: HTMLButtonElement | null = null;
  private deselectButton: HTMLButtonElement | null = null;

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

    // Create mobile action overlay
    this.createMobileActions();

    // Bind event handlers
    this.canvas.addEventListener('click', this.handleLeftClick);
    this.canvas.addEventListener('contextmenu', this.handleRightClick);

    // Prevent scroll/zoom during gameplay on iOS/touch devices
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });

    // Keyboard shortcuts: R = radar, F = fire mode, Escape = deselect
    document.addEventListener('keydown', this.handleKeyDown);

    // Subscribe to state updates to track player identity and ships
    this.spacetimeManager.subscribe(() => {
      this.updatePlayerState();
    });

    console.log('[InteractionManager] Initialized');
  }

  /**
   * Create the floating mobile action overlay with RADAR, FIRE, DESELECT buttons.
   * Hidden by default; visibility is controlled by updateMobileActionsVisibility().
   */
  private createMobileActions = (): void => {
    // Remove existing overlay if present (e.g., re-init)
    const existing = document.getElementById('mobile-actions');
    if (existing) {
      existing.remove();
    }

    this.mobileActions = document.createElement('div');
    this.mobileActions.id = 'mobile-actions';
    this.mobileActions.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: none;
      flex-direction: column;
      gap: 10px;
      z-index: 20;
    `;

    const buttonStyle = `
      width: 60px;
      height: 60px;
      background: rgba(0,0,0,0.8);
      border: 1px solid #50E3C2;
      border-radius: 8px;
      color: #50E3C2;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      min-width: 44px;
      min-height: 44px;
    `;

    this.radarButton = document.createElement('button');
    this.radarButton.id = 'btn-radar';
    this.radarButton.textContent = 'RADAR';
    this.radarButton.style.cssText = buttonStyle;
    this.radarButton.addEventListener('click', this.handleRadarButton);
    this.radarButton.addEventListener('touchend', (e) => { e.preventDefault(); this.handleRadarButton(); });

    this.fireButton = document.createElement('button');
    this.fireButton.id = 'btn-fire';
    this.fireButton.textContent = 'FIRE';
    this.fireButton.style.cssText = buttonStyle;
    this.fireButton.addEventListener('click', this.handleFireButton);
    this.fireButton.addEventListener('touchend', (e) => { e.preventDefault(); this.handleFireButton(); });

    this.deselectButton = document.createElement('button');
    this.deselectButton.id = 'btn-deselect';
    this.deselectButton.textContent = 'DESEL';
    this.deselectButton.style.cssText = buttonStyle;
    this.deselectButton.addEventListener('click', this.handleDeselectButton);
    this.deselectButton.addEventListener('touchend', (e) => { e.preventDefault(); this.handleDeselectButton(); });

    this.mobileActions.appendChild(this.radarButton);
    this.mobileActions.appendChild(this.fireButton);
    this.mobileActions.appendChild(this.deselectButton);

    document.body.appendChild(this.mobileActions);
  };

  /**
   * Show or hide the mobile actions overlay based on ship selection.
   */
  private updateMobileActionsVisibility = (): void => {
    if (!this.mobileActions) return;
    if (this.selectedShipId !== null) {
      this.mobileActions.style.display = 'flex';
    } else {
      this.mobileActions.style.display = 'none';
    }
  };

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

    const shipIds = new Set(ships.map((s) => s.id));

    // Clear stale selection when the selected ship no longer exists
    if (this.selectedShipId !== null && !shipIds.has(this.selectedShipId)) {
      this.deselectShip();
      this.showStatus('Selected ship was destroyed');
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
   * Handle spawn ship or select existing ship.
   * When fire mode is active, clicking on a ship fires a missile at it;
   * clicking on empty space cancels fire mode.
   */
  private handleSpawnOrSelect = (canvasX: number, canvasY: number): void => {
    // Check if clicking on an existing ship
    const clickedShip = this.getShipAtCanvasPosition(canvasX, canvasY);

    if (this.fireModeActive) {
      if (clickedShip && this.selectedShipId !== null) {
        // Fire a missile at the target ship
        this.renderer.setFireModeTarget(clickedShip.id);
        this.spacetimeManager.fireMissile(this.selectedShipId, clickedShip.id)
          .then(() => {
            this.showStatus(`Missile fired at ship ${clickedShip.id}`);
          })
          .catch((error) => {
            console.error('[InteractionManager] Error firing missile:', error);
            this.showStatus('Failed to fire missile');
          })
          .finally(() => {
            // Exit fire mode after shot
            this.fireModeActive = false;
            this.renderer.setFireModeTarget(null);
            this.updateFireButtonStyle();
          });
      } else {
        // Tapped empty space — cancel fire mode
        this.fireModeActive = false;
        this.renderer.setFireModeTarget(null);
        this.updateFireButtonStyle();
        this.showStatus('Fire mode cancelled');
      }
      return;
    }

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
    // Show the mobile action overlay now that a ship is selected
    this.updateMobileActionsVisibility();
  };

  /**
   * Deselect current ship and exit any active modes
   */
  private deselectShip = (): void => {
    this.selectedShipId = null;
    this.fireModeActive = false;
    this.renderer.setSelectedShip(null);
    this.renderer.setFireModeTarget(null);
    this.updateMobileActionsVisibility();
    this.updateFireButtonStyle();
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
    const distanceFromOrigin = Math.sqrt(worldX * worldX + worldY * worldY);
    return distanceFromOrigin <= InteractionManager.WORLD_RADIUS;
  };

  /**
   * Handle RADAR button press — toggle radar on selected ship
   */
  private handleRadarButton = (): void => {
    if (this.selectedShipId === null) return;
    this.spacetimeManager.toggleRadar(this.selectedShipId)
      .then(() => {
        this.showStatus('Radar toggled');
      })
      .catch((error) => {
        console.error('[InteractionManager] Error toggling radar:', error);
        this.showStatus('Failed to toggle radar');
      });
  };

  /**
   * Handle FIRE button press — enter fire mode
   */
  private handleFireButton = (): void => {
    if (this.selectedShipId === null) return;
    this.fireModeActive = !this.fireModeActive;
    this.renderer.setFireModeTarget(null);
    this.updateFireButtonStyle();
    if (this.fireModeActive) {
      this.showStatus('FIRE MODE ACTIVE - TAP TARGET');
    } else {
      this.showStatus('Fire mode cancelled');
    }
  };

  /**
   * Handle DESELECT button press — clear selection and exit all modes
   */
  private handleDeselectButton = (): void => {
    this.deselectShip();
    this.showStatus('');
  };

  /**
   * Update fire button visual style to reflect active/inactive fire mode
   */
  private updateFireButtonStyle = (): void => {
    if (!this.fireButton) return;
    if (this.fireModeActive) {
      this.fireButton.style.border = '2px solid #FF0000';
      this.fireButton.style.color = '#FF6B6B';
      this.fireButton.style.animation = 'none';
    } else {
      this.fireButton.style.border = '1px solid #50E3C2';
      this.fireButton.style.color = '#50E3C2';
    }
  };

  /**
   * Handle keyboard shortcuts: R (radar), F (fire mode), Escape (deselect)
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key.toUpperCase()) {
      case 'R':
        this.handleRadarButton();
        break;
      case 'F':
        this.handleFireButton();
        break;
      case 'ESCAPE':
        if (this.fireModeActive) {
          this.fireModeActive = false;
          this.renderer.setFireModeTarget(null);
          this.updateFireButtonStyle();
          this.showStatus('Fire mode cancelled');
        } else {
          this.deselectShip();
          this.showStatus('');
        }
        break;
    }
  };

  /**
   * Handle touch start — prevent default scroll/zoom during gameplay
   */
  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
  };

  /**
   * Handle touch end — map single touch to canvas click
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = touch.clientX - rect.left;
    const canvasY = touch.clientY - rect.top;

    const localIdentityHex = this.spacetimeManager.getUserIdentity();
    const localPlayer = localIdentityHex
      ? this.spacetimeManager.getPlayer(localIdentityHex)
      : undefined;

    if (!localPlayer) {
      if (!this.isRegistering) {
        this.registerPlayer();
      } else {
        this.showStatus('Registering... please wait');
      }
    } else {
      this.handleSpawnOrSelect(canvasX, canvasY);
    }
  };

  /**
   * Show status message to user
   */
  private showStatus = (message: string): void => {
    if (this.statusElement) {
      this.statusElement.textContent = message;

      if (this.statusTimerId !== null) {
        clearTimeout(this.statusTimerId);
      }

      // Auto-clear after 3 seconds
      this.statusTimerId = setTimeout(() => {
        if (this.statusElement) {
          this.statusElement.textContent = '';
        }
        this.statusTimerId = null;
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
   * Programmatically select a ship by ID — used by E2E tests to bypass canvas hit-testing
   * ambiguity when multiple ships overlap at the same world position.
   */
  public selectShipById = (shipId: bigint): void => {
    this.selectShip(shipId);
    this.showStatus(`Selected ship ${shipId}`);
  };

  /**
   * Cleanup and destroy
   */
  public destroy = (): void => {
    this.canvas.removeEventListener('click', this.handleLeftClick);
    this.canvas.removeEventListener('contextmenu', this.handleRightClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.mobileActions && this.mobileActions.parentNode) {
      this.mobileActions.parentNode.removeChild(this.mobileActions);
    }
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
