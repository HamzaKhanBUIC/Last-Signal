/**
 * THE LAST SIGNAL — Level & World Manager
 * 
 * Manages the AEGIS-7 station grid, tile collision detection, entity spatial queries,
 * dynamic wall segment generation for 2D raycast lighting, door security logic,
 * and sector tracking.
 */

import { TILE_TYPES, TILE_SIZE } from '../utils/Constants.js';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  createStationGrid,
  SECTORS,
  PLAYER_SPAWN,
  ENEMY_SPAWN,
  ENEMY_PATROL_WAYPOINTS,
  TERMINALS,
  PICKUPS,
  LIGHT_SOURCES
} from './MapData.js';
import { clamp, circleAABBCollision } from '../utils/MathUtils.js';

export class LevelManager {
  /**
   * @param {Object} [options]
   * @param {number[][]} [options.grid] Custom grid matrix
   * @param {number} [options.width] Map width in tiles
   * @param {number} [options.height] Map height in tiles
   * @param {number} [options.tileSize] Tile size in pixels
   */
  constructor(options = {}) {
    this.width = options.width || MAP_WIDTH;
    this.height = options.height || MAP_HEIGHT;
    this.tileSize = options.tileSize || TILE_SIZE;

    // Active grid state
    this.grid = options.grid ? options.grid.map(row => [...row]) : createStationGrid();

    // World definitions
    this.sectors = options.sectors || [...SECTORS];
    this.playerSpawn = options.playerSpawn ? { ...options.playerSpawn } : { ...PLAYER_SPAWN };
    this.enemySpawn = options.enemySpawn ? { ...options.enemySpawn } : { ...ENEMY_SPAWN };
    this.enemyWaypoints = options.enemyWaypoints || [...ENEMY_PATROL_WAYPOINTS];
    this.terminals = options.terminals ? JSON.parse(JSON.stringify(options.terminals)) : JSON.parse(JSON.stringify(TERMINALS));
    this.pickups = options.pickups ? JSON.parse(JSON.stringify(options.pickups)) : JSON.parse(JSON.stringify(PICKUPS));
    this.lightSources = options.lightSources ? JSON.parse(JSON.stringify(options.lightSources)) : JSON.parse(JSON.stringify(LIGHT_SOURCES));

    // Cached wall segments for dynamic 2D raycasting lighting
    this.wallSegmentsCache = null;
  }

  /**
   * Convert world coordinates (pixels) to grid tile coordinates
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{ tileX: number, tileY: number }}
   */
  worldToTile(worldX, worldY) {
    return {
      tileX: Math.floor(worldX / this.tileSize),
      tileY: Math.floor(worldY / this.tileSize)
    };
  }

  /**
   * Convert grid tile coordinates to center world coordinates (pixels)
   * @param {number} tileX
   * @param {number} tileY
   * @returns {{ x: number, y: number }}
   */
  tileToWorld(tileX, tileY) {
    return {
      x: (tileX + 0.5) * this.tileSize,
      y: (tileY + 0.5) * this.tileSize
    };
  }

  /**
   * Check if tile coordinates are inside grid bounds
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isTileInBounds(tileX, tileY) {
    return tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height;
  }

  /**
   * Get the tile type at specified grid position
   * @param {number} tileX
   * @param {number} tileY
   * @returns {number}
   */
  getTile(tileX, tileY) {
    if (!this.isTileInBounds(tileX, tileY)) {
      return TILE_TYPES.VOID;
    }
    return this.grid[tileY][tileX];
  }

  /**
   * Set the tile type at specified grid position
   * @param {number} tileX
   * @param {number} tileY
   * @param {number} tileType
   */
  setTile(tileX, tileY, tileType) {
    if (this.isTileInBounds(tileX, tileY)) {
      this.grid[tileY][tileX] = tileType;
      this.invalidateCache();
    }
  }

  /**
   * Invalidate cached geometry (wall segments for raycasting)
   */
  invalidateCache() {
    this.wallSegmentsCache = null;
  }

  /**
   * Determine if a tile is solid (blocks entity movement and pathfinding)
   * Solid tiles: Void, Walls, Glass, Closed/Locked Doors, Machines/Props
   * @param {number} tileX
   * @param {number} tileY
   * @param {boolean} [allowLockedDoors=false] If true, treat closed/locked doors as walkable
   * @returns {boolean}
   */
  isTileSolid(tileX, tileY, allowLockedDoors = false) {
    if (!this.isTileInBounds(tileX, tileY)) {
      return true;
    }

    const type = this.grid[tileY][tileX];

    // Floor and grates and open doors are never solid
    if (type === TILE_TYPES.FLOOR || type === TILE_TYPES.FLOOR_GRATE || type === TILE_TYPES.DOOR_OPEN) {
      return false;
    }

    // Closed and locked doors
    if (type === TILE_TYPES.DOOR_CLOSED ||
        type === TILE_TYPES.DOOR_LOCKED_BLUE ||
        type === TILE_TYPES.DOOR_LOCKED_RED ||
        type === TILE_TYPES.DOOR_LOCKED_MASTER) {
      return !allowLockedDoors;
    }

    // Walls, Glass windows, Generator, Comms Dish, Escape Pod, and Void are solid
    return true;
  }

  /**
   * Determine if a tile is opaque (blocks light raycasting & vision cones)
   * Note: Glass windows are solid to movement, but transparent to light!
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isTileOpaque(tileX, tileY) {
    if (!this.isTileInBounds(tileX, tileY)) {
      return true;
    }

    const type = this.grid[tileY][tileX];

    // Glass allows light to pass through!
    if (type === TILE_TYPES.GLASS) {
      return false;
    }

    // Floors, grates, and open doors allow light
    if (type === TILE_TYPES.FLOOR || type === TILE_TYPES.FLOOR_GRATE || type === TILE_TYPES.DOOR_OPEN) {
      return false;
    }

    // Walls, Closed/Locked Doors, Generators, Comms Dish, Escape Pod, and Void block light
    return true;
  }

  /**
   * Check if an entity with a circular bounding box collides with any solid tile
   * @param {number} worldX Center X coordinate in pixels
   * @param {number} worldY Center Y coordinate in pixels
   * @param {number} [radius=12] Entity collision radius
   * @param {boolean} [allowLockedDoors=false]
   * @returns {boolean} True if collision occurs
   */
  isPositionSolid(worldX, worldY, radius = 12, allowLockedDoors = false) {
    const minTileX = Math.floor((worldX - radius) / this.tileSize);
    const maxTileX = Math.floor((worldX + radius) / this.tileSize);
    const minTileY = Math.floor((worldY - radius) / this.tileSize);
    const maxTileY = Math.floor((worldY + radius) / this.tileSize);

    // Check boundary extremes
    if (worldX - radius < 0 || worldX + radius > this.width * this.tileSize ||
        worldY - radius < 0 || worldY + radius > this.height * this.tileSize) {
      return true;
    }

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.isTileSolid(tx, ty, allowLockedDoors)) {
          const tileBx = tx * this.tileSize;
          const tileBy = ty * this.tileSize;

          // Closest point on tile AABB to circle center
          const closestX = clamp(worldX, tileBx, tileBx + this.tileSize);
          const closestY = clamp(worldY, tileBy, tileBy + this.tileSize);

          const distX = worldX - closestX;
          const distY = worldY - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < radius * radius) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all solid tile bounding boxes surrounding a position within a query radius
   * Useful for physics collision solvers and sliding mechanics
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} [radius=32]
   * @returns {Array<{ tileX: number, tileY: number, x: number, y: number, width: number, height: number, type: number }>}
   */
  getSurroundingWalls(worldX, worldY, radius = 32) {
    const walls = [];
    const minTileX = Math.max(0, Math.floor((worldX - radius) / this.tileSize));
    const maxTileX = Math.min(this.width - 1, Math.floor((worldX + radius) / this.tileSize));
    const minTileY = Math.max(0, Math.floor((worldY - radius) / this.tileSize));
    const maxTileY = Math.min(this.height - 1, Math.floor((worldY + radius) / this.tileSize));

    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (this.isTileSolid(tx, ty)) {
          walls.push({
            tileX: tx,
            tileY: ty,
            x: tx * this.tileSize,
            y: ty * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
            type: this.grid[ty][tx]
          });
        }
      }
    }

    return walls;
  }

  /**
   * Resolve circular entity collision against surrounding solid tiles with smooth sliding
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} [radius=12]
   * @param {number} [iterations=3]
   * @returns {{ x: number, y: number, collided: boolean }}
   */
  resolveCircleCollision(worldX, worldY, radius = 12, iterations = 3) {
    let currX = worldX;
    let currY = worldY;
    let anyCollided = false;

    for (let iter = 0; iter < iterations; iter++) {
      const walls = this.getSurroundingWalls(currX, currY, radius + this.tileSize);

      for (const wall of walls) {
        const res = circleAABBCollision(
          currX,
          currY,
          radius,
          wall.x,
          wall.y,
          wall.width,
          wall.height
        );

        if (res.collided) {
          anyCollided = true;
          currX += res.resolveX;
          currY += res.resolveY;
        }
      }
    }

    return {
      x: currX,
      y: currY,
      collided: anyCollided
    };
  }

  /**
   * Extract 2D line segments representing all light-occluding boundaries in the station.
   * Merges contiguous horizontal and vertical wall edges for blazing-fast 2D dynamic raycasting!
   * @returns {Array<{ p1: { x: number, y: number }, p2: { x: number, y: number } }>}
   */
  getWallSegments() {
    if (this.wallSegmentsCache) {
      return this.wallSegmentsCache;
    }

    const segments = [];
    const ts = this.tileSize;

    // 1. Horizontal Edges (Top and Bottom of opaque tiles facing non-opaque)
    // Top edges: opaque tile at (x, y) with non-opaque at (x, y - 1)
    for (let y = 0; y < this.height; y++) {
      let runStart = -1;
      for (let x = 0; x < this.width; x++) {
        const isOpaque = this.isTileOpaque(x, y);
        const neighborAboveOpaque = y > 0 ? this.isTileOpaque(x, y - 1) : false;
        const hasTopEdge = isOpaque && !neighborAboveOpaque;

        if (hasTopEdge) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1) {
            segments.push({
              p1: { x: runStart * ts, y: y * ts },
              p2: { x: x * ts, y: y * ts }
            });
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        segments.push({
          p1: { x: runStart * ts, y: y * ts },
          p2: { x: this.width * ts, y: y * ts }
        });
      }
    }

    // Bottom edges: opaque tile at (x, y) with non-opaque at (x, y + 1)
    for (let y = 0; y < this.height; y++) {
      let runStart = -1;
      for (let x = 0; x < this.width; x++) {
        const isOpaque = this.isTileOpaque(x, y);
        const neighborBelowOpaque = y < this.height - 1 ? this.isTileOpaque(x, y + 1) : false;
        const hasBottomEdge = isOpaque && !neighborBelowOpaque;

        if (hasBottomEdge) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1) {
            segments.push({
              p1: { x: runStart * ts, y: (y + 1) * ts },
              p2: { x: x * ts, y: (y + 1) * ts }
            });
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        segments.push({
          p1: { x: runStart * ts, y: (y + 1) * ts },
          p2: { x: this.width * ts, y: (y + 1) * ts }
        });
      }
    }

    // 2. Vertical Edges (Left and Right of opaque tiles facing non-opaque)
    // Left edges: opaque tile at (x, y) with non-opaque at (x - 1, y)
    for (let x = 0; x < this.width; x++) {
      let runStart = -1;
      for (let y = 0; y < this.height; y++) {
        const isOpaque = this.isTileOpaque(x, y);
        const neighborLeftOpaque = x > 0 ? this.isTileOpaque(x - 1, y) : false;
        const hasLeftEdge = isOpaque && !neighborLeftOpaque;

        if (hasLeftEdge) {
          if (runStart === -1) runStart = y;
        } else {
          if (runStart !== -1) {
            segments.push({
              p1: { x: x * ts, y: runStart * ts },
              p2: { x: x * ts, y: y * ts }
            });
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        segments.push({
          p1: { x: x * ts, y: runStart * ts },
          p2: { x: x * ts, y: this.height * ts }
        });
      }
    }

    // Right edges: opaque tile at (x, y) with non-opaque at (x + 1, y)
    for (let x = 0; x < this.width; x++) {
      let runStart = -1;
      for (let y = 0; y < this.height; y++) {
        const isOpaque = this.isTileOpaque(x, y);
        const neighborRightOpaque = x < this.width - 1 ? this.isTileOpaque(x + 1, y) : false;
        const hasRightEdge = isOpaque && !neighborRightOpaque;

        if (hasRightEdge) {
          if (runStart === -1) runStart = y;
        } else {
          if (runStart !== -1) {
            segments.push({
              p1: { x: (x + 1) * ts, y: runStart * ts },
              p2: { x: (x + 1) * ts, y: y * ts }
            });
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        segments.push({
          p1: { x: (x + 1) * ts, y: runStart * ts },
          p2: { x: (x + 1) * ts, y: this.height * ts }
        });
      }
    }

    // Outer map boundary containment segment loop
    segments.push(
      { p1: { x: 0, y: 0 }, p2: { x: this.width * ts, y: 0 } },
      { p1: { x: this.width * ts, y: 0 }, p2: { x: this.width * ts, y: this.height * ts } },
      { p1: { x: this.width * ts, y: this.height * ts }, p2: { x: 0, y: this.height * ts } },
      { p1: { x: 0, y: this.height * ts }, p2: { x: 0, y: 0 } }
    );

    this.wallSegmentsCache = segments;
    return segments;
  }

  /**
   * Interact with a door at grid coordinates using player inventory keycards
   * @param {number} tileX
   * @param {number} tileY
   * @param {Object} [inventory={}] Player inventory object or helper
   * @returns {{ success: boolean, message: string, state?: string, requiredKey?: string }}
   */
  interactDoor(tileX, tileY, inventory = {}) {
    if (!this.isTileInBounds(tileX, tileY)) {
      return { success: false, message: 'Coordinates out of bounds.' };
    }

    const tileType = this.grid[tileY][tileX];

    // Helper to check keycard possession
    const hasKey = (color) => {
      if (typeof inventory.hasKeycard === 'function') {
        return inventory.hasKeycard(color);
      }
      if (inventory.keycards && Array.isArray(inventory.keycards)) {
        return inventory.keycards.includes(color);
      }
      if (color === 'blue' && (inventory.hasBlueKeycard || inventory.blueKeycard)) return true;
      if (color === 'red' && (inventory.hasRedKeycard || inventory.redKeycard)) return true;
      if (color === 'master' && (inventory.hasMasterKeycard || inventory.masterKeycard)) return true;
      return false;
    };

    switch (tileType) {
      case TILE_TYPES.DOOR_CLOSED:
        this.setTile(tileX, tileY, TILE_TYPES.DOOR_OPEN);
        return {
          success: true,
          message: 'Airlock bulkhead opened.',
          state: 'OPENED'
        };

      case TILE_TYPES.DOOR_OPEN:
        // Option to toggle closed or leave open
        return {
          success: true,
          message: 'Door is already open.',
          state: 'OPEN'
        };

      case TILE_TYPES.DOOR_LOCKED_BLUE:
        if (hasKey('blue') || hasKey('master')) {
          this.setTile(tileX, tileY, TILE_TYPES.DOOR_OPEN);
          return {
            success: true,
            message: 'Blue Security clearance verified. Bulkhead opened.',
            state: 'UNLOCKED'
          };
        }
        return {
          success: false,
          message: 'ACCESS DENIED: Blue Security Keycard required [SEC-01].',
          requiredKey: 'blue'
        };

      case TILE_TYPES.DOOR_LOCKED_RED:
        if (hasKey('red') || hasKey('master')) {
          this.setTile(tileX, tileY, TILE_TYPES.DOOR_OPEN);
          return {
            success: true,
            message: 'Red Engineering clearance verified. Bulkhead opened.',
            state: 'UNLOCKED'
          };
        }
        return {
          success: false,
          message: 'ACCESS DENIED: Red Engineering Keycard required [SEC-02].',
          requiredKey: 'red'
        };

      case TILE_TYPES.DOOR_LOCKED_MASTER:
        if (hasKey('master')) {
          this.setTile(tileX, tileY, TILE_TYPES.DOOR_OPEN);
          return {
            success: true,
            message: 'Master Command clearance authorized. High-security bulkhead opened.',
            state: 'UNLOCKED'
          };
        }
        return {
          success: false,
          message: 'ACCESS DENIED: Master Command Keycard required [SEC-03].',
          requiredKey: 'master'
        };

      default:
        return {
          success: false,
          message: 'No interactive door at target coordinates.'
        };
    }
  }

  /**
   * Get the sector metadata containing the given world or tile coordinates
   * @param {number} worldX
   * @param {number} worldY
   * @returns {Object} Sector metadata
   */
  getSectorAt(worldX, worldY) {
    const tileX = Math.floor(worldX / this.tileSize);
    const tileY = Math.floor(worldY / this.tileSize);

    for (const sector of this.sectors) {
      const b = sector.bounds;
      if (tileX >= b.x && tileX < b.x + b.width &&
          tileY >= b.y && tileY < b.y + b.height) {
        return sector;
      }
    }

    // Default corridor / unmapped zone fallback
    return {
      id: 'sector-corridor',
      number: 0,
      name: 'Station Transit Conduits',
      code: 'SEC-CORRIDOR',
      description: 'Intermediate pressurized maintenance hallways.',
      ambientColor: 'rgba(25, 25, 35, 0.5)',
      alarmState: false,
      theme: 'corridor'
    };
  }

  /**
   * Retrieve all interactive station terminals
   */
  getTerminals() {
    return this.terminals;
  }

  /**
   * Retrieve all world pickups (fragments, keycards, batteries, medkits)
   */
  getPickups() {
    return this.pickups;
  }

  /**
   * Retrieve dynamic ambient light sources
   */
  getLightSources() {
    return this.lightSources;
  }

  /**
   * Retrieve player spawn point
   */
  getPlayerSpawn() {
    return this.playerSpawn;
  }

  /**
   * Retrieve enemy spawn point
   */
  getEnemySpawn() {
    return this.enemySpawn;
  }

  /**
   * Retrieve enemy patrol route waypoints
   */
  getEnemyWaypoints() {
    return this.enemyWaypoints;
  }
}
