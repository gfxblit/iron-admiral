/**
 * SpaceTimeDB Connection Manager
 *
 * Handles WebSocket connection to the SpaceTimeDB backend instance,
 * manages subscriptions to game state tables (Player, Ship, Missile),
 * and exposes the state through accessor methods.
 */

import { DbConnection } from './module_bindings';
import type { Player, Ship, Missile } from './module_bindings/types';

/**
 * SpacetimeManager
 *
 * Singleton manager for SpaceTimeDB connection and state subscriptions.
 * Maintains reactive state for Player, Ship, and Missile tables.
 */
export class SpacetimeManager {
  private static instance: SpacetimeManager | null = null;

  private connection: DbConnection | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  // Event listeners for state changes
  private listeners: Set<() => void> = new Set();

  /**
   * Get singleton instance
   */
  public static getInstance(): SpacetimeManager {
    if (!SpacetimeManager.instance) {
      SpacetimeManager.instance = new SpacetimeManager();
    }
    return SpacetimeManager.instance;
  }

  /**
   * Connect to SpaceTimeDB instance
   *
   * @param wsUrl - WebSocket URL (default: ws://localhost:3000)
   * @returns Promise<void>
   */
  public async connect(wsUrl: string = 'ws://localhost:3000'): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      console.warn('[SpacetimeManager] Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`[SpacetimeManager] Connecting to ${wsUrl}...`);

      // Build and establish connection
      this.connection = await DbConnection.builder()
        .withUri(wsUrl)
        .onConnect(() => {
          console.log('[SpacetimeManager] Connection established');
          this.handleConnectionEstablished();
        })
        .onDisconnect(() => {
          console.log('[SpacetimeManager] Disconnected');
          this.handleDisconnect();
        })
        .onConnectError((error) => {
          console.error('[SpacetimeManager] Connection error:', error);
          this.handleConnectionError();
        })
        .build();

      // Subscribe to all game tables
      this.connection
        .subscriptionBuilder()
        .onApplied(() => {
          console.log('[SpacetimeManager] Subscription applied');
          this.handleSubscriptionApplied();
        })
        .onError((ctx: any) => {
          console.error('[SpacetimeManager] Subscription error:', ctx?.error);
        })
        .subscribe(['SELECT * FROM player', 'SELECT * FROM ship', 'SELECT * FROM missile']);

      // Register table update handlers for real-time updates
      this.connection.db.player.onInsert(() => {
        this.notifyListeners();
      });
      this.connection.db.player.onUpdate(() => {
        this.notifyListeners();
      });
      this.connection.db.player.onDelete(() => {
        this.notifyListeners();
      });

      this.connection.db.ship.onInsert(() => {
        this.notifyListeners();
      });
      this.connection.db.ship.onUpdate(() => {
        this.notifyListeners();
      });
      this.connection.db.ship.onDelete(() => {
        this.notifyListeners();
      });

      this.connection.db.missile.onInsert(() => {
        this.notifyListeners();
      });
      this.connection.db.missile.onUpdate(() => {
        this.notifyListeners();
      });
      this.connection.db.missile.onDelete(() => {
        this.notifyListeners();
      });

      this.isConnected = true;
      this.isConnecting = false;
      console.log('[SpacetimeManager] Connected and subscribed to game tables');
      this.notifyListeners();
    } catch (error) {
      this.isConnecting = false;
      console.error('[SpacetimeManager] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from SpaceTimeDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected || !this.connection) {
      return;
    }

    try {
      console.log('[SpacetimeManager] Disconnecting...');
      await this.connection.disconnect();
      this.isConnected = false;
      this.connection = null;

      this.notifyListeners();
      console.log('[SpacetimeManager] Disconnected');
    } catch (error) {
      console.error('[SpacetimeManager] Error during disconnect:', error);
    }
  }

  /**
   * Check if connected to SpaceTimeDB
   */
  public isOnline(): boolean {
    return this.isConnected;
  }

  /**
   * Get all players
   *
   * @returns Array of Player objects
   */
  public getPlayers(): Player[] {
    if (!this.connection) {
      return [];
    }

    try {
      return Array.from(this.connection.db.player.iter());
    } catch (error) {
      console.error('[SpacetimeManager] Error getting players:', error);
      return [];
    }
  }

  /**
   * Get all ships
   *
   * @returns Array of Ship objects with position, heading, velocity
   */
  public getShips(): Ship[] {
    if (!this.connection) {
      return [];
    }

    try {
      return Array.from(this.connection.db.ship.iter());
    } catch (error) {
      console.error('[SpacetimeManager] Error getting ships:', error);
      return [];
    }
  }

  /**
   * Get all missiles
   *
   * @returns Array of Missile objects with position, velocity
   */
  public getMissiles(): Missile[] {
    if (!this.connection) {
      return [];
    }

    try {
      return Array.from(this.connection.db.missile.iter());
    } catch (error) {
      console.error('[SpacetimeManager] Error getting missiles:', error);
      return [];
    }
  }

  /**
   * Get a specific player by identity hex string
   */
  public getPlayer(identityHex: string): Player | undefined {
    if (!this.connection) {
      return undefined;
    }

    try {
      for (const player of this.connection.db.player.iter()) {
        const playerIdentityHex = (player.identity as any).toHexString?.() || String(player.identity);
        if (playerIdentityHex === identityHex) {
          return player;
        }
      }
      return undefined;
    } catch (error) {
      console.error('[SpacetimeManager] Error getting player:', error);
      return undefined;
    }
  }

  /**
   * Get a specific ship by ID
   */
  public getShip(shipId: bigint): Ship | undefined {
    if (!this.connection) {
      return undefined;
    }

    try {
      for (const ship of this.connection.db.ship.iter()) {
        if (ship.id === shipId) {
          return ship;
        }
      }
      return undefined;
    } catch (error) {
      console.error('[SpacetimeManager] Error getting ship:', error);
      return undefined;
    }
  }

  /**
   * Get a specific missile by ID
   */
  public getMissile(missileId: bigint): Missile | undefined {
    if (!this.connection) {
      return undefined;
    }

    try {
      for (const missile of this.connection.db.missile.iter()) {
        if (missile.id === missileId) {
          return missile;
        }
      }
      return undefined;
    } catch (error) {
      console.error('[SpacetimeManager] Error getting missile:', error);
      return undefined;
    }
  }

  /**
   * Register a listener for state changes
   *
   * @param listener - Callback function to invoke on state updates
   * @returns Function to unregister the listener
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Fire a missile from a ship
   */
  public async fireMissile(
    shipId: bigint,
    targetShipId: bigint | null = null,
    targetX: number = 0,
    targetY: number = 0
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpaceTimeDB');
    }

    try {
      (this.connection.reducers as any).fireMissile(shipId, targetX, targetY, targetShipId);
    } catch (error) {
      console.error('[SpacetimeManager] Error firing missile:', error);
      throw error;
    }
  }

  /**
   * Register a player
   */
  public async registerPlayer(nickname: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpaceTimeDB');
    }

    try {
      (this.connection.reducers as any).registerPlayer(nickname);
    } catch (error) {
      console.error('[SpacetimeManager] Error registering player:', error);
      throw error;
    }
  }

  /**
   * Set a waypoint for a ship
   */
  public async setWaypoint(
    shipId: bigint,
    x: number,
    y: number,
    targetSpeed: number
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpaceTimeDB');
    }

    try {
      (this.connection.reducers as any).setWaypoint(shipId, x, y, targetSpeed);
    } catch (error) {
      console.error('[SpacetimeManager] Error setting waypoint:', error);
      throw error;
    }
  }

  /**
   * Toggle radar for a ship
   */
  public async toggleRadar(shipId: bigint): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpaceTimeDB');
    }

    try {
      (this.connection.reducers as any).toggleRadar(shipId);
    } catch (error) {
      console.error('[SpacetimeManager] Error toggling radar:', error);
      throw error;
    }
  }

  /**
   * Spawn a new ship
   */
  public async spawnShip(
    shipClass: 'ArleighBurke' | 'Carrier',
    x: number,
    y: number
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpaceTimeDB');
    }

    try {
      const shipClassValue = shipClass === 'Carrier' ? { Carrier: {} } : { ArleighBurke: {} };
      (this.connection.reducers as any).spawnShip(shipClassValue, x, y);
    } catch (error) {
      console.error('[SpacetimeManager] Error spawning ship:', error);
      throw error;
    }
  }

  /**
   * Handle connection established
   */
  private handleConnectionEstablished(): void {
    this.notifyListeners();
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.isConnected = false;
    this.notifyListeners();
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.notifyListeners();
  }

  /**
   * Handle subscription applied
   */
  private handleSubscriptionApplied(): void {
    this.notifyListeners();
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[SpacetimeManager] Error in listener:', error);
      }
    });
  }
}

// Export singleton instance getter for convenience
export const getSpacetimeManager = (): SpacetimeManager => {
  return SpacetimeManager.getInstance();
};
