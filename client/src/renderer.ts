/**
 * Canvas 2D Renderer for Iron Admiral
 *
 * Provides tactical visualization of game state including:
 * - Ships (as rotated triangles)
 * - Missiles (as small circles)
 * - Waypoints (as markers)
 * - Order lines (from ship to waypoint)
 *
 * Integrates with SpacetimeManager for real-time state updates.
 */

import { SpacetimeManager } from './spacetime';
import type { Ship, Missile } from './module_bindings/types';

/**
 * Canvas2DRenderer
 *
 * Manages canvas rendering pipeline and entity visualization
 */
export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private spacetimeManager: SpacetimeManager;
  private isRunning: boolean = false;
  private resizeListener: (() => void) | null = null;

  // Camera/viewport settings
  private centerX: number;
  private centerY: number;
  private scale: number = 1; // pixels per game world unit

  // Interaction state
  private selectedShipId: bigint | null = null;

  // Fire mode targeting state
  private fireModeTargetShipId: bigint | null = null;

  // Color scheme
  private colors = {
    arleighBurkeShip: '#4A90E2', // Blue
    carrierShip: '#7ED321', // Green
    missile: '#F5A623', // Orange
    waypoint: '#BD10E0', // Purple
    orderLine: '#50E3C2', // Teal
    background: '#001a33', // Dark blue
    grid: '#003366', // Grid color
    selected: '#FF6B6B', // Red for selected ship
    radarRing: '#50E3C2', // Teal for radar range ring
    radarFill: 'rgba(80, 227, 194, 0.05)', // Faint fill inside radar ring
    fireModeTarget: 'rgba(255, 107, 107, 0.35)', // semi-transparent red
    fireModeTargetStroke: '#FF0000', // Bright red stroke for fire mode target
  };

  constructor(canvas: HTMLCanvasElement | string) {
    // Get canvas element if string provided
    if (typeof canvas === 'string') {
      const element = document.querySelector(canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element not found: ${canvas}`);
      }
      this.canvas = element;
    } else {
      this.canvas = canvas;
    }

    // Get 2D context
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;

    // Initialize viewport to canvas center
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;

    // Get SpacetimeManager singleton
    this.spacetimeManager = SpacetimeManager.getInstance();

    // Subscribe to state changes
    this.spacetimeManager.subscribe(() => {
      // Re-render on state updates (handled by render loop)
    });

    console.log('[Renderer] Canvas2DRenderer initialized');
  }

  /**
   * Start the render loop
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('[Renderer] Render loop already running');
      return;
    }

    this.isRunning = true;
    console.log('[Renderer] Starting render loop');
    this.renderFrame();
  }

  /**
   * Stop the render loop
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isRunning = false;
    console.log('[Renderer] Render loop stopped');
  }

  /**
   * Set the resize listener for cleanup
   */
  public setResizeListener(listener: () => void): void {
    this.resizeListener = listener;
  }

  /**
   * Cleanup and destroy the renderer
   */
  public destroy(): void {
    this.stop();
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
    console.log('[Renderer] Renderer destroyed and listeners removed');
  }

  /**
   * Set camera center position in world space
   */
  public setCameraCenter(x: number, y: number): void {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    // Offset by world position
    this.centerX -= x * this.scale;
    this.centerY -= y * this.scale;
  }

  /**
   * Set zoom/scale level (pixels per world unit)
   */
  public setScale(scale: number): void {
    this.scale = Math.max(0.1, scale);
  }

  /**
   * Convert world coordinates to canvas coordinates
   */
  private worldToCanvas(worldX: number, worldY: number): [number, number] {
    const canvasX = this.centerX + worldX * this.scale;
    const canvasY = this.centerY + worldY * this.scale;
    return [canvasX, canvasY];
  }

  /**
   * Main render frame function
   */
  private renderFrame = (): void => {
    // Clear canvas with background color
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw optional grid
    this.drawGrid();

    // Get current game state from SpacetimeManager
    try {
      const ships = this.spacetimeManager.getShips();
      const missiles = this.spacetimeManager.getMissiles();

      // Render all ships
      for (const ship of ships) {
        this.renderShip(ship);
      }

      // Draw fire mode targeting highlight on top of ships
      if (this.fireModeTargetShipId !== null) {
        const targetShip = ships.find(s => s.id === this.fireModeTargetShipId);
        if (targetShip) {
          const [tx, ty] = this.worldToCanvas(targetShip.x, targetShip.y);
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.arc(tx, ty, 28, 0, Math.PI * 2);
          this.ctx.fillStyle = this.colors.fireModeTarget;
          this.ctx.fill();
          this.ctx.strokeStyle = this.colors.fireModeTargetStroke;
          this.ctx.lineWidth = 3;
          this.ctx.stroke();
          this.ctx.restore();
        }
      }

      // Render all missiles
      for (const missile of missiles) {
        this.renderMissile(missile);
      }
    } catch (error) {
      console.error('[Renderer] Error during render:', error);
    }

    // Schedule next frame
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.renderFrame);
    }
  };

  /**
   * Draw grid background (optional, useful for debugging)
   */
  private drawGrid(): void {
    const gridSize = 100; // World units
    const gridPixelSize = gridSize * this.scale;

    if (gridPixelSize < 5) return; // Don't draw grid if too small

    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 1;

    // Calculate grid offset
    const offsetX = this.centerX % gridPixelSize;
    const offsetY = this.centerY % gridPixelSize;

    // Draw vertical lines
    for (let x = offsetX; x < this.canvas.width; x += gridPixelSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = offsetY; y < this.canvas.height; y += gridPixelSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Render a ship as a rotated triangle
   */
  private renderShip(ship: Ship): void {
    const [canvasX, canvasY] = this.worldToCanvas(ship.x, ship.y);

    // Ship size - larger for carrier, smaller for destroyer
    const isCarrier = 'Carrier' in ship.shipClass;
    const shipSize = isCarrier ? 20 : 15;

    // Choose color based on ship class
    const fillColor = isCarrier ? this.colors.carrierShip : this.colors.arleighBurkeShip;

    // Check if this is the selected ship
    const isSelected = this.selectedShipId !== null && this.selectedShipId === ship.id;

    // Draw radar ring if radar is active
    if (ship.radarOn) {
      // ArleighBurke has 800 world-unit radar, Carrier has 500
      const radarRangeWorld = isCarrier ? 500 : 800;
      const radarRadiusCanvas = radarRangeWorld * this.scale;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(canvasX, canvasY, radarRadiusCanvas, 0, Math.PI * 2);
      this.ctx.fillStyle = this.colors.radarFill;
      this.ctx.fill();
      this.ctx.strokeStyle = this.colors.radarRing;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([6, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.restore();
    }

    // Save context state
    this.ctx.save();

    // Translate to ship position
    this.ctx.translate(canvasX, canvasY);

    // Rotate by ship heading (heading is in radians, pointing right = 0)
    this.ctx.rotate(ship.heading);

    // Draw triangle (pointing right, apex at front)
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    this.ctx.moveTo(shipSize, 0); // Front tip
    this.ctx.lineTo(-shipSize * 0.7, -shipSize * 0.7); // Back left
    this.ctx.lineTo(-shipSize * 0.5, 0); // Back center
    this.ctx.lineTo(-shipSize * 0.7, shipSize * 0.7); // Back right
    this.ctx.closePath();
    this.ctx.fill();

    // Draw outline - highlighted if selected
    if (isSelected) {
      this.ctx.strokeStyle = this.colors.selected;
      this.ctx.lineWidth = 3;
    } else {
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 1.5;
    }
    this.ctx.stroke();

    // Restore context state
    this.ctx.restore();

    // Draw ship label (nickname if available, or ID)
    this.drawShipLabel(canvasX, canvasY, ship, isSelected);

    // Draw waypoint and order line if ship has a waypoint
    if (ship.waypoint) {
      this.drawOrderLine(canvasX, canvasY, ship.waypoint.x, ship.waypoint.y);
      this.drawWaypoint(ship.waypoint.x, ship.waypoint.y);
    }
  }

  /**
   * Draw a ship's label (name/ID)
   */
  private drawShipLabel(x: number, y: number, ship: Ship, isSelected: boolean = false): void {
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    // Format label: show ship ID
    const label = `Ship ${ship.id.toString().substring(0, 4)}`;

    // Draw text with background
    const metrics = this.ctx.measureText(label);
    const textWidth = metrics.width;
    const textHeight = 14;
    const padding = 2;

    // Background rectangle - highlight if selected
    if (isSelected) {
      this.ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    }
    this.ctx.fillRect(
      x - textWidth / 2 - padding,
      y + 20 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Text
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(label, x, y + 20);
  }

  /**
   * Render a missile as a small circle or dot
   */
  private renderMissile(missile: Missile): void {
    const [canvasX, canvasY] = this.worldToCanvas(missile.x, missile.y);

    // Draw missile as small circle
    const missileRadius = 4;
    this.ctx.fillStyle = this.colors.missile;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, missileRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw direction line showing velocity
    const velocityLength = 10;
    const endX = canvasX + Math.cos(missile.heading) * velocityLength;
    const endY = canvasY + Math.sin(missile.heading) * velocityLength;

    this.ctx.strokeStyle = this.colors.missile;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(canvasX, canvasY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw outline
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 0.5;
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, missileRadius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Draw a waypoint marker
   */
  private drawWaypoint(x: number, y: number): void {
    const [canvasX, canvasY] = this.worldToCanvas(x, y);

    const waypointSize = 12;

    // Draw crosshair
    this.ctx.strokeStyle = this.colors.waypoint;
    this.ctx.lineWidth = 2;

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(canvasX, canvasY - waypointSize);
    this.ctx.lineTo(canvasX, canvasY + waypointSize);
    this.ctx.stroke();

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(canvasX - waypointSize, canvasY);
    this.ctx.lineTo(canvasX + waypointSize, canvasY);
    this.ctx.stroke();

    // Circle around waypoint
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, waypointSize * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Draw an order line from ship to waypoint
   */
  private drawOrderLine(shipX: number, shipY: number, waypointX: number, waypointY: number): void {
    const [waypointCanvasX, waypointCanvasY] = this.worldToCanvas(waypointX, waypointY);

    // Draw dashed line from ship to waypoint
    this.ctx.strokeStyle = this.colors.orderLine;
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 5]); // Dashed pattern

    this.ctx.beginPath();
    this.ctx.moveTo(shipX, shipY);
    this.ctx.lineTo(waypointCanvasX, waypointCanvasY);
    this.ctx.stroke();

    // Reset line dash
    this.ctx.setLineDash([]);
  }

  /**
   * Handle canvas resize
   */
  public handleResize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    // Recenter camera
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;

    console.log(`[Renderer] Canvas resized to ${width}x${height}`);
  }

  /**
   * Get canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get current scale
   */
  public getScale(): number {
    return this.scale;
  }

  /**
   * Set specific color for a rendering element
   */
  public setColor(element: keyof typeof this.colors, color: string): void {
    this.colors[element] = color;
  }

  /**
   * Set the selected ship ID (for highlighting)
   */
  public setSelectedShip(shipId: bigint | null): void {
    this.selectedShipId = shipId;
  }

  /**
   * Get the selected ship ID
   */
  public getSelectedShip(): bigint | null {
    return this.selectedShipId;
  }

  /**
   * Set the fire mode target ship ID (for targeting highlight)
   */
  public setFireModeTarget(shipId: bigint | null): void {
    this.fireModeTargetShipId = shipId;
  }

  /**
   * Get the fire mode target ship ID
   */
  public getFireModeTarget(): bigint | null {
    return this.fireModeTargetShipId;
  }

  /**
   * Get viewport center position
   */
  public getViewportCenter(): [number, number] {
    return [this.centerX, this.centerY];
  }
}

/**
 * Create and initialize a canvas renderer
 *
 * @param canvasSelector - CSS selector or HTMLCanvasElement
 * @returns Canvas2DRenderer instance
 */
export function createRenderer(canvasSelector: string | HTMLCanvasElement): Canvas2DRenderer {
  return new Canvas2DRenderer(canvasSelector);
}

/**
 * Initialize renderer with full integration
 *
 * Creates canvas if needed, sets up event listeners, and starts rendering
 */
export function initializeRenderer(containerId: string = 'app'): Canvas2DRenderer {
  // Get or create canvas element
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element not found: ${containerId}`);
  }

  let canvas = container.querySelector('canvas') as HTMLCanvasElement;
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.appendChild(canvas);
  }

  // Set canvas size to fill container
  const resizeCanvas = (): void => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Create renderer
  const renderer = new Canvas2DRenderer(canvas);
  renderer.setResizeListener(resizeCanvas);

  // Start rendering
  renderer.start();

  console.log('[Renderer] Renderer initialized and started');

  return renderer;
}
