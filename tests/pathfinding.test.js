/**
 * THE LAST SIGNAL — Pathfinding Unit Tests
 */

import { LevelManager } from '../src/world/LevelManager.js';
import { Pathfinding } from '../src/world/Pathfinding.js';
import { TILE_TYPES } from '../src/utils/Constants.js';

export function runPathfindingTests(assert) {
  console.log('\n--- Running Pathfinding Tests ---');

  const level = new LevelManager();
  const finder = new Pathfinding(level);

  // Test 1: Straight line path in clear corridor
  const path1 = finder.findPath(7, 7, 7, 10, { smooth: false });
  assert.ok(path1 !== null, 'Path in clear area should be found');
  assert.strictEqual(path1[0].tileX, 7, 'Path start tileX matches');
  assert.strictEqual(path1[0].tileY, 7, 'Path start tileY matches');
  assert.strictEqual(path1[path1.length - 1].tileX, 7, 'Path target tileX matches');
  assert.strictEqual(path1[path1.length - 1].tileY, 10, 'Path target tileY matches');

  // Test 2: Navigation around obstacles
  // Create a small custom test grid with a wall separating rooms, open at (3, 3)
  const W = TILE_TYPES.WALL;
  const F = TILE_TYPES.FLOOR;
  const customGrid = [
    [W, W, W, W, W, W, W],
    [W, F, F, W, F, F, W],
    [W, F, F, W, F, F, W],
    [W, F, F, F, F, F, W],
    [W, W, W, W, W, W, W]
  ];
  const customLevel = new LevelManager({
    grid: customGrid,
    width: 7,
    height: 5,
    tileSize: 32
  });
  const customFinder = new Pathfinding(customLevel);

  // Start (1, 1) to (4, 1) must go around the wall at (3, 1) and (3, 2) through (3, 3)
  const pathAroundWall = customFinder.findPath(1, 1, 4, 1, { smooth: false });
  assert.ok(pathAroundWall !== null, 'Should find path navigating around obstacle');
  const passesThroughUturn = pathAroundWall.some(p => p.tileX === 3 && p.tileY === 3);
  assert.strictEqual(passesThroughUturn, true, 'Path must pass through bottom corridor (3, 3) to bypass wall');

  // Test 3: Corner Cutting Prevention
  // Test diagonal obstacle:
  // Tile (1, 1) and Tile (2, 2) are floor, but (1, 2) and (2, 1) are solid walls!
  const cornerGrid = [
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.WALL, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL]
  ];
  const cornerLevel = new LevelManager({
    grid: cornerGrid,
    width: 4,
    height: 4,
    tileSize: 32
  });
  const cornerFinder = new Pathfinding(cornerLevel);
  const cornerPath = cornerFinder.findPath(1, 1, 2, 2);
  assert.strictEqual(cornerPath, null, 'Diagonal squeeze through solid corners must be rejected');

  // Test 4: Locked Door Navigation
  // Custom corridor with locked door in the middle
  const doorGrid = [
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.DOOR_LOCKED_BLUE, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL]
  ];
  const doorLevel = new LevelManager({
    grid: doorGrid,
    width: 7,
    height: 3,
    tileSize: 32
  });
  const doorFinder = new Pathfinding(doorLevel);

  // Without allowLockedDoors
  const doorPathBlocked = doorFinder.findPath(1, 1, 5, 1, { allowLockedDoors: false });
  assert.strictEqual(doorPathBlocked, null, 'Path should be blocked by locked door when allowLockedDoors=false');

  // With allowLockedDoors (e.g. for monster or player with key)
  const doorPathAllowed = doorFinder.findPath(1, 1, 5, 1, { allowLockedDoors: true });
  assert.ok(doorPathAllowed !== null, 'Path should traverse locked door when allowLockedDoors=true');

  // Test 5: Path Smoothing / String-Pulling
  const clearGrid = [
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.FLOOR, TILE_TYPES.WALL],
    [TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL, TILE_TYPES.WALL]
  ];
  const clearLevel = new LevelManager({
    grid: clearGrid,
    width: 8,
    height: 5,
    tileSize: 32
  });
  const clearFinder = new Pathfinding(clearLevel);

  const rawPath = clearFinder.findPath(1, 1, 6, 3, { smooth: false });
  const smoothPath = clearFinder.findPath(1, 1, 6, 3, { smooth: true });

  assert.ok(smoothPath.length < rawPath.length, `Smoothed path (${smoothPath.length} nodes) should be shorter than raw step path (${rawPath.length} nodes)`);
  assert.strictEqual(smoothPath[0].tileX, 1, 'Smoothed path begins at start');
  assert.strictEqual(smoothPath[smoothPath.length - 1].tileX, 6, 'Smoothed path ends at target');

  // Test 6: Station-Wide Path from Spawn to Comms Array
  const startSpawn = level.getPlayerSpawn();
  const commsTerminal = level.getTerminals().find(t => t.id === 'TERM-COMMS-01');
  const stationPath = finder.findPath(startSpawn.tileX, startSpawn.tileY, commsTerminal.tileX, commsTerminal.tileY, { allowLockedDoors: true });
  assert.ok(stationPath !== null, 'Station-wide path from Spawn to Comms Array must exist');
  assert.ok(stationPath.length > 5, 'Station-wide path has multiple waypoints');

  console.log('✓ All Pathfinding tests passed!');
}
