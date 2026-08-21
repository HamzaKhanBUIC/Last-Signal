/**
 * THE LAST SIGNAL — High Performance Grid A* Pathfinding
 * 
 * Implements 8-directional A* search with octile heuristics, corner-cutting
 * prevention, binary min-heap priority queue, door traversability flags,
 * and raycast string-pulling path smoothing.
 */

import { octileDistance, distance } from '../utils/MathUtils.js';

/**
 * Binary Min-Heap Priority Queue for high-throughput A* search
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._sinkDown(0);
    }
    return top;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  _bubbleUp(index) {
    const node = this.heap[index];
    while (index > 0) {
      const parentIdx = (index - 1) >> 1;
      const parent = this.heap[parentIdx];
      if (node.f >= parent.f) break;
      this.heap[index] = parent;
      index = parentIdx;
    }
    this.heap[index] = node;
  }

  _sinkDown(index) {
    const length = this.heap.length;
    const node = this.heap[index];

    while (true) {
      const leftIdx = (index << 1) + 1;
      const rightIdx = leftIdx + 1;
      let swapIdx = -1;

      if (leftIdx < length) {
        if (this.heap[leftIdx].f < node.f) {
          swapIdx = leftIdx;
        }
      }

      if (rightIdx < length) {
        if (
          (swapIdx === -1 && this.heap[rightIdx].f < node.f) ||
          (swapIdx !== -1 && this.heap[rightIdx].f < this.heap[leftIdx].f)
        ) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === -1) break;
      this.heap[index] = this.heap[swapIdx];
      index = swapIdx;
    }
    this.heap[index] = node;
  }
}

// 8-directional movement offsets with orthogonal/diagonal costs & corner checks
const SQRT2 = Math.SQRT2;
const NEIGHBOR_DIRECTIONS = [
  // 4 Orthogonal Directions
  { dx: 0, dy: -1, cost: 1, isDiagonal: false },
  { dx: 0, dy: 1, cost: 1, isDiagonal: false },
  { dx: -1, dy: 0, cost: 1, isDiagonal: false },
  { dx: 1, dy: 0, cost: 1, isDiagonal: false },
  // 4 Diagonal Directions (requires adjacent orthogonals to be walkable to prevent corner clipping)
  { dx: -1, dy: -1, cost: SQRT2, isDiagonal: true, c1x: -1, c1y: 0, c2x: 0, c2y: -1 },
  { dx: 1, dy: -1, cost: SQRT2, isDiagonal: true, c1x: 1, c1y: 0, c2x: 0, c2y: -1 },
  { dx: -1, dy: 1, cost: SQRT2, isDiagonal: true, c1x: -1, c1y: 0, c2x: 0, c2y: 1 },
  { dx: 1, dy: 1, cost: SQRT2, isDiagonal: true, c1x: 1, c1y: 0, c2x: 0, c2y: 1 }
];

export class Pathfinding {
  /**
   * @param {import('./LevelManager.js').LevelManager} levelManager
   */
  constructor(levelManager) {
    this.level = levelManager;
    this.width = levelManager.width;
    this.height = levelManager.height;
    this.totalTiles = this.width * this.height;

    // Fast reusable lookup buffers
    this.gScore = new Float32Array(this.totalTiles);
    this.cameFrom = new Int32Array(this.totalTiles);
    this.closedSet = new Uint8Array(this.totalTiles);
    this.openSet = new MinHeap();
  }

  /**
   * Find an optimal path from start to target coordinates
   * @param {number} startX Start X (tile or world pixel)
   * @param {number} startY Start Y (tile or world pixel)
   * @param {number} targetX Target X (tile or world pixel)
   * @param {number} targetY Target Y (tile or world pixel)
   * @param {Object} [options]
   * @param {boolean} [options.isWorldCoords=false] If true, inputs and outputs are in world pixel coordinates
   * @param {boolean} [options.allowLockedDoors=false] If true, paths can traverse closed/locked doors
   * @param {boolean} [options.smooth=true] If true, perform raycast string-pulling path smoothing
   * @param {number} [options.maxIterations=4000] Maximum search steps
   * @returns {Array<{ x: number, y: number, tileX: number, tileY: number }> | null} Path waypoints or null if unreachable
   */
  findPath(startX, startY, targetX, targetY, options = {}) {
    const isWorld = options.isWorldCoords || false;
    const allowLockedDoors = options.allowLockedDoors || false;
    const smooth = options.smooth !== undefined ? options.smooth : true;
    const maxIterations = options.maxIterations || 4000;

    let sTileX = isWorld ? Math.floor(startX / this.level.tileSize) : Math.floor(startX);
    let sTileY = isWorld ? Math.floor(startY / this.level.tileSize) : Math.floor(startY);
    let tTileX = isWorld ? Math.floor(targetX / this.level.tileSize) : Math.floor(targetX);
    let tTileY = isWorld ? Math.floor(targetY / this.level.tileSize) : Math.floor(targetY);

    // Out of bounds check
    if (!this.level.isTileInBounds(sTileX, sTileY) || !this.level.isTileInBounds(tTileX, tTileY)) {
      return null;
    }

    // Start equals target
    if (sTileX === tTileX && sTileY === tTileY) {
      const worldPos = this.level.tileToWorld(sTileX, sTileY);
      return [{
        tileX: sTileX,
        tileY: sTileY,
        x: isWorld ? targetX : worldPos.x,
        y: isWorld ? targetY : worldPos.y
      }];
    }

    // If destination is solid, find closest walkable adjacent tile
    if (this.level.isTileSolid(tTileX, tTileY, allowLockedDoors)) {
      const altTarget = this._findClosestWalkableNeighbor(tTileX, tTileY, sTileX, sTileY, allowLockedDoors);
      if (!altTarget) {
        return null;
      }
      tTileX = altTarget.tileX;
      tTileY = altTarget.tileY;
    }

    // Reset reusable state buffers
    this.gScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.closedSet.fill(0);
    this.openSet = new MinHeap();

    const startIndex = sTileY * this.width + sTileX;
    const targetIndex = tTileY * this.width + tTileX;

    this.gScore[startIndex] = 0;
    const initialH = octileDistance(sTileX, sTileY, tTileX, tTileY);

    this.openSet.push({
      index: startIndex,
      tileX: sTileX,
      tileY: sTileY,
      f: initialH,
      g: 0
    });

    let iterations = 0;
    let targetReached = false;

    while (!this.openSet.isEmpty() && iterations < maxIterations) {
      iterations++;
      const current = this.openSet.pop();

      if (current.index === targetIndex) {
        targetReached = true;
        break;
      }

      if (this.closedSet[current.index] === 1) {
        continue;
      }
      this.closedSet[current.index] = 1;

      const currX = current.tileX;
      const currY = current.tileY;
      const currG = this.gScore[current.index];

      for (let i = 0; i < NEIGHBOR_DIRECTIONS.length; i++) {
        const dir = NEIGHBOR_DIRECTIONS[i];
        const nx = currX + dir.dx;
        const ny = currY + dir.dy;

        if (!this.level.isTileInBounds(nx, ny)) continue;

        const nIndex = ny * this.width + nx;
        if (this.closedSet[nIndex] === 1) continue;

        // Check if destination tile is solid
        if (this.level.isTileSolid(nx, ny, allowLockedDoors)) continue;

        // Corner cutting check for diagonal movement
        if (dir.isDiagonal) {
          if (
            this.level.isTileSolid(currX + dir.c1x, currY + dir.c1y, allowLockedDoors) ||
            this.level.isTileSolid(currX + dir.c2x, currY + dir.c2y, allowLockedDoors)
          ) {
            continue; // Prevent cutting across diagonal wall corner
          }
        }

        const tentativeG = currG + dir.cost;

        if (tentativeG < this.gScore[nIndex]) {
          this.gScore[nIndex] = tentativeG;
          this.cameFrom[nIndex] = current.index;
          const h = octileDistance(nx, ny, tTileX, tTileY);

          this.openSet.push({
            index: nIndex,
            tileX: nx,
            tileY: ny,
            f: tentativeG + h,
            g: tentativeG
          });
        }
      }
    }

    if (!targetReached) {
      return null;
    }

    // Reconstruct raw tile path
    const rawPath = [];
    let currIdx = targetIndex;
    while (currIdx !== -1) {
      const ty = Math.floor(currIdx / this.width);
      const tx = currIdx % this.width;
      const worldPos = this.level.tileToWorld(tx, ty);
      rawPath.push({
        tileX: tx,
        tileY: ty,
        x: worldPos.x,
        y: worldPos.y
      });
      if (currIdx === startIndex) break;
      currIdx = this.cameFrom[currIdx];
    }
    rawPath.reverse();

    // Smooth path via raycast string-pulling if requested
    let finalPath = rawPath;
    if (smooth && rawPath.length > 2) {
      finalPath = this.smoothPath(rawPath, allowLockedDoors);
    }

    // Fine-tune start and end if world coordinates were supplied
    if (isWorld && finalPath.length > 0) {
      finalPath[0].x = startX;
      finalPath[0].y = startY;
      finalPath[finalPath.length - 1].x = targetX;
      finalPath[finalPath.length - 1].y = targetY;
    }

    return finalPath;
  }

  /**
   * Raycast line-of-sight check between two tile coordinates
   * Uses fast grid ray traversal with corner clearance checks
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {boolean} [allowLockedDoors=false]
   * @returns {boolean} True if unobstructed line of sight exists
   */
  hasLineOfSight(x0, y0, x1, y1, allowLockedDoors = false) {
    if (x0 === x1 && y0 === y1) return true;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;

    let err = dx - dy;
    let currX = x0;
    let currY = y0;

    while (currX !== x1 || currY !== y1) {
      const e2 = 2 * err;
      let nextX = currX;
      let nextY = currY;

      if (e2 > -dy) {
        err -= dy;
        nextX += sx;
      }
      if (e2 < dx) {
        err += dx;
        nextY += sy;
      }

      // Check if stepped diagonally; if so, verify corners
      if (nextX !== currX && nextY !== currY) {
        if (
          this.level.isTileSolid(nextX, currY, allowLockedDoors) ||
          this.level.isTileSolid(currX, nextY, allowLockedDoors)
        ) {
          return false;
        }
      }

      currX = nextX;
      currY = nextY;

      if (this.level.isTileSolid(currX, currY, allowLockedDoors)) {
        // Destination tile is allowed only if it matches destination
        if (currX !== x1 || currY !== y1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Smooths an A* path by removing redundant intermediate waypoints
   * using greedy line-of-sight raycasting (string-pulling algorithm)
   * @param {Array<{ tileX: number, tileY: number, x: number, y: number }>} path
   * @param {boolean} [allowLockedDoors=false]
   * @returns {Array<{ tileX: number, tileY: number, x: number, y: number }>}
   */
  smoothPath(path, allowLockedDoors = false) {
    if (path.length <= 2) return path;

    const smoothed = [path[0]];
    let anchorIdx = 0;

    while (anchorIdx < path.length - 1) {
      let farthestIdx = anchorIdx + 1;

      // Probe ahead to find farthest visible node
      for (let testIdx = anchorIdx + 2; testIdx < path.length; testIdx++) {
        const canSee = this.hasLineOfSight(
          path[anchorIdx].tileX,
          path[anchorIdx].tileY,
          path[testIdx].tileX,
          path[testIdx].tileY,
          allowLockedDoors
        );

        if (canSee) {
          farthestIdx = testIdx;
        } else {
          break;
        }
      }

      smoothed.push(path[farthestIdx]);
      anchorIdx = farthestIdx;
    }

    return smoothed;
  }

  /**
   * Find closest walkable neighbor to a solid tile
   * @private
   */
  _findClosestWalkableNeighbor(tileX, tileY, fromX, fromY, allowLockedDoors) {
    const candidates = [];
    const offsets = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ];

    for (const off of offsets) {
      const nx = tileX + off.dx;
      const ny = tileY + off.dy;
      if (this.level.isTileInBounds(nx, ny) && !this.level.isTileSolid(nx, ny, allowLockedDoors)) {
        candidates.push({
          tileX: nx,
          tileY: ny,
          dist: octileDistance(nx, ny, fromX, fromY)
        });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.dist - b.dist);
    return candidates[0];
  }
}
