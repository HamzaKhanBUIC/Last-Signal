/**
 * THE LAST SIGNAL — Level & World Unit Tests
 */

import { LevelManager } from '../src/world/LevelManager.js';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  SECTORS,
  PLAYER_SPAWN,
  ENEMY_SPAWN,
  ENEMY_PATROL_WAYPOINTS,
  TERMINALS,
  PICKUPS,
  LIGHT_SOURCES
} from '../src/world/MapData.js';
import { TILE_TYPES, KEYCARD_TYPES, FRAGMENT_TYPES } from '../src/utils/Constants.js';

export function runLevelTests(assert) {
  console.log('\n--- Running Level & Map Data Tests ---');

  const level = new LevelManager();

  // Test 1: Dimensions
  assert.strictEqual(level.width, 64, 'Map width should be 64');
  assert.strictEqual(level.height, 64, 'Map height should be 64');
  assert.strictEqual(level.tileSize, 32, 'Tile size should be 32');

  // Test 2: Player & Enemy Spawns Walkability
  assert.strictEqual(level.isTileSolid(PLAYER_SPAWN.tileX, PLAYER_SPAWN.tileY), false, 'Player spawn tile must be walkable');
  assert.strictEqual(level.isPositionSolid(PLAYER_SPAWN.x, PLAYER_SPAWN.y, 10), false, 'Player spawn world position must not collide');
  assert.strictEqual(level.isTileSolid(ENEMY_SPAWN.tileX, ENEMY_SPAWN.tileY), false, 'Enemy spawn tile must be walkable');

  // Test 3: Sectors definition
  assert.strictEqual(level.sectors.length, 8, 'There must be exactly 8 sectors defined');
  const sector1 = level.getSectorAt(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
  assert.strictEqual(sector1.number, 1, 'Player spawn must be in Sector 1 (Airlock & Habitation)');

  // Test 4: Terminals count and validity
  const terminals = level.getTerminals();
  assert.strictEqual(terminals.length >= 8, true, 'There should be at least 8 narrative/interactive terminals');
  for (const term of terminals) {
    assert.ok(term.id && term.title && term.content.length > 0, `Terminal ${term.id} has complete data`);
    assert.strictEqual(level.isTileSolid(term.tileX, term.tileY), false, `Terminal ${term.id} must be placed on walkable tile`);
  }

  // Test 5: Pickups (Fragments & Keycards)
  const pickups = level.getPickups();
  const fragments = pickups.filter(p => p.type === 'fragment');
  const keycards = pickups.filter(p => p.type === 'keycard');
  const batteries = pickups.filter(p => p.type === 'battery');
  const medkits = pickups.filter(p => p.type === 'medkit');

  assert.strictEqual(fragments.length, 3, 'Must contain exactly 3 Signal Fragments (Alpha, Beta, Gamma)');
  assert.strictEqual(keycards.length, 3, 'Must contain 3 Keycards (Blue, Red, Master)');
  assert.strictEqual(batteries.length >= 4, true, 'Must contain at least 4 Battery Packs');
  assert.strictEqual(medkits.length >= 3, true, 'Must contain at least 3 Medkits');

  for (const pickup of pickups) {
    assert.strictEqual(level.isTileSolid(pickup.tileX, pickup.tileY), false, `Pickup ${pickup.id} must be on walkable tile`);
  }

  // Test 6: Light sources
  const lights = level.getLightSources();
  assert.strictEqual(lights.length >= 8, true, 'Must have dynamic light sources across sectors');

  // Test 7: Door Interaction and Keycard System
  // Test Closed door
  level.setTile(10, 10, TILE_TYPES.DOOR_CLOSED);
  assert.strictEqual(level.isTileSolid(10, 10), true, 'Closed door is solid');
  const doorRes1 = level.interactDoor(10, 10, {});
  assert.strictEqual(doorRes1.success, true, 'Closed door opens upon interaction');
  assert.strictEqual(level.getTile(10, 10), TILE_TYPES.DOOR_OPEN, 'Door becomes open');
  assert.strictEqual(level.isTileSolid(10, 10), false, 'Open door is not solid');

  // Test Blue Locked Door
  level.setTile(10, 11, TILE_TYPES.DOOR_LOCKED_BLUE);
  const doorResBlueFail = level.interactDoor(10, 11, { keycards: [] });
  assert.strictEqual(doorResBlueFail.success, false, 'Blue locked door rejects empty inventory');
  const doorResBluePass = level.interactDoor(10, 11, { keycards: ['blue'] });
  assert.strictEqual(doorResBluePass.success, true, 'Blue locked door unlocks with blue keycard');
  assert.strictEqual(level.getTile(10, 11), TILE_TYPES.DOOR_OPEN, 'Unlocked door is now open');

  // Test Red Locked Door
  level.setTile(10, 12, TILE_TYPES.DOOR_LOCKED_RED);
  const doorResRedFail = level.interactDoor(10, 12, { keycards: ['blue'] });
  assert.strictEqual(doorResRedFail.success, false, 'Red locked door rejects blue keycard');
  const doorResRedPass = level.interactDoor(10, 12, { keycards: ['red'] });
  assert.strictEqual(doorResRedPass.success, true, 'Red locked door unlocks with red keycard');

  // Test Master Locked Door
  level.setTile(10, 13, TILE_TYPES.DOOR_LOCKED_MASTER);
  const doorResMasterFail = level.interactDoor(10, 13, { keycards: ['red'] });
  assert.strictEqual(doorResMasterFail.success, false, 'Master locked door rejects red keycard');
  const doorResMasterPass = level.interactDoor(10, 13, { keycards: ['master'] });
  assert.strictEqual(doorResMasterPass.success, true, 'Master locked door unlocks with master keycard');

  // Test 8: Wall Segments Generation for 2D Raycast Lighting
  const wallSegments = level.getWallSegments();
  assert.strictEqual(Array.isArray(wallSegments), true, 'Wall segments must be an array');
  assert.strictEqual(wallSegments.length > 50, true, 'Must extract light-occluding wall segments');
  for (const seg of wallSegments) {
    assert.ok(typeof seg.p1.x === 'number' && typeof seg.p1.y === 'number', 'Segment p1 valid');
    assert.ok(typeof seg.p2.x === 'number' && typeof seg.p2.y === 'number', 'Segment p2 valid');
    const segLen = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
    assert.strictEqual(segLen > 0, true, 'Segments must have positive length');
  }

  // Test 9: Collision Resolution
  // Place entity on floor near wall: Wall at tile (4, 5) [ends at x=160], Floor at tile (5, 5) [starts at x=160]
  // Entity center at x=164, y=176 with radius 12 -> left edge is at x=152, penetrating wall by 8px!
  const startX = 5 * 32 + 4; // 164
  const startY = 5 * 32 + 16; // 176
  assert.strictEqual(level.isPositionSolid(startX, startY, 12), true, 'Initial overlapping position is solid');
  
  const resolved = level.resolveCircleCollision(startX, startY, 12);
  assert.strictEqual(resolved.collided, true, 'Collision should be detected and resolved');
  assert.strictEqual(level.isPositionSolid(resolved.x, resolved.y, 12), false, 'Resolved position must not collide with wall');
  assert.ok(resolved.x >= 5 * 32 + 12, 'Entity should be pushed away from the wall to at least x=172');

  console.log('✓ All LevelManager & MapData tests passed!');
}
